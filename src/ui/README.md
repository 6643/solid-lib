# ui

`solid-lib/ui` 提供最小 UI 主题能力:

- 通过 `html[data-theme-mode]` 提供当前实际亮暗结果
- 通过 `solid-lib/ui.css` 提供全局主题变量
- 组件只消费变量, 不直接判断亮暗模式

## 导入

```ts
import {
  Card,
  FilledButton,
  IconButton,
  Input,
  OutlinedButton,
  TextButton,
  initializeThemeMode,
  setThemeMode,
} from "solid-lib/ui";
import "solid-lib/ui.css";
```

## 公开变量

```css
--base-bg
--base-fg

--raised-bg
--raised-fg

--inset-bg
--inset-fg

--disabled-bg
--disabled-fg

--theme-color
--error-color
```

## 说明

- `theme-color` 与 `error-color` 是全局单色注入, 默认只在 `:root` 配置一次
- 用户模式偏好通过 API 与 `localStorage` 管理, 不额外挂第二个 root 属性
- 默认组件无边框
- `raised` 表示浮起一层
- `inset` 表示压入一层

## 组件映射

- `Card` 使用 `raised`
- `Input` 使用 `inset`
- `TextButton` 使用透明背景 + `theme-color`
- `OutlinedButton` 使用透明背景 + `theme-color` 描边
- `FilledButton` 使用 `theme-color`
- `IconButton` 使用中性透明面
- 组件只暴露业务 props, 禁用态使用 `disabled`
