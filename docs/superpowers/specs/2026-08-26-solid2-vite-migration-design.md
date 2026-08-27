# Solid 2 RC Start Mode and Bun Migration Design

## Goal

将 `demo/` 从当前 `solid-lib` 自定义 Bun 应用构建链迁移到官方 `@solidjs/vite-plugin` Start mode，并由 Bun 统一执行安装、开发、构建和验证，同时让 JSX 使用 Solid 2 RC 的 native compiler。最终 `solid-lib` 以扁平的 `src/` 发布统一根入口和 `ui.css`；路由交给官方 `@solidjs/router`，旧 route/builder 在替代链路和消费者回归通过后退休。

## Current evidence

- `package.json:5-35` 当前已经收敛为扁平根入口和 `./ui.css`，运行时是 `@solidjs/web@2.0.0-rc.3`，peer/dev runtime 是 `solid-js@2.0.0-rc.3`。
- `src/` 已承载原 `ui` 与 `utils` 文件，`src/builder` 和 `src/route` 已在 consumer 回归后删除；根入口只保留组件、hooks、工具和样式。
- `demo/package.json` 已由 Vite 脚本驱动且不声明同仓 `solid-lib` 自引用；`demo/vite.config.ts` 已使用官方 `@solidjs/vite-plugin` 的 `start: true`、native compiler 和 `ssr: false`，通过 alias 指向根级扁平入口。
- 官方 `@solidjs/vite-plugin@3.0.0-next.34` 的 Start mode 拥有入口、开发服务和构建生命周期；其 native backend 使用 `@solidjs/compiler@2.0.0-rc.3`。
- 官方 Solid 2 template 使用 `src/App.tsx`、可选的 `src/Document.tsx`，client Start mode 输出静态 `dist/client`；Bun 1.4.0 可直接执行 Vite 命令，需以当前构建和浏览器结果确认。
- `@solidjs/web@2.0.0-rc.3` 的 `./jsx-runtime` 和 `./jsx-dev-runtime` 已直接指向真实运行时；旧 postinstall shim 已从当前工作树删除，需在最终干净安装中复核。

## Decisions

### 1. Official Solid 2 Start mode owns the demo application lifecycle

`demo/vite.config.ts` 使用：

```ts
solid({ start: true, compiler: "native", ssr: false })
```

这使用 `@solidjs/vite-plugin` 的官方 Start mode，而不是安装与 Solid 2 RC 不兼容的 `@solidjs/start` 包。`ssr: false` 保留当前客户端渲染语义，同时交给官方插件负责 JSX、lazy transform、Solid Refresh/HMR、静态 shell 和资源图；`vite` 命令由 Bun 执行。

截至 2026-08-26，`@solidjs/start@2.0.4` 虽是 latest，但依赖 `solid-js ^1.9.15`；当前项目的 `solid-js 2.0.0-rc.3` 不能与之混用。因此本迁移不添加 `@solidjs/start`，将官方插件文档所称的 Start mode 作为 Solid 2 兼容入口。

### 2. Use official Solid 2 conventions

- 将 `demo/src/_.tsx` 重命名为 `demo/src/App.tsx`。
- 新增 `demo/src/Document.tsx`，保留 title、charset、viewport 和 `HydrationScript`。
- 将静态文件放到 `demo/public/assets/`，保持 `/assets/...` URL。
- demo 通过 `solid-lib` 根入口导入组件和工具，不再通过 `../../src` 绕过 package exports。

### 3. Keep library and legacy builder boundaries separate

Vite 负责应用构建和开发服务；`solid-lib build/dev` 已从 demo 移除，独立消费者迁移和回归门禁通过后，builder 导出、CLI、实现及测试一并删除。库不再承担应用构建生命周期。

### 4. Official router owns route behavior

`src/route` 不再作为 `solid-lib` 能力。demo 和消费者使用固定版本 `@solidjs/router@2.0.0-next.18`，使用 `createRouter`、官方 route config、`useNavigate`、`useSearchParams` 和原生 `<a>`。它不是当前 `Route`、`pushRoute`、`replaceRoute`、`parseParam` 的兼容替换；`getRouteBackPath` 这类业务语义由应用自行实现。

截至 2026-08-26，`@solidjs/router@latest` 是 `1.0.0`，peer 仍是 `solid-js ^1.8.6`；只有 `2.0.0-next.18` 的 peer 与 `solid-js/@solidjs/web 2.0.0-rc.3` 对齐。因此禁止使用不带版本的 `bun add @solidjs/router`。

### 5. Use the latest compatible toolchain

