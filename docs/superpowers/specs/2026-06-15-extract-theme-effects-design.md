# 提取 ThemeToggle/AccentPicker 副作用为独立函数

## 背景

`ThemeToggle` 和 `AccentPicker` 组件将全局副作用（设置 `theme` 属性和 `--accent-color` CSS 变量）绑定在组件的 `createEffect` 上。SolidJS 的 `createEffect` 仅在组件挂载后执行，因此如果消费者不渲染这些组件，存储的偏好设置不会生效。

作为 UI 库，消费者可能只用存储 hook 而不用 UI 组件，需要解耦副作用与组件生命周期。

## 目标

- 将副作用提取为独立的 reactive 函数，可在 App 根部调用
- 组件变为纯 UI 切换器，保留向后兼容
- 消费者可选择：使用组件（自动应用副作用）或仅调用函数（无 UI）

## 非目标

- 不改变 `createStorage` 的 API
- 不引入新的全局状态或注册机制

## 方案

### 文件变更

| 文件 | 变更 |
|------|------|
| `use/useTheme.ts` | 新增 `applyTheme()` |
| `use/useAccent.ts` | 新增 `applyAccent()` |
| `ui/ThemeToggle.tsx` | 移除 `createEffect`，保留 UI + `createStorage` |
| `ui/AccentPicker.tsx` | 移除 `createEffect`，保留 UI + `createStorage` |
| `ui/_.ts` | 导出 `applyTheme`、`applyAccent` |

### 实现细节

**`use/useTheme.ts`**
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

**`use/useAccent.ts`**
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

**`ui/ThemeToggle.tsx`（修改后）**
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

**`ui/AccentPicker.tsx`（修改后）**
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

## 消费者用法

```tsx
// App.tsx — 应用存储的偏好
import { applyTheme, applyAccent } from "solid-lib/use";

applyTheme();
applyAccent();

const App = () => <Router />;
```

```tsx
// 某页面 — 可选渲染 UI 切换器
import { ThemeToggle, AccentPicker } from "solid-lib/ui";

<ThemeToggle />
<AccentPicker />
```

## 向后兼容

- 现有直接使用 `<ThemeToggle />` 或 `<AccentPicker />` 的消费者不受影响
- 组件内部仍保留各自的 `createStorage` 实例，UI 切换正常工作
- 新增的 `applyTheme()` / `applyAccent()` 是可选的

## 验证

1. 不调用 `applyTheme()`/`applyAccent()` 时，组件仍可正常切换
2. 调用 `applyTheme()`/`applyAccent()` 后，页面加载时即应用存储的偏好
3. TypeScript 编译通过
4. Demo 页面正常运行
