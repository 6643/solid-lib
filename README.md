# solid-lib

`solid-lib` 当前包含四个核心子项目:

- [builder](./src/builder/README.md)
  面向 Bun + Solid 的最小构建与开发工具链
- [route](./src/route/README.md)
  面向静态路径的最小 SPA route 能力
- [ui](./src/ui/README.md)
  面向亮暗模式与主题变量的最小 UI 主题能力
- [utils](./src/utils/_.ts)
  面向组件和业务复用的最小 hooks 与工具能力

## 色彩体系

| 层级 | 用途 | 亮色 | 暗色 |
|------|------|------|------|
| page | 页面背景/文字 | 偏白/偏黑 | 偏黑/偏白 |
| base | 卡片、容器 | 浅色/深色 | 深色/浅色 |
| raised | 按钮、凸起 | 更浅/更深 | 更深/更浅 |
| inset | 输入框、凹陷 | 更深/更浅 | 更浅/更深 |
| disabled | 禁用状态 | 灰色 | 灰色 |
| accent | 强调色 | teal | teal |
| error | 错误色 | firebrick | firebrick |

**全局色**（不区分亮暗）：`--accent-color`、`--error-color`

**层级色**（亮暗各一套）：`--page-bg/fg`、`--base-bg/fg`、`--raised-bg/fg`、`--inset-bg/fg`、`--disabled-bg/fg`

## 导入约束

- 不支持 `import ... from "solid-lib"`
- builder 只能从 `solid-lib/builder` 导入
- route 只能从 `solid-lib/route` 导入
- ui 只能从 `solid-lib/ui` 导入
- utils 只能从 `solid-lib/utils` 导入
- 样式只能从 `solid-lib/ui.css` 导入

## 构建入口

demo 和消费者项目使用统一 CLI:

```bash
solid-lib dev
solid-lib build
```

配置文件固定为项目根目录下的 `config.ts`:

```ts
import { defineConfig } from "solid-lib/builder";

export default defineConfig({
  appTitle: "solid-lib demo",
  assetsDirs: ["assets"],
  outDir: "dist",
  watchDirs: ["../src"],
});
```



## 基于 SolidJS 2.0

本项目锁定 SolidJS 2.0 beta 运行时与类型约束。
