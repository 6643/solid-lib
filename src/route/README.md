# Route 文档

## 总览

`src/route/` 负责 `solid-lib` 的静态 SPA route 能力, 包括:

- `Route`
- `pushRoute()`
- `replaceRoute()`
- `getRouteBackPath()`
- `parseParam()`
- `parseParams()`

相关入口:

- 根 README: [../../README.md](../../README.md)
- builder 文档: [../builder/README.md](../builder/README.md)

导入路径:

- `solid-lib/route`

## 公开 API

### `Route`

```tsx
<Route path="/search" component={SearchRoute} />
<Route path="/history" when={enabled} component={HistoryRoute} />
<Route path="/*" component={NotFoundRoute} />
```

约束:

- `Route.path` 必须是静态值
- `Route.component` 必须是静态组件引用
- `Route.component` 可以是同步组件, 也可以是 `lazy()` 返回的异步组件
- 只有 `Route.when` 允许动态变化

### 导航 API

- `pushRoute(path)`
- `replaceRoute(path)`
- `getRouteBackPath()`

这组 API 通过浏览器 history entry metadata 保存 back-path, 不维护独立的内存栈。

### 查询参数 API

- `parseParam(name, parserOrFallback)`
- `parseParams(schema)`

这两个工具直接从当前 route 的 query string 读取原始值, 并在页面组件内部完成类型转换。

## 匹配规则

### 精确路由

- 普通 `path` 采用静态精确匹配
- 多条精确 route 可以同时命中并同时渲染

### Fallback

- 仅支持 `path="/*"`
- 只有在当前没有任何精确 route 命中时才生效

### Query 与 Hash

- route 匹配只看 `pathname`
- `search` / `hash` 不参与 route 命中
- 导航时仍会完整保留 `search` / `hash`

## `<a>` 拦截行为

同源原生 `<a>` 点击只有在满足以下条件时才会被 route 层接管:

- 左键点击
- 未被 `preventDefault()`
- 无修饰键
- 无 `target`
- 无 `download`
- 非仅 hash 变化
- 目标路径当前存在可生效的 route

若当前没有任何 route 可处理该目标路径, 则放行给浏览器默认导航。

## 运行时结构

`src/route/` 当前主要由这些文件组成:

- `Route.tsx`
  Route 组件与渲染控制
- `navigation.ts`
  原生 `<a>` 拦截与导航 API
- `params.ts`
  query 参数读取与解析
- `state.ts`
  全局 route snapshot、history metadata 和 route registry
- `match.ts`
  path / fallback 匹配辅助

## 验证命令

只运行 route 相关单测:

```bash
bun test test/route.test.tsx
```

运行完整单测:

```bash
bun run test:unit
```

运行消费者冒烟测试:

```bash
bun run test:smoke
```
