# Solid 2 RC Start Mode, Bun and Official Router Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `demo` 迁移到官方 Solid 2 Start mode/native compiler，并由 Bun 执行完整应用生命周期；同时把 `solid-lib` 的源码与发布边界收敛为扁平根入口和 `ui.css`，由官方 Solid Router 接管需要路由的消费者。

**Architecture:** `demo` 使用 `@solidjs/vite-plugin` 的官方 `start: true` mode、`ssr: false` 和 native compiler；`@solidjs/start@2.0.4` 不加入依赖图，因为它仍依赖 Solid 1.9。`solid-lib` 只提供组件、hooks、工具和样式入口；路由由应用直接依赖 `@solidjs/router@2.0.0-next.18`。旧 `src/builder` 与 `src/route` 在替代链路和消费者回归通过后退休。

**Execution note (2026-08-26):** Bun `1.4.0` 不能解析 workspace member 对根包的 `workspace:*` 依赖，且同仓 `file:..` 会递归复制父项目的 `demo/node_modules`。因此 demo 不声明自身的 `solid-lib` 依赖，改由 Vite alias/TypeScript paths 指向根级扁平入口；local consumer 使用显式源码 symlink，packed consumer 使用 tarball。

**Tech Stack:** Bun 1.4.0, Solid `2.0.0-rc.3`, `@solidjs/web` `2.0.0-rc.3`, `@solidjs/compiler` `2.0.0-rc.3`, `@solidjs/vite-plugin` `3.0.0-next.34`, Vite `8.2.2`, `@solidjs/router` `2.0.0-next.18`, TypeScript `7.0.2`, `@types/bun` `1.4.0`.

**Spec:** `docs/superpowers/specs/2026-08-26-solid2-vite-migration-design.md`

## Global Constraints

- 包管理、安装、脚本执行和验证统一使用 Bun；不调用 `npm`、`pnpm` 或 `yarn`。
- 不添加 `@solidjs/start`：latest `2.0.4` 依赖 Solid 1.9，Solid 2 RC 使用 `@solidjs/vite-plugin` 的官方 Start mode。
- Solid runtime、web runtime、native compiler 固定为 `2.0.0-rc.3`；官方 router 固定为 `2.0.0-next.18`，不得使用 `@solidjs/router@latest`。
- `demo/vite.config.ts` 必须使用 `solid({ start: true, compiler: "native", ssr: false })`。
- demo 的本地 `solid-lib` 导入必须通过 Vite alias 和 TypeScript paths 指向根级 `src/_.ts`/`src/_.css`，不得恢复会递归复制父项目的同仓 `file:..` 自引用。
- `solid-lib` 最终只保留 `.` 和 `./ui.css` exports；UI 与 utils 已合并到扁平 `src/`，不保留 builder/route 兼容导出。
- 不改变现有组件、hooks 和工具的公开行为；删除 route 只删除自研路由 API，不复制新的 `solid-lib` 路由 API。
- native compiler、Vite 或官方 router 在 Bun 下无法通过验证时，保留对应旧边界并报告证据；不能用 Babel fallback 伪装 native 迁移成功。

---

### Task 1: Lock the latest-compatible toolchain

**Files:**
- Modify: `test/package-metadata.test.ts`
- Modify: `package.json`
- Modify: `demo/package.json`
- Modify: `tsconfig.json` only if TypeScript 7 rejects an obsolete option
- Regenerate: `bun.lock` and `demo/bun.lock`
- Modify: `README.md`, `demo/README.md`, and the active spec

**Interfaces:**
- Root package exports remain `{ ".": { "types": "./src/_.ts", "import": "./src/_.ts" }, "./ui.css": "./src/_.css" }`.
- Demo scripts remain `dev: "vite"`, `build: "vite build"`, `preview: "vite preview"`, and `typecheck`.
- Solid 2 RC packages stay on RC3 where a literal registry `latest` tag points to an incompatible or older channel.

