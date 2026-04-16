# Remove Root Export Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the `solid-lib` root export and require all consumers to use `solid-lib/builder` or `solid-lib/route`.

**Architecture:** Delete the root aggregate entrypoint, remove the `"."` package export, and migrate every internal fixture, demo, and doc reference to explicit subpath imports. Preserve CLI bin paths and the existing `src/builder/_` / `src/route/_` structure.

**Tech Stack:** TypeScript, Bun, package exports, Markdown

---

### Task 1: Lock the no-root-export rule with failing tests

**Files:**
- Modify: `test/package-metadata.test.ts`
- Modify: `test/solid-dev.test.ts`

- [ ] **Step 1: Add a metadata assertion that `exports["."]` is absent**
- [ ] **Step 2: Change builder-related fixtures from `solid-lib` to `solid-lib/builder`**
- [ ] **Step 3: Run focused tests to verify RED**

Run: `bun test test/package-metadata.test.ts test/solid-dev.test.ts`

Expected: FAIL because the root export still exists and the builder subpath is not yet the only supported import path.

### Task 2: Remove the root export

**Files:**
- Modify: `package.json`
- Delete: `src/_.ts`

- [ ] **Step 1: Remove `main`, `module`, `types`, and `exports["."]` root-export wiring**
- [ ] **Step 2: Keep only `./builder` and `./route` in package exports**
- [ ] **Step 3: Delete `src/_.ts`**
- [ ] **Step 4: Run focused tests**

Run: `bun test test/package-metadata.test.ts`

Expected: PASS on metadata shape

### Task 3: Migrate all builder imports

**Files:**
- Modify: `test/solid-dev.test.ts`

- [ ] **Step 1: Replace every `defineSolidBuildConfig` import from `solid-lib` with `solid-lib/builder`**
- [ ] **Step 2: Search for remaining builder root imports**
- [ ] **Step 3: Run focused builder tests**

Run: `bun test test/solid-dev.test.ts`

Expected: PASS

### Task 4: Migrate all route imports

**Files:**
- Modify: `demo/src/RouteShowcase.tsx`
- Modify: `demo/src/routes/SearchRoute.tsx`
- Modify: `demo/src/routes/HistoryRoute.tsx`
- Modify: `test/demo-local-consumer.ts`

- [ ] **Step 1: Replace all route imports with `solid-lib/route`**
- [ ] **Step 2: Search for remaining root imports**
- [ ] **Step 3: Run smoke verification**

Run: `bun run test:smoke`

Expected: PASS

### Task 5: Update docs

**Files:**
- Modify: `README.md`
- Modify: `src/builder/README.md`
- Modify: `src/route/README.md`

- [ ] **Step 1: State clearly that the package has no root export**
- [ ] **Step 2: Document `solid-lib/builder` and `solid-lib/route` as the only supported import paths**
- [ ] **Step 3: Remove root-import examples**

### Task 6: Full verification

**Files:**
- Review: `package.json`
- Review: `src/builder/README.md`
- Review: `src/route/README.md`
- Review: `test/solid-dev.test.ts`
- Review: `test/demo-local-consumer.ts`

- [ ] **Step 1: Run `bun run test:unit`**
- [ ] **Step 2: Run `bun run test:smoke`**
- [ ] **Step 3: Run `bun run typecheck` in `demo/`**
- [ ] **Step 4: Run `rg 'from \"solid-lib\"'` and confirm no code imports remain**
