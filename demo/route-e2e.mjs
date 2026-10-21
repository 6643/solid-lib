// 浏览器端到端回归: 路由拦截 + 窗口级滚动恢复 + 兜底块 + Solid 诊断.
//
// 前置 (两个终端):
//   cd demo && vp dev
//   google-chrome-stable --headless=new --remote-debugging-port=9222 \
//     --user-data-dir=/tmp/chrome-route --no-first-run --disable-gpu about:blank
// 运行:
//   node demo/route-e2e.mjs
//
// 零依赖: 用 Node 自带的 WebSocket 直连 CDP, 不安装 playwright.
// 端口不同就改下面的 APP / CDP.
const APP = "http://127.0.0.1:5173";
const CDP = "http://127.0.0.1:9222";

let failures = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? `  <- ${extra}` : ""}`);
  if (!ok) failures += 1;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const targets = await (await fetch(`${CDP}/json/list`)).json();
const page = targets.find((t) => t.type === "page");
if (!page) throw new Error("no page target");

const ws = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
const consoleLines = [];
let nextId = 0;

const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(`${msg.error.message}`));
    else resolve(msg.result);
    return;
  }
  if (msg.method === "Runtime.consoleAPICalled") {
    const text = (msg.params.args ?? [])
      .map((a) => a.value ?? a.description ?? a.preview?.description ?? "")
      .join(" ");
    consoleLines.push({ level: msg.params.type, text });
  }
  if (msg.method === "Runtime.exceptionThrown") {
    consoleLines.push({ level: "exception", text: msg.params.exceptionDetails?.text ?? "?" });
  }
});

await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});
await send("Runtime.enable");
await send("Page.enable");
// 矮视口: demo 页面不长, 需要真实的滚动空间才能验证窗口级恢复
await send("Emulation.setDeviceMetricsOverride", {
  width: 1000,
  height: 420,
  deviceScaleFactor: 1,
  mobile: false,
});

const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  }
  return result.result.value;
};

const goto = async (url) => {
  await send("Page.navigate", { url });
  for (let i = 0; i < 60; i += 1) {
    await wait(150);
    const ready = await evaluate(
      `document.readyState === "complete" && !!document.querySelector(".demo-nav")`,
    ).catch(() => false);
    if (ready) return;
  }
  throw new Error(`page not ready: ${url}`);
};

const notes = () =>
  evaluate(`[...document.querySelectorAll(".demo-note")].map((n) => n.textContent.trim())`);

// 1. 首屏: /buttons 上两块同路径同时渲染 (第二块 + 第三块)
await goto(`${APP}/buttons`);
const initialNotes = await notes();
check("two extra blocks render on /buttons", initialNotes.length === 2, initialNotes.join(" | "));
check(
  "document scroll is the window",
  await evaluate(`getComputedStyle(document.body).height !== "900px" && document.body.scrollHeight > 0`),
  await evaluate(`document.body.scrollHeight + "/" + innerHeight`),
);

// 2. 链接拦截: 点击导航不整页刷新, URL 更新
await evaluate(`window.__spaMarker = 42`);
await evaluate(`document.querySelector('.demo-link[href="/inputs"]').click()`);
await wait(400);
check("click updates the pathname", (await evaluate("location.pathname")) === "/inputs");
check("click keeps the document alive (no reload)", (await evaluate("window.__spaMarker")) === 42);
check("other page renders no extra blocks", (await notes()).length === 0);

// 3. 后退: 回到 /buttons, 三块恢复 (第二轮验证多块语义)
await evaluate("history.back()");
await wait(600);
check("back returns to /buttons", (await evaluate("location.pathname")) === "/buttons");
check("back restores the three blocks", (await notes()).length === 2);

// 4. 滚动恢复: 记录 -> push 别的页 -> 后退
await goto(`${APP}/display`);
await evaluate("history.replaceState(history.state, '', '/display')");
const scrolled = await evaluate(`(async () => {
  const max = document.body.scrollHeight - innerHeight;
  if (max < 300) return { max };
  window.scrollTo(0, Math.min(700, max));
  await new Promise((r) => setTimeout(r, 250));
  return { max, y: window.scrollY };
})()`);
check("page is scrollable enough to test", scrolled.max >= 300, JSON.stringify(scrolled));

await evaluate(`document.querySelector('.demo-link[href="/hooks"]').click()`);
await wait(500);
check("push lands on the target page", (await evaluate("location.pathname")) === "/hooks");
check("push scrolls the new entry to the top", (await evaluate("window.scrollY")) === 0);

await evaluate("history.back()");
await wait(900);
const restored = await evaluate("window.scrollY");
check(
  "back restores the recorded window position",
  Math.abs(restored - scrolled.y) <= 2,
  `expected ${scrolled.y}, got ${restored}`,
);

// 5. 前进方向被剪掉后再后退不应乱跳; 再次点击导航回顶
await evaluate("window.scrollTo(0, 120)");
await wait(250);
await evaluate(`document.querySelector('.demo-link[href="/theme"]').click()`);
await wait(400);
check("second push also starts at the top", (await evaluate("window.scrollY")) === 0);

// 6. 兜底: 直接访问未知路径
await goto(`${APP}/nope`);
const notFoundNotes = await notes();
check(
  "unknown path renders the fallback block",
  notFoundNotes.some((text) => text.includes("没有匹配的路由")),
  notFoundNotes.join(" | "),
);

// 7. Show 门控的第三块: 关掉后只剩两块 (回到 /buttons)
await goto(`${APP}/buttons`);
const beforeToggle = (await notes()).length;
await evaluate(`document.querySelector('.demo-toggle input').click()`);
await wait(400);
const afterToggle = (await notes()).length;
check("gated block disappears when the toggle is off", beforeToggle === 2 && afterToggle === 1, `${beforeToggle} -> ${afterToggle}`);
await evaluate(`document.querySelector('.demo-toggle input').click()`);
await wait(400);
check("gated block comes back", (await notes()).length === 2);

// 8. 控制台必须干净: 无未捕获异常, 无 Solid 诊断告警
const bad = consoleLines.filter(
  (line) =>
    line.level === "exception" ||
    line.level === "error" ||
    /\[solid|STRICT_READ_UNTRACKED|REACTIVE_WRITE_IN_OWNED_SCOPE|LOADING_ON_OUTSIDE_HOLD/.test(line.text),
);
check("console is clean of errors and Solid diagnostics", bad.length === 0, bad.map((l) => `${l.level}: ${l.text}`).join(" || "));

ws.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