- [x] **Step 1: Add the latest-compatible dependency assertions.**

  Extend `test/package-metadata.test.ts` with these checks before changing package files:

  ```ts
  expect(packageJson.devDependencies["@types/bun"]).toBe("1.4.0");
  expect(packageJson.devDependencies.typescript).toBe("7.0.2");
  expect(packageJson.dependencies["@solidjs/web"]).toBe("2.0.0-rc.3");
  expect(packageJson.peerDependencies["solid-js"]).toBe("2.0.0-rc.3");
  expect(packageJson.dependencies["@solidjs/start"]).toBeUndefined();
  ```

  Add a demo assertion for `devDependencies.typescript === "7.0.2"` and retain the exact Vite, compiler, runtime, router and local `solid-lib` assertions.

- [x] **Step 2: Run the focused test and record the expected red result.**

  Run: `bun test test/package-metadata.test.ts`

  Expected: FAIL on the old TypeScript and Bun type versions, while the existing Start mode assertions remain readable.

- [x] **Step 3: Update package metadata to the compatible graph.**

  Change only the following values:

  ```json
  {
    "devDependencies": {
      "@types/bun": "1.4.0",
      "solid-js": "2.0.0-rc.3",
      "typescript": "7.0.2"
    },
    "dependencies": {
      "@solidjs/web": "2.0.0-rc.3"
    },
    "peerDependencies": {
      "solid-js": "2.0.0-rc.3"
    }
  }
  ```

  Add `typescript: "7.0.2"` to `demo/devDependencies`. Do not add `@solidjs/start`; do not replace RC3 runtime packages with the Solid 1 registry latest tags.

- [x] **Step 4: Regenerate both lockfiles with Bun.**

  Run: `bun install`

  Run: `bun install` from `demo/`.

  Expected: the root lockfile no longer keeps packages reachable only from removed package metadata, and both lockfiles resolve the declared versions.

- [x] **Step 5: Run the metadata test and inspect whitespace.**

  Run: `bun test test/package-metadata.test.ts`

  Run: `git diff --check`

  Expected: the focused test passes and no whitespace errors are reported.

### Task 2: Make the demo an official Solid 2 Start mode app

**Files:**
- Modify: `demo/vite.config.ts`
- Verify: `demo/src/App.tsx`, `demo/src/Document.tsx`
- Modify: `demo/src/pages/*.tsx` only if typecheck identifies an import left on a deleted path
- Modify: `test/demo-build.test.ts`
- Modify: `demo/README.md`

**Interfaces:**
- `@solidjs/vite-plugin` discovers `src/App.tsx` and `src/Document.tsx` when `start: true`.
- `ssr: false` selects client Start mode; there is no custom `index.html`, Bun server, or `solid-lib` CLI.
- `/assets/demo.txt` and `/assets/a.avif` are served from `demo/public/assets/`.

- [x] **Step 1: Add the explicit Start mode contract before changing config.**

  In `test/demo-build.test.ts`, assert that `demo/vite.config.ts` contains the exact plugin call:

  ```ts
  expect(source).toContain('solid({ start: true, compiler: "native", ssr: false })');
  expect(source).toContain('from "@solidjs/vite-plugin"');
  expect(source).not.toContain("@solidjs/start");
  ```

  Add an output assertion that `demo/dist/client/assets/demo.txt` exists after the build and contains the tracked asset text.

- [x] **Step 2: Run the focused build contract to establish its current result.**

  Run: `bun test test/demo-build.test.ts`

  Expected: the test either fails on the missing explicit `ssr: false` contract or passes only the already-existing build checks; preserve the output before editing the config.

- [x] **Step 3: Set the official Start mode configuration.**

  Ensure `demo/vite.config.ts` is exactly equivalent to:

  ```ts
  import { defineConfig } from "vite";
  import solid from "@solidjs/vite-plugin";

  export default defineConfig({
    plugins: [solid({ start: true, compiler: "native", ssr: false })],
    server: { host: "127.0.0.1", watch: { usePolling: true } },
    build: { target: "esnext", assetsInlineLimit: 0 },
  });
  ```

- [x] **Step 4: Keep the Solid 2 app and document conventions.**

  Ensure `demo/src/App.tsx` is the application root, `demo/src/Document.tsx` owns the HTML shell, all demo imports use the flat `solid-lib` root, and Vite/TypeScript aliases resolve that root to `../src/_.ts` and `../src/_.css`.

