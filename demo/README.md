# 示例应用

`demo/` 是 `solid-lib` 的最小本地消费者示例，包含以下特性：

- `solid-build.config.ts`
- `assetsDirs: ["assets"]`
- CSS Modules
- lazy loading
- SPA route demo:
  - `Route`
  - native `<a>` navigation
  - `pushRoute()` / `replaceRoute()`
  - `getRouteBackPath()`
  - `parseParam()`

## 先注册链接包

```bash
bun link
```

## 安装依赖

```bash
bun install
```

## 类型检查

```bash
bun run typecheck
```

## 启动开发模式

```bash
bun run dev
```

`solid-dev` 会以内存方式提供应用内容，不会写入 `dist/`。

启动后可访问这些示例路径：

- `/`
- `/search?page=1`
- `/history?step=start`
- `/lazy`

## 生产构建

```bash
bun run build
```
