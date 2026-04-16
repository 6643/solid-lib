# SPA Route Design

**Date:** 2026-04-12

## Goal

在 `src/route` 提供一个面向 Solid 2 SPA 的最小路由模块，支持静态 path 精确匹配、原生 `<a>` 同源导航、命令式导航、浏览器前进后退同步、懒加载页面组件，以及组件内 query 参数解析。

## Scope

### In

- `<Route path="/search" component={Search} />`
- path 只做静态精确匹配
- 同源 `<a href>` 拦截并走 SPA 导航
- `pushRoute()` / `replaceRoute()`
- `getRouteBackPath()`
- `parseParam("page", parser)`
- query 改变时保留同一路径对应的组件实例
- 支持 `lazy(() => import("./Search"))`

### Out

- 动态段，例如 `/post/:id`
- 通配符
- 嵌套路由
- SSR 路由功能
- loading / error boundary 封装

## Solid 2 Constraints

- 使用 `solid-js@2.0.0-beta.6`
- 使用 `runWithOwner(null, ...)` 持有全局 detached route state
- 使用 `onSettled(() => cleanup)` 安装与清理浏览器监听
- 命令式导航后调用 `flush()`，避免同步读取 route state 时拿到旧值
- 避免顶层 props reactive read 警告，`Route` 中的 `path` 和 `component` 通过 `untrack` 读取一次

相关依据:

- https://raw.githubusercontent.com/solidjs/solid/next/documentation/solid-2.0/MIGRATION.md
- https://raw.githubusercontent.com/solidjs/solid/next/documentation/solid-2.0/01-reactivity-batching-effects.md
- https://raw.githubusercontent.com/solidjs/solid/next/documentation/solid-2.0/02-signals-derived-ownership.md
- https://docs.solidjs.com/reference/component-apis/lazy
- https://docs.solidjs.com/concepts/components/props

## Public API

```tsx
<Route path="/search" component={Search} />
```

```ts
pushRoute(path: string): void
replaceRoute(path: string): void
getRouteBackPath(): string | undefined
parseParam<T>(name: string, parser: ParamParser<T>): Accessor<T>
```

### `Route`

- 不输出额外 DOM
- 仅当当前 `pathname` 命中 `path` 时渲染对应组件
- 同一 `path` 下 `search` 或 `hash` 变化不应重建当前页面组件

### `parseParam`

- 在组件内部调用
- 输入是参数名和 parser，例如 `parseParam("page", (raw) => Number(raw ?? "1"))`
- 第二参数也可以直接给 primitive 默认值:
  - `parseParam("page", 0)` -> `number`
  - `parseParam("enabled", false)` -> `boolean`
  - `parseParam("q", "")` -> `string`
- 返回 Solid accessor，例如 `page()`
- accessor 直接连接全局 route state，确保 query 改变后在 reactive scope 中读取到新值
- number 在缺失、空字符串或 `Number(...)` 为 `NaN` 时回退到默认值
- boolean 识别 `true/false`、`1/0`、`yes/no`、`on/off`，其他值回退到默认值
- string 在缺失时回退到默认值

## Runtime Model

### Global route state

维护一个全局单例 state:

- `href`
- `pathname`
- `search`
- `hash`

state 来源:

- 初始浏览器 `location`
- `pushRoute()`
- `replaceRoute()`
- `popstate`
- 拦截的同源 `<a>` 点击

### History metadata

当前 entry 的 back path 不使用独立内存栈，而是跟随 `history.state`:

- 初始化当前 entry 时写入内部 marker
- `pushRoute(next)` 将当前站内路径写入新 entry 的 `backPath`
- `replaceRoute(next)` 保留当前 entry 的 `backPath`
- `getRouteBackPath()` 读取当前 entry metadata

这样浏览器前进后退时，back path 与 entry 一起自然恢复。

## Link Interception

仅拦截以下场景:

- 同源链接
- 左键点击
- 未被 `defaultPrevented`
- 无 `metaKey` / `ctrlKey` / `shiftKey` / `altKey`
- 无 `target`
- 无 `download`

忽略:

- 站外链接
- hash-only 页面内跳转
- 新标签 / 下载 / 修饰键打开

## Testing

单测覆盖:

- `pushRoute()` 更新 path 并写入 `backPath`
- `replaceRoute()` 替换当前 path 且保留 `backPath`
- `popstate` 后 route state 与 `getRouteBackPath()` 同步
- `parseParam()` 在 query 变化后能读取新值
- `Route` 在 path 命中时渲染，在 query 变化时保留实例
- click 拦截仅接管符合条件的同源 `<a>`

## Risks

- [风险] Bun test 默认无 DOM，需要在测试中构造最小 browser fakes 或补充手动验证
- [风险] `parseParam()` 返回 accessor，调用者若在 reactive scope 外先求值再缓存结果，会失去响应式更新

## Rollback

- 回退路径是删除 `src/route` 与其导出，不影响现有 builder 功能
- 公开入口仅新增导出，不修改现有 builder API