- [x] **Step 5: Run typecheck and build.**

  Run: `bun run --cwd demo typecheck`

  Run: `bun run --cwd demo build`

  Expected: both commands exit zero; the build emits `dist/client/index.html`, JavaScript, CSS, and `dist/client/assets/demo.txt` without TypeScript compiler runtime text.

### Task 3: Migrate consumer routing and prove the package boundary

**Files:**
- Modify: `test/demo-local-consumer.ts`
- Modify: `test/flat-source-entry.test.ts`
- Modify: `test/package-metadata.test.ts`
- Create: `test/official-router-consumer.test.ts` only if the smoke harness cannot cover navigation behavior
- Delete after consumer checks: `test/route.test.tsx`, `test/builder-bootstrap.test.ts`, `test/solid-lib-dev.test.ts`, `test/dev-asset-routes.test.ts`

**Interfaces:**
- Consumer applications own `@solidjs/router@2.0.0-next.18`; `solid-lib` does not export router functions.
- `createRouter`, `useNavigate`, and `useSearchParams` replace the route APIs used by the consumer fixture.
- The flat package exposes the root component/utility entry and `solid-lib/ui.css` only.

- [x] **Step 1: Confirm the generated consumer uses the official router and flat library import.**

  The generated source in `test/demo-local-consumer.ts` must contain:

  ```tsx
  import { createRouter, useNavigate, useSearchParams } from "@solidjs/router";
  import { Card, FilledButton, IconButton, OutlinedButton, TextButton, TextInput, initializeThemeMode, setThemeMode } from "solid-lib";
  import "solid-lib/ui.css";
  ```

  Its generated Vite config must use `solid({ start: true, compiler: "native", ssr: false })`.

- [x] **Step 2: Run both consumer builds before deleting legacy source.**

  Run: `bun run test:local-consumer`

  Run: `bun run test:packed-consumer`

  Expected: both local and packed consumers build with one top-level Solid runtime, official router imports, root library imports, CSS output, and no TypeScript compiler runtime. The local fixture uses a symlink to the source root; the packed fixture installs the generated tarball.

- [x] **Step 3: Add negative package/source assertions.**

  In `test/package-metadata.test.ts`, assert `bin` is absent and the export keys are exactly `[".", "./ui.css"]`. In `test/flat-source-entry.test.ts`, assert `src/builder` and `src/route` are absent after cleanup while `src/_.ts`, `src/_.css`, and the flat component/utility files remain.

- [x] **Step 4: Run the boundary tests and keep any failure as the deletion gate.**

  Run: `bun test test/package-metadata.test.ts test/flat-source-entry.test.ts`

  Expected: the pre-deletion negative assertions fail only while legacy directories or tests are still present; consumer checks remain green.

- [x] **Step 5: Delete the custom route and builder implementation.**

  Delete exactly these source files:

  ```text
  src/route/README.md
  src/route/Route.tsx
  src/route/_.ts
  src/route/browser.ts
  src/route/match.ts
  src/route/navigation.ts
  src/route/params.ts
  src/route/state.ts
  src/route/testing.ts
  src/builder/README.md
  src/builder/_.ts
  src/builder/build.ts
  src/builder/bundle.ts
  src/builder/cli.ts
  src/builder/config-file.ts
  src/builder/config.ts
  src/builder/dev.ts
  src/builder/lib.ts
  src/builder/path.ts
  ```

  Delete the four legacy test files listed above. Keep `src/global.d.ts`, `src/_.ts`, `src/_.css`, and every flat UI/hook/utility source file.

- [x] **Step 6: Remove dependencies that were reachable only from the custom builder.**

  Run `rg` over active source/tests/docs first. Remove any package metadata for Babel or the old CLI only after no active import remains; keep TypeScript 7 and Bun types for typechecking.

  Run: `bun install`

  Expected: package metadata still contains only the root and CSS exports, and no active file references `solid-lib/builder` or `solid-lib/route`.

### Task 4: Remove obsolete JSX compatibility code and align documentation

**Files:**
- Delete: `scripts/patch-solid-jsx-runtime.mjs`, `scripts/solid-jsx-runtime-shim.js`, `src/solid-js-compat.d.ts`, `demo/solid-js-compat.d.ts`
- Modify: `README.md`, `demo/README.md`, `src/README.md`
- Modify: `test/ui-components.test.ts` and `test/utils-lifecycle.test.ts` only for assertions about deleted compatibility or builder files

