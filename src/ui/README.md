# ui

`solid-lib/ui` 提供最小 UI 主题能力:

- 通过 `html[data-theme-mode]` 属性切换亮暗模式
- 通过 `solid-lib/ui.css` 提供全局主题变量
- 组件只消费变量, 不直接判断亮暗模式

## 色彩体系

| 层级 | 用途 | 亮色 | 暗色 |
|------|------|------|------|
| page | 页面背景/文字 | 偏白/偏黑 | 偏黑/偏白 |
| base | 卡片、容器 | 浅色/深色 | 深色/浅色 |
| raised | 按钮、凸起 | 更浅/更深 | 更深/更浅 |
| inset | 输入框、凹陷 | 更深/更浅 | 更浅/更深 |
| disabled | 禁用状态 | 灰色 | 灰色 |
| accrnt | 强调色 | teal | teal |
| error | 错误色 | firebrick | firebrick |

**全局色**（不区分亮暗）：`--accent-color`、`--error-color`

**层级色**（亮暗各一套）：`--page-bg/fg`、`--base-bg/fg`、`--raised-bg/fg`、`--inset-bg/fg`、`--disabled-bg/fg`

## 导入

```ts
import { Card, FilledButton, TextInput, ThemeToggle } from "solid-lib/ui";
import "solid-lib/ui.css";
```

## 组件映射

- `body` 使用 `--page-bg/fg`
- `Card` 使用 `--base-bg/fg`
- `Button` 使用 `--raised-bg/fg`
- `Input` 使用 `--inset-bg/fg`
- `FilledButton` 使用 `--accent-color`
- `TextButton` 使用透明背景 + `--accent-color`
- `OutlinedButton` 使用透明背景 + `--accent-color` 描边
- 组件禁用态统一使用 `--disabled-bg/fg`

## 内部结构

- `SvgIcon.tsx` 负责 SVG 渲染
- `svgicons.ts` 保存 icon path 常量
- `ThemeToggle.tsx` 内置主题切换逻辑（亮/暗，首次跟随系统）
- `AccentPicker.tsx` 强调色选择器
