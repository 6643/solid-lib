# Underscore Entrypoints Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `index.ts` aggregate exports with `_.ts` entrypoints across `src`, `src/builder`, and `src/route`, while keeping the package's public API minimal and working.

**Architecture:** Introduce explicit `_.ts` aggregate files for root, builder, and route; point package metadata at `src/_.ts`; and delete the old `index.ts` aggregate files instead of leaving compatibility shims. Keep internal implementation imports direct unless a true aggregate import is needed.

**Tech Stack:** TypeScript, Bun, package metadata, Solid 2

---

### File Structure

**Create:**

- `src/_.ts`
- `src/builder/_.ts`
- `src/route/_.ts`

**Delete:**

- `src/index.ts`
- `src/route/index.ts`

**Modify:**

- `package.json`
- `README.md`
- `test/route.test.tsx`
- any repo files still importing `src/index.ts` or directory entrypoints
- relevant historical docs that still describe the current entrypoint layout

### Task 1: Lock the new entrypoint layout with failing tests

**Files:**

- Modify: `test/route.test.tsx`
- Modify: `test/package-metadata.test.ts`

- [ ] **Step 1: Write the failing import-path test**

Change the route test import to use `../src/_` instead of `../src/index`, and ensure the root aggregate still exposes the current public route API.

- [ ] **Step 2: Write the failing metadata assertion**

Add an assertion that package metadata points at `./src/_.ts` rather than `./src/index.ts`.

- [ ] **Step 3: Run the focused tests to verify RED**

Run: `bun test test/route.test.tsx test/package-metadata.test.ts`

Expected: FAIL because `src/_.ts` does not exist yet and metadata still references `src/index.ts`.

### Task 2: Create the new aggregate entrypoints

**Files:**

- Create: `src/_.ts`
- Create: `src/builder/_.ts`
- Create: `src/route/_.ts`

- [ ] **Step 1: Create the builder aggregate**

Export only `defineSolidBuildConfig` and `SolidBuildConfig` from `src/builder/_.ts`.

- [ ] **Step 2: Create the route aggregate**

Export only the route public API from `src/route/_.ts`, excluding internal files such as `state.ts`, `testing.ts`, and `match.ts`.

- [ ] **Step 3: Create the root aggregate**

Re-export the builder and route public APIs from `src/_.ts`.

- [ ] **Step 4: Run the focused tests**

Run: `bun test test/route.test.tsx test/package-metadata.test.ts`

Expected: still FAIL on metadata or remaining old import paths, but no longer fail due to missing `src/_.ts`.

### Task 3: Remove the old `index.ts` entrypoints and retarget imports

**Files:**

- Delete: `src/index.ts`
- Delete: `src/route/index.ts`
- Modify: `test/route.test.tsx`
- Modify: any repo files still importing old directory entrypoints

- [ ] **Step 1: Replace old imports**

Switch direct test and repo references from `src/index.ts` or directory aggregate paths to the new explicit `_.ts` entrypoints.

- [ ] **Step 2: Delete the old aggregate files**

Remove `src/index.ts` and `src/route/index.ts` once no live references remain inside the repository.

- [ ] **Step 3: Run the focused tests**

Run: `bun test test/route.test.tsx test/package-metadata.test.ts`

Expected: FAIL only if package metadata or docs remain outdated.

### Task 4: Update package metadata and docs

**Files:**

- Modify: `package.json`
- Modify: `README.md`
- Modify: docs that still describe `src/index.ts` or `src/route/index.ts` as current entrypoints

- [ ] **Step 1: Retarget package metadata**

Point `main`, `module`, `types`, and `exports["."]` at `./src/_.ts`.

- [ ] **Step 2: Retarget README examples**

Replace references to `src/index.ts` with `src/_.ts` where they describe the current public entrypoint.

- [ ] **Step 3: Update still-relevant internal docs**

Fix current-fact references in living docs so they match the new `_.ts` structure.

- [ ] **Step 4: Run the focused tests**

Run: `bun test test/route.test.tsx test/package-metadata.test.ts`

Expected: PASS

### Task 5: Full verification

**Files:**

- Review: `src/_.ts`
- Review: `src/builder/_.ts`
- Review: `src/route/_.ts`
- Review: `package.json`
- Review: `README.md`

- [ ] **Step 1: Run the full unit suite**

Run: `bun run test:unit`

Expected: PASS

- [ ] **Step 2: Run the smoke suite**

Run: `bun run test:smoke`

Expected: PASS

- [ ] **Step 3: Run demo typecheck**

Run: `bun run typecheck`

Workdir: `demo/`

Expected: PASS

- [ ] **Step 4: Verify the entrypoint checklist**

Check:

- `src/index.ts` is absent
- `src/route/index.ts` is absent
- `src/_.ts`, `src/builder/_.ts`, and `src/route/_.ts` exist
- root package metadata points at `src/_.ts`
- route aggregate exports only public API
