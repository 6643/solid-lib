# Underscore Entrypoints Design

**Date:** 2026-04-13

## Goal

把当前基于 `index.ts` 的聚合导出改为基于 `_.ts` 的聚合导出, 并收紧 route 的公开接口。

目标结果:

- `src/_.ts` 成为根公开入口
- `src/builder/_.ts` 成为 builder 聚合入口
- `src/route/_.ts` 成为 route 聚合入口
- 删除 `src/index.ts` 和 `src/route/index.ts`
- route 只保留最小公开导出

## Scope

### In

- 新增 `src/_.ts`
- 新增 `src/builder/_.ts`
- 新增 `src/route/_.ts`
- 删除现有目录级 `index.ts` 聚合入口
- 更新根包 metadata 到 `src/_.ts`
- 更新仓库内测试, 文档和示例导入路径
- 明确 route 公共 API 的最小集合

### Out

- 不调整 route 行为
- 不拆分 builder 包
- 不调整 `solid-build` / `solid-dev` 的 bin 路径
- 不新增子路径 exports, 例如 `solid-lib/route`

## Current State

- 根公开入口仍在 `src/index.ts`
- route 聚合入口仍在 `src/route/index.ts`
- `src/builder/` 没有目录聚合入口
- 测试与文档中存在对 `src/index.ts` 的直接引用
- 根入口当前通过 `./route` 目录导出 route API

## Design

### Entrypoint layout

新的聚合入口布局:

```text
src/_.ts
src/builder/_.ts
src/route/_.ts
```

删除:

```text
src/index.ts
src/route/index.ts
```

### Public API boundaries

`src/builder/_.ts` 仅导出:

- `defineSolidBuildConfig`
- `SolidBuildConfig`

`src/route/_.ts` 仅导出:

- `Route`
- `RouteProps`
- `pushRoute`
- `replaceRoute`
- `getRouteBackPath`
- `parseParam`
- `parseParams`
- `ParamParser`
- `ParamSchema`
- `ParsedParams`

不通过聚合入口暴露:

- `state.ts`
- `testing.ts`
- `match.ts`

`src/_.ts` 仅重新导出根公共 API:

- builder 公共 API
- route 公共 API

### Internal imports

仓库内部不再依赖目录默认聚合:

- 根入口改为显式 `./_`
- route 聚合改为显式 `./route/_`
- builder 聚合改为显式 `./builder/_`

内部实现文件继续直接引用具体文件, 不强制改成都经由聚合入口转发。

### Package metadata

`package.json` 统一指向 `src/_.ts`:

- `main`
- `module`
- `types`
- `exports["."].types`
- `exports["."].import`

这样删除 `src/index.ts` 后, 包入口仍然稳定。

### Docs and tests

需要同步调整:

- README 中关于根入口 `src/index.ts` 的说明
- 单测里直接引用 `../src/index`
- 历史 spec/plan 中提到 `src/index.ts` / `src/route/index.ts` 的内容

对于历史文档, 仅修正仍被当作当前事实引用的部分, 不做大范围重写。

## Risks

- [风险] 删除 `index.ts` 后, 如果漏改任一内部导入, 会在测试或构建中直接暴露
- [风险] package metadata 若未完全切到 `src/_.ts`, 发布包会出现悬空入口
- [风险] 文档若仍保留 `src/index.ts` 作为当前事实, 会让后续维护者继续按旧结构写代码

## Validation

至少验证:

- `bun run test:unit`
- `bun run test:smoke`
- `bun run typecheck` in `demo/`
- 根入口从 `src/_.ts` 导入公共 API 仍可工作
- route 聚合入口不暴露内部测试与状态模块

## Rollback

回退路径清晰:

- 恢复 `src/index.ts` 和 `src/route/index.ts`
- 将 package metadata 指回 `src/index.ts`
- 撤销测试与文档中的 `_.ts` 路径调整
