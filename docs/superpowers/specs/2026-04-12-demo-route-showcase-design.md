# Demo Route Showcase Design

**Date:** 2026-04-12

## Goal

把 `demo/` 从单页计数器示例扩展为一个最小 SPA 路由展示应用，集中演示 `Route`、原生 `<a>`、`pushRoute()`、`replaceRoute()`、`getRouteBackPath()`、`parseParam()` 和 lazy route。

## Scope

### In

- 单入口 demo shell
- 顶部原生 `<a>` 导航
- `/`、`/search`、`/history`、`/lazy` 四个静态页面
- `parseParam()` 解析 query
- `pushRoute()` / `replaceRoute()` / `getRouteBackPath()` 展示
- `lazy(() => import(...))` 页面示例
- README 补充路由说明

### Out

- 复杂布局或设计系统
- 动态段、嵌套路由、404
- 浏览器自动化测试

## Design

- `demo/src/_.tsx` 作为应用入口，渲染 demo shell 和多个 `<Route />`
- 新增 `RouteShowcase` 页面容器组件，负责导航与页面编排
- `/search` 页面展示 `parseParam()` accessor 用法
- `/history` 页面展示命令式导航与 back path
- `/lazy` 页面通过 Solid 2 的 `lazy()` + `Loading` 渲染懒加载页面
- 样式独立到新的 CSS Module，保留当前 demo 的暖色、报刊式基调

## Verification

- `bun run typecheck` in `demo/`
- `bun run build` in `demo/`
- 手动验证原生 `<a>`、命令式导航、query 更新、浏览器前进后退、lazy page

## Risks

- [风险] 目前没有浏览器自动化，交互级验证仍以手动 smoke 为主
- [风险] lazy route 是否按预期分块，依赖当前 builder 对 `solid-js` lazy 用法的编译支持
