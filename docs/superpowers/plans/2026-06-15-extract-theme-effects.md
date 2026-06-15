# 提取 ThemeToggle/AccentPicker 副作用 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `ThemeToggle` 和 `AccentPicker` 的全局副作用（设置 `theme` 属性和 `--accent-color` CSS 变量）提取为独立的 `applyTheme()` / `applyAccent()` 函数，使消费者可在不渲染组件的情况下应用存储的偏好。

**Architecture:** 新增两个 hook 文件（`use/useTheme.ts`、`use/useAccent.ts`），各导出一个函数，内部使用 `createStorage` 读取 localStorage 并通过 `createEffect` 同步到 DOM。原组件移除 `createEffect`，仅保留 UI 切换逻辑。

**Tech Stack:** TypeScript, SolidJS

---

## 文件结构

- Create: `src/use/useTheme.ts` — `applyTheme()` 函数
- Create: `src/use/useAccent.ts` — `applyAccent()` 函数
- Modify: `src/ui/ThemeToggle.tsx` — 移除 `createEffect` 和 `createEffect` import
- Modify: `src/ui/AccentPicker.tsx` — 移除 `createEffect` 和相关 import
- Modify: `src/ui/_.ts` — 导出 `applyTheme`、`applyAccent`

### Task 1: 创建 `applyTheme()` 函数

**Files:**
- Create: `src/use/useTheme.ts`

- [ ] **Step 1: 创建 `use/useTheme.ts`**

```ts
import { createEffect } from "solid-js";
import { createStorage } from "./createStorage";

type Theme = "light" | "dark";

export const applyTheme = () => {
    const [theme] = createStorage<Theme>("theme", "light");
    createEffect(
        () => theme(),
        (current) => document.documentElement.setAttribute("theme", current),
    );
};
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add src/use/useTheme.ts
git commit -m "feat: 添加 applyTheme 函数"
```

### Task 2: 创建 `applyAccent()` 函数

**Files:**
- Create: `src/use/useAccent.ts`

- [ ] **Step 1: 创建 `use/useAccent.ts`**

```ts
import { createEffect } from "solid-js";
import { createStorage } from "./createStorage";

export const applyAccent = () => {
    const [accent] = createStorage("accent", "teal");
    createEffect(
        () => accent(),
        (color) => document.documentElement.style.setProperty("--accent-color", color),
    );
};
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add src/use/useAccent.ts
git commit -m "feat: 添加 applyAccent 函数"
```

### Task 3: 修改 `ThemeToggle` 移除副作用

**Files:**
- Modify: `src/ui/ThemeToggle.tsx`

- [ ] **Step 1: 修改 `ThemeToggle.tsx`**

将文件内容替换为：

```ts
import { IconButton } from "./Button";
import { createStorage } from "../use/createStorage";
import { icon_light_mode, icon_dark_mode } from "./svgicons";

type Theme = "light" | "dark";

const icons = { light: icon_light_mode, dark: icon_dark_mode };

export const ThemeToggle = () => {
    const [theme, setTheme] = createStorage<Theme>("theme", "light");
    const toggle = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));
    return <IconButton icon={icons[theme()]} tap={toggle} />;
};
```

变更点：
- 移除 `import { createEffect } from "solid-js"`
- 移除 `createEffect(...)` 块

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add src/ui/ThemeToggle.tsx
git commit -m "refactor: ThemeToggle 移除 createEffect 副作用"
```

### Task 4: 修改 `AccentPicker` 移除副作用

**Files:**
- Modify: `src/ui/AccentPicker.tsx`

- [ ] **Step 1: 修改 `AccentPicker.tsx`**

将文件内容替换为：

```ts
import { createSignal, For } from "solid-js";
import { IconButton } from "./Button";
import { createStorage } from "../use/createStorage";
import { icon_palette } from "./svgicons";
import styles from "./AccentPicker.module.css";

const accents = [
    { name: "teal", value: "teal" },
    { name: "blue", value: "#2196f3" },
    { name: "purple", value: "#9c27b0" },
    { name: "pink", value: "#e91e63" },
    { name: "red", value: "#f44336" },
    { name: "orange", value: "#ff9800" },
    { name: "green", value: "#4caf50" },
    { name: "indigo", value: "#3f51b5" },
];

export const AccentPicker = () => {
    const [accent, setAccent] = createStorage("accent", "teal");
    const [open, setOpen] = createSignal(false);

    return (
        <div class={styles.root}>
            <IconButton
                icon={icon_palette}
                tap={() => setOpen((v) => !v)}
            />
            <div class={`${styles.picker} ${open() ? styles.open : ""}`}>
                <For each={accents}>
                    {(item) => (
                        <button
                            onClick={() => setAccent(item.value)}
                            title={item.name}
                            class={`${styles.swatch} ${accent() === item.value ? styles.selected : ""}`}
                            style={{ background: item.value }}
                        />
                    )}
                </For>
            </div>
        </div>
    );
};
```

变更点：
- 移除 `import { createEffect } from "solid-js"` 中的 `createEffect`（保留 `createSignal` 和 `For`）
- 移除 `createEffect(...)` 块

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add src/ui/AccentPicker.tsx
git commit -m "refactor: AccentPicker 移除 createEffect 副作用"
```

### Task 5: 更新导出并验证

**Files:**
- Modify: `src/ui/_.ts`

- [ ] **Step 1: 在 `_.ts` 中添加导出**

在文件末尾的 `// Hooks & Utils` 区域添加：

```ts
export { applyTheme } from "../use/useTheme";
export { applyAccent } from "../use/useAccent";
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 验证 Demo 页面**

Run: `npm run dev`（或项目启动命令）
Expected: Demo 页面正常运行，ThemeToggle 和 AccentPicker 组件可正常切换

- [ ] **Step 4: 最终提交**

```bash
git add src/ui/_.ts
git commit -m "feat: 导出 applyTheme 和 applyAccent"
```

### Task 6: 最终验证

- [ ] **Step 1: 运行完整构建**

Run: `npm run build`（或项目构建命令）
Expected: BUILD SUCCESS

- [ ] **Step 2: 验证需求清单**

Check:
- `applyTheme()` 可独立调用，从 localStorage 读取主题并设置到 `document.documentElement`
- `applyAccent()` 可独立调用，从 localStorage 读取强调色并设置 CSS 变量
- `ThemeToggle` 组件移除了 `createEffect`，仅保留 UI 切换
- `AccentPicker` 组件移除了 `createEffect`，仅保留 UI 切换
- 新函数已从 `src/ui/_.ts` 导出
- 现有消费者使用 `<ThemeToggle />` / `<AccentPicker />` 时 UI 切换仍正常工作