Solid runtime、native compiler 和 Vite plugin 保持与当前 Solid 2 RC3 兼容的 `2.0.0-rc.3` / `3.0.0-next.34`，Vite 使用 latest 的 `8.2.2`，TypeScript 使用 latest 的 `7.0.2`，Bun 类型使用 latest 的 `1.4.0`。`@solidjs/router` 的 latest dist-tag 仍是 Solid 1 的 `1.0.0`，因此 Solid 2 使用其 latest-compatible `2.0.0-next.18`。旧 builder 的 Babel 依赖在 builder 退休前不扩大升级面，退休后删除。

### 6. Remove only obsolete JSX compatibility code

在 RC3 runtime import、typecheck、unit test 和 Vite build 均通过后，删除 `postinstall` shim 和 `solid-js/jsx-runtime` ambient declarations。保留 `src/global.d.ts` 这类仍服务于库源码 CSS module 类型的声明，避免把无关类型支持一并删除。

### 7. Keep the demo's local package boundary explicit

Bun `1.4.0` 对仓库根包的同仓 `file:..` 自引用会把父项目中的 `demo/node_modules` 复制回本地包，形成递归安装树。demo 因此不声明 `solid-lib` 自引用，而由 Vite alias 和 TypeScript paths 指向 `../src/_.ts`、`../src/_.css`；local consumer 用显式源码 symlink，packed consumer 用 `bun pm pack` 生成的 tarball，分别覆盖开发源码和发布包边界。

## Target structure

```text
solid-lib/
└── src/
    ├── _.ts
    ├── _.css
    ├── global.d.ts
    ├── Button.tsx
    ├── useVis.ts
    └── ...

demo/
├── package.json
├── bun.lock
├── tsconfig.json
├── vite.config.ts
├── public/assets/
└── src/
    ├── App.tsx
    ├── Document.tsx
    └── pages/
```

```mermaid
flowchart LR
    demo[demo application] --> vite[Vite 8]
    vite --> plugin[@solidjs/vite-plugin]
    plugin --> compiler[@solidjs/compiler native]
    library[solid-lib package] --> exports[solid-lib / ui.css exports]
    demo --> library
    demo --> router[@solidjs/router 2.0.0-next.18]
    legacy[legacy Bun CLI and custom route] -. temporary compatibility boundary .-> library
```

## Acceptance criteria

1. `demo` 的 `dev`、`build`、`preview` 脚本直接调用 Vite Start mode；不再依赖 `solid-lib` CLI，安装、脚本执行和验证均由 Bun 发起。
2. `bun --cwd demo run build` 在受支持的 runtime 下成功，生成 `demo/dist/client/index.html`、JS/CSS 产物和 `demo/dist/client/assets/demo.txt`。
3. native compiler probe 能处理带 TypeScript 类型和 JSX 的 `.tsx` 输入，生成物不含 JSX 和 TypeScript compiler runtime。
4. Vite dev server 能提供根页面、`/assets/demo.txt`、HTML history fallback 和 HMR client；浏览器检查无运行时错误，组件状态与 CSS module 正常。
5. `solid-lib` 的统一根入口、扁平 UI/utils 单测和 local/packed consumer 回归通过；官方 router consumer 使用固定的 Solid 2 兼容版本。
6. 不再修改 `@solidjs/web` 安装目录，不再声明 `solid-js/jsx-runtime` 兼容模块。
7. route/builder 的删除已在 package exports、CLI、demo、local/packed consumer 和文档无残留引用门禁后执行；删除后 `solid-lib/src` 只保留扁平源码文件和必要的顶层类型声明。
8. 若 Bun 无法加载官方 native compiler、Vite 不满足其 Node engine 或官方 router next 版本无法通过行为回归，保留对应旧边界，不把 Babel fallback 或未验证的 router 替换静默当作迁移成功。

## Non-goals

- 本次不引入 SSR、server functions、文件系统路由或新的 UI 行为；`start: true` 明确使用客户端 Start mode。
- 本次只重组 `src/ui`、`src/utils` 的文件位置和入口，不重构组件行为或公开符号。
- route API 迁移只覆盖当前 route 消费者实际需要的行为，不复制自研实现的内部状态模型。
- `src/builder` 和 `src/route` 的删除属于本迁移的收尾动作，必须先通过 consumer 和文档引用门禁。
- 本次不把官方 Solid 核心包自身的 Rollup/Turbo 构建误判为应用 Vite 构建目标。

## Sources

- https://github.com/solidjs/templates/tree/main/solid-v2
- https://github.com/solidjs/solid-vite-plugin
- https://www.npmjs.com/package/@solidjs/vite-plugin
- https://www.npmjs.com/package/@solidjs/compiler
