import { For, Show, createSignal } from "solid-js";
import { initAccent, initTheme } from "solid-lib";
import { Route } from "solid-lib/route";

import "./global.css";

import ButtonsPage from "./pages/ButtonsPage";
import DisplayPage from "./pages/DisplayPage";
import HooksPage from "./pages/HooksPage";
import InputsPage from "./pages/InputsPage";
import InteractivePage from "./pages/InteractivePage";
import LayoutPage from "./pages/LayoutPage";
import TabsPage from "./pages/TabsPage";
import ThemePage from "./pages/ThemePage";
import ValidatePage from "./pages/ValidatePage";

// 应用启动时立即初始化主题和强调色副作用
initTheme();
initAccent();

const PAGES = [
  { path: "/buttons", label: "按钮", component: ButtonsPage },
  { path: "/inputs", label: "输入", component: InputsPage },
  { path: "/layout", label: "布局", component: LayoutPage },
  { path: "/interactive", label: "交互", component: InteractivePage },
  { path: "/display", label: "展示", component: DisplayPage },
  { path: "/hooks", label: "Hooks", component: HooksPage },
  { path: "/validate", label: "校验", component: ValidatePage },
  { path: "/theme", label: "主题", component: ThemePage },
  { path: "/tabs", label: "标签页", component: TabsPage },
];

// 第二块: 与按钮页同一个 path, 两块同时渲染.
const ButtonsSecondBlock = () => (
  <section class="demo-note">第二块: 与 /buttons 同路径, 两块同时渲染.</section>
);

// 第三块: 由 Show 门控, 关掉后只剩两块.
const ButtonsGatedBlock = () => (
  <section class="demo-note">第三块: 在 Show 里, 关掉开关这块就不存在.</section>
);

const NotFound = () => (
  <section class="demo-note">
    没有匹配的路由.<a href="/buttons">回到按钮页</a>
  </section>
);

const App = () => {
  const [showGated, setShowGated] = createSignal(true);

  return (
    <div class="demo-shell">
      <nav class="demo-nav">
        <For each={PAGES}>
          {(page) => (
            <a class="demo-link" href={page.path}>
              {page.label}
            </a>
          )}
        </For>
        <label class="demo-toggle">
          <input
            type="checkbox"
            checked={showGated()}
            onChange={(event) => setShowGated(event.currentTarget.checked)}
          />
          第三块
        </label>
      </nav>
      <main class="demo-main">
        <For each={PAGES}>
          {(page) => <Route path={page.path} component={page.component} />}
        </For>
        <Route path="/buttons" component={ButtonsSecondBlock} />
        <Show when={showGated()}>
          <Route path="/buttons" component={ButtonsGatedBlock} />
        </Show>
        <Route path="/*" component={NotFound} />
      </main>
    </div>
  );
};

export default App;
