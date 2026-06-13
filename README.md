# solid-lib

`solid-lib` 当前包含三个核心子项目:

- [builder](./src/builder/README.md)
  面向 Bun + Solid 的最小构建与开发工具链
- [route](./src/route/README.md)
  面向静态路径的最小 SPA route 能力
- [ui](./src/ui/README.md)
  面向亮暗模式与主题变量的最小 UI 主题能力

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

**全局色**（不区分亮暗）：`--accrnt-color`、`--error-color`

**层级色**（亮暗各一套）：`--page-bg/fg`、`--base-bg/fg`、`--raised-bg/fg`、`--inset-bg/fg`、`--disabled-bg/fg`

## 导入约束

- 不支持 `import ... from "solid-lib"`
- builder 只能从 `solid-lib/builder` 导入
- route 只能从 `solid-lib/route` 导入
- ui 只能从 `solid-lib/ui` 导入
- 样式只能从 `solid-lib/ui.css` 导入
