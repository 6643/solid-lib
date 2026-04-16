# Remove Root Export Design

**Date:** 2026-04-13

## Goal

移除 `solid-lib` 根入口的公开导出能力, 只保留两个显式子路径:

- `solid-lib/builder`
- `solid-lib/route`

目标结果:

- 前端 route 只能从 `solid-lib/route` 导入
- builder 配置只能从 `solid-lib/builder` 导入
- 根入口不再作为可用 API 入口

## Scope

### In

- 删除根公开导出
- 删除 `src/_.ts`
- 移除 `package.json` 中 `exports["."]`
- 所有测试、文档、fixture 迁移到子路径导入

### Out

- 不调整 route 行为
- 不调整 builder CLI bin 路径
- 不拆分 npm 包

## Design

### Package exports

保留:

- `./builder`
- `./route`

删除:

- `.`

同时移除 `main` / `module` / `types` 指向根入口的配置, 因为根入口不再是公开 API。

### Source layout

删除:

- `src/_.ts`

保留:

- `src/builder/_.ts`
- `src/route/_.ts`

### Consumer migration

builder 相关用法统一改为:

```ts
import { defineSolidBuildConfig } from "solid-lib/builder";
```

route 相关用法统一改为:

```ts
import { Route, pushRoute } from "solid-lib/route";
```

### Documentation

根 README 只说明:

- 该包不提供根导出
- 可用入口只有 `solid-lib/builder` 与 `solid-lib/route`

builder 与 route 各自 README 说明自己的子路径。

## Risks

- [风险] 这是破坏性公开契约变更
- [风险] 若漏改任一测试 fixture 或 demo 导入, 会直接构建失败
- [风险] 若 package metadata 与真实文件布局不同步, packed consumer 会失效

## Validation

- `bun run test:unit`
- `bun run test:smoke`
- `bun run typecheck` in `demo/`
- `demo` 构建产物不再包含 `SemanticDiagnosticsBuilderProgram`
- 仓库内不再存在 `from "solid-lib"` 的代码导入
