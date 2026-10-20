# 示例应用

`demo/` 是 `solid-lib` 的最小本地消费者示例，使用官方 Vite 插件和 Solid 2 native compiler，包含以下特性：

- Vite client mode
- `@solidjs/vite-plugin` 的 `start: true`
- Solid 2 `compiler: "native"`
- `ssr: false` 的 client Start mode
- `public/assets/` 静态资源
- CSS Modules
- lazy loading

demo 的 `vite.config.ts` 与 `tsconfig.json` 将 `solid-lib` 和 `solid-lib/ui.css` 指向仓库根级扁平入口。demo 不声明同仓 `file:..` 自引用依赖，以避免包管理器复制父项目并形成递归 node_modules；仓库的 local/packed consumer smoke 分别验证源码链接和发布 tarball。

## 安装依赖

```bash
vp install
```

## 类型检查

```bash
vp run typecheck
```

## 启动开发模式

```bash
vp run dev
```

Vite 默认监听 `127.0.0.1`，支持模块热更新。开发 watcher 使用 polling，不依赖宿主机可用的 inotify watch 配额；非文件路径会回退到应用的 HTML shell。

启动后可访问：

- `/`
- `/assets/demo.txt`
- `/assets/a.avif`

## 生产构建

```bash
vp run build
```

构建产物位于 `dist/client/`，静态资源仍保留在 `dist/client/assets/`。

## 预览生产构建

```bash
vp run preview
```
