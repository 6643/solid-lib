# Builder 文档

## 总览

`src/builder/` 负责 `solid-lib` 的构建与开发流程。

相关入口:

- 根 README: [../../README.md](../../README.md)
- route 文档: [../route/README.md](../route/README.md)

导入路径:

- `solid-lib/builder`

包含两条主要命令入口:

- `solid-build`
  用于生产构建, 输出到磁盘中的 `dist/`
- `solid-dev`
  用于开发模式, 在内存中生成资源并通过 HTTP 服务提供内容

## 文件职责

- `build.ts`
  生产构建入口。负责加载配置、执行打包、复制静态资源，并写入 `index.html` 与产物文件。
- `dev.ts`
  开发服务入口。负责内存构建、HTTP 服务、SSE 刷新通知、轮询配置与源码变更。
- `bundle.ts`
  应用打包核心。负责生成 bootstrap 入口、调用 `Bun.build`、收集 JS/CSS 产物并生成 HTML shell。
- `config.ts`
  配置加载与校验。负责默认值合并、`solid-build.config.ts` 导入、路径边界校验、`assetsDirs` 解析与 `outDir` 约束。
- `lib.ts`
  构建器共享能力。当前主要包含 Solid Babel 插件接入、`rxcore` shim，以及库构建辅助逻辑。

## 调用链

### `solid-build`

1. `build.ts` 调用 `loadConfig()`
2. `config.ts` 解析并校验 `solid-build.config.ts`
3. `build.ts` 调用 `buildAppBundle()`
4. `bundle.ts` 生成 bootstrap 入口、执行 `Bun.build`
5. `build.ts` 将打包产物写入 `outDir`
6. `build.ts` 复制 `assetsDirs` 并写入 `index.html`

### `solid-dev`

1. `dev.ts` 调用 `loadConfig()`
2. `dev.ts` 调用 `buildAppBundle()`，但不写入 `dist/`
3. `dev.ts` 将 HTML、JS、CSS 保存在内存中
4. `dev.ts` 通过 `Bun.serve` 提供页面与资源
5. `dev.ts` 暴露 `/__solid_dev/events` SSE 通道
6. 文件变化后重新构建，并通知浏览器刷新

## 关键实现点

### 配置模型

当前支持的配置字段包括:

- `appComponent`
- `mountId`
- `appTitle`
- `assetsDirs`
- `devPort`
- `outDir`

`config.ts` 会拒绝旧字段，并限制以下边界:

- 应用入口必须位于项目根目录内
- `assetsDirs` 必须位于项目根目录内
- `outDir` 不能指向项目根目录，也不能位于源码树内
- 入口组件必须有默认导出

### 运行时依赖

`bundle.ts` 直接引用 `dom-expressions/src/client` 作为运行时入口，`lib.ts` 负责为其中的 `rxcore` 导入提供 shim。由于这是实际的运行时依赖，安装后的消费者环境也必须能解析到 `dom-expressions`。

### `solid-dev` 的内存输出

`solid-dev` 不会写入 `dist/`。它会:

- 将打包产物保存在内存 `Map`
- 通过 HTTP 直接返回 HTML、JS、CSS
- 对 `assetsDirs` 保持磁盘读取
- 通过 SSE 推送 reload 事件

## 验证命令

默认只运行 `bun:test` 测试:

```bash
bun run test
```

运行安装路径相关的全部冒烟测试:

```bash
bun run test:smoke
```

只运行本地目录消费者冒烟测试:

```bash
bun run test:local-consumer
```

只运行打包安装消费者冒烟测试:

```bash
bun run test:packed-consumer
```

只运行 `bun:test` 测试:

```bash
bun run test:unit
```
