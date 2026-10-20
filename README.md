# solid-lib

组件、hooks 与工具统一从 `solid-lib` 根入口导入。

- UI 组件与主题能力
- 可复用 hooks 与工具
- `solid-lib/ui.css` 全局样式入口

## 色彩体系

| 层级     | 用途          | 亮色      | 暗色      |
| -------- | ------------- | --------- | --------- |
| base     | 卡片、容器    | 浅色/深色 | 深色/浅色 |
| raised   | 按钮、凸起    | 更浅/更深 | 更深/更浅 |
| inset    | 输入框、凹陷  | 更深/更浅 | 更浅/更深 |
| disabled | 禁用文字/边框 | 灰色      | 灰色      |
| accent   | 强调色        | teal      | teal      |
| error    | 错误色        | firebrick | firebrick |

**全局色**（不区分亮暗）：`--accent-color`、`--error-color`、`--disabled-color`

**层级色**（亮暗各一套）：`--base-bg/fg`、`--raised-bg/fg`、`--inset-bg/fg`

## 导入约束

- 组件、hooks 与工具统一从 `solid-lib` 导入
- 样式只能从 `solid-lib/ui.css` 导入
- 发布包只提供 `.` 与 `./ui.css` 两个入口，不提供旧的 UI/utils 子入口、构建器或路由子入口

```ts
import { Card, FilledButton, createStorage, useVis } from "solid-lib";
import "solid-lib/ui.css";
```

## 应用构建

demo 和消费者应用由 Vite+ 驱动（pnpm 作为包管理器，脚本经 `vp dev` / `vp build` / `vp preview` 执行）；路由使用应用自己的 `@solidjs/router` 依赖。当前 Solid 2 `2.0.0-rc.15` 对应的兼容 Router 版本固定为 `2.0.0-next.40`。

demo 使用官方 Solid 2 Start mode：

```ts
solid({ start: true, compiler: "native", ssr: false });
```

demo 的 `vite.config.ts` 和 `tsconfig.json` 将 `solid-lib` 映射到仓库根级扁平源码入口。demo 不声明同仓 `file:..` 自引用依赖，以避免包管理器递归复制父项目；local/packed consumer smoke 会分别覆盖源码链接和发布 tarball。

```bash
vp -C demo run dev
vp -C demo run build
vp -C demo run preview
```

## 基于 SolidJS 2.0

本项目锁定 SolidJS `2.0.0-rc.15` 运行时与类型约束，JSX 使用官方 native compiler。`@solidjs/start@2.0.4` 暂不加入依赖图，因为它的依赖仍指向 Solid 1；Solid 2 RC 使用 `@solidjs/vite-plugin` 的 Start mode。