**Interfaces:**
- RC3 `@solidjs/web` owns the JSX runtime; installation must not patch `node_modules`.
- README examples import components/hooks/utilities from `solid-lib` and CSS from `solid-lib/ui.css`.
- Historical documents under `docs/superpowers/` remain unchanged except the active spec and plan.

- [x] **Step 1: Add a clean-runtime assertion before deleting shims.**

  Add checks that `package.json` has no `postinstall`, the two shim files are absent, and no active source declares `solid-js/jsx-runtime` or `solid-js/jsx-dev-runtime`.

- [x] **Step 2: Run the clean-runtime assertion to establish the deletion result.**

  Run: `bun test test/package-metadata.test.ts test/flat-source-entry.test.ts`

  Expected: it fails only on still-present compatibility files or stale assertions.

- [x] **Step 3: Remove the shims and rewrite active documentation.**

  Document the official Solid 2 Start mode, Bun commands, latest-compatible version policy, flat root exports, and application-owned router. Do not document `@solidjs/start@2.0.4` as a valid Solid 2 dependency.

- [x] **Step 4: Reinstall and rerun the clean runtime checks.**

  Run: `bun install`

  Run: `bun install` from `demo/`.

  Run: `bun test test/package-metadata.test.ts test/flat-source-entry.test.ts`

  Expected: all clean-runtime and package-boundary assertions pass, with no postinstall patch output.

### Task 5: Full Bun and browser acceptance

**Files:**
- Modify only files identified by a failing verification command from Tasks 1-4.
- Verify: `package.json`, `demo/package.json`, `tsconfig.json`, `demo/tsconfig.json`, `demo/vite.config.ts`, `demo/src/App.tsx`, `demo/src/Document.tsx`, flat `src/`, `README.md`, and `demo/README.md`.

**Interfaces:**
- The final validation covers type contracts, UI behavior, native compiler output, official router consumer builds, Start mode dev serving, assets, history fallback, HMR, and absence of legacy boundaries.

- [x] **Step 1: Run repository and demo typechecks.**

  Run: `bun x tsc -p tsconfig.json --noEmit --pretty false`

  Run: `bun run --cwd demo typecheck`

  Expected: zero diagnostics.

- [x] **Step 2: Run the complete unit suite and both consumers.**

  Run: `bun test`

  Run: `bun run test:smoke`

  Expected: zero test failures and both local/packed consumers build successfully.

- [x] **Step 3: Verify the production Start mode output.**

  Run: `bun run --cwd demo build`

  Check `demo/dist/client/index.html`, at least one JavaScript file, at least one CSS file, and `demo/dist/client/assets/demo.txt`. Search emitted JavaScript for `SemanticDiagnosticsBuilderProgram`, `jsxDEV`, and raw TypeScript-only syntax.

- [x] **Step 4: Verify dev serving and browser behavior with Playwright.**

  Start: `bun run --cwd demo dev -- --host 127.0.0.1`

  Check `/` returns the document shell, `/assets/demo.txt` returns the tracked text, an unmatched HTML path returns the shell, components render with CSS Modules, state interaction works, and the browser console has no errors or Solid runtime warnings. Edit a page source file and verify an HMR update without restarting Vite; restore the file afterward.

- [x] **Step 5: Run final stale-reference and diff checks.**

  Run: `rg -n -e 'from ["'"']solid-lib/(builder|route)' -e 'solid-lib (dev|build)' -e '"solid-lib/(builder|route)"[[:space:]]*:' src demo README.md package.json`

  Run: `git diff --check`

  Expected: no active import, command, or export matches and no whitespace errors. Negative assertions in tests and the explicit release note about the excluded Solid 1 Start package are intentional; historical migration records may mention retired paths outside the checked active files.

- [x] **Step 6: Record residual risk.**

  State that Solid 2 runtime/compiler and the compatible router are prerelease lines, while `@solidjs/start@2.0.4` remains excluded for its Solid 1 dependency graph. The browser checks cover this repository demo and do not establish a general deployment adapter contract.
