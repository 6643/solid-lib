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
- 发布包只提供 `.`、`./route` 与 `./ui.css` 三个入口，不提供旧的 UI/utils 子入口或构建器入口
- 路由只能从 `solid-lib/route` 导入（它不进根入口，避免把浏览器副作用带进只想要组件的应用）

```ts
import { Card, FilledButton, createStorage, useVis } from "solid-lib";
import "solid-lib/ui.css";
```

## 路由

`solid-lib/route` 是单文件静态路由：路径只支持静态字符串（不支持 `:id` 动态段），参数只走 query string，滚动恢复只记窗口位置。

```tsx
import { Route, getRouteBackPath, parseParam, pushRoute, replaceRoute } from "solid-lib/route";

// 同一 path 可以有多块同时渲染；`when` 为假时该块不参与匹配
<Route path="/buttons" component={ButtonsPage} />
<Route path="/buttons" component={ButtonsExtra} when={() => showExtra()} />
<Route path="/*" component={NotFound} />          // 没有任何精确匹配时兜底

const page = parseParam("page", 1);               // accessor，读取即订阅
page();                                           // 3

pushRoute("/inputs?page=2");                      // 站内跳转，跨源/协议相对会抛错
replaceRoute("/inputs?page=3");
getRouteBackPath();                               // 上一条记录的 pathname + search，没有则 null
```

- 链接拦截：文档级接管普通左键站内 `<a href>`；修饰键、中键、`download`、`target="_blank"`、页内 `#锚点` 交回浏览器
- 滚动恢复：按 history entry 的 depth 记 `window.scrollY`，`push` 剪掉前进方向并回到顶部，`replace` 保持位置；首屏只在 `reload` / `back_forward` 时恢复
- 容器内部滚动（可滚动 `<main>`、列表）不在本模块职责内，用 `useKeepScroll` 自己记

## 应用构建

demo 和消费者应用由 Vite+ 驱动（pnpm 作为包管理器，脚本经 `vp dev` / `vp build` / `vp preview` 执行）；路由使用本库的 `solid-lib/route`，不再依赖 `@solidjs/router`。

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

本项目锁定 SolidJS `2.0.0-rc.16` 运行时与类型约束，JSX 使用官方 native compiler。`@solidjs/start@2.0.4` 暂不加入依赖图，因为它的依赖仍指向 Solid 1；Solid 2 RC 使用 `@solidjs/vite-plugin` 的 Start mode。
