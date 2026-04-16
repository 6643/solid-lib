# Route Activation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dynamic `when`, multi-route activation, strict `/*` fallback rendering, and route-aware anchor interception to the SPA route module.

**Architecture:** Keep one shared runtime route registry in `src/route/state.ts`, extract reusable route matching helpers, and make both `Route` rendering and anchor interception query the same live activation rules. Preserve existing history and query parsing behavior.

**Tech Stack:** TypeScript, Solid 2 beta APIs, Bun test

---

### Task 1: Lock the new route behavior with failing tests

**Files:**
- Modify: `test/route.test.tsx`

- [ ] **Step 1: Write failing tests for `when` rendering**
Add tests that verify a route stays hidden when `when` is `false` and becomes visible when a reactive `when` accessor turns `true`.

- [ ] **Step 2: Write failing tests for multi-match and fallback**
Add tests that verify multiple exact routes render together, while `/*` renders only when no active exact route matches.

- [ ] **Step 3: Write failing tests for anchor interception**
Add tests that verify anchor clicks are intercepted only when the destination currently has an active exact route or an active fallback route, and that toggling `when` changes the result immediately.

- [ ] **Step 4: Run the focused route test file to verify RED**

Run: `bun test test/route.test.tsx`
Expected: FAIL with missing `when` support and incorrect click interception behavior.

### Task 2: Add shared route matching and registry helpers

**Files:**
- Modify: `src/route/state.ts`
- Create: `src/route/match.ts`
- Modify: `src/route/testing.ts`

- [ ] **Step 1: Add minimal route pattern helpers**
Implement helpers that distinguish exact routes from the global `/*` fallback.

- [ ] **Step 2: Add a live route registry**
Register mounted routes by `symbol`, store `path`, `fallback`, and an `isEnabled()` getter, and expose query helpers for exact/fallback activation.

- [ ] **Step 3: Extend test reset hooks**
Ensure route registry state is cleared by `resetRouteForTests()`.

- [ ] **Step 4: Run the focused route test file**

Run: `bun test test/route.test.tsx`
Expected: Still FAIL, but now only on `Route` rendering or click interception wiring.

### Task 3: Wire `Route` to the live activation rules

**Files:**
- Modify: `src/route/Route.tsx`

- [ ] **Step 1: Register each mounted route**
Register route entries during component setup and remove them on cleanup when an owner exists.

- [ ] **Step 2: Add dynamic `when` support**
Treat missing `when` as `true`, and read function-valued `when` lazily during each render.

- [ ] **Step 3: Enforce strict fallback rendering**
Render `/*` only when no active exact route currently matches the pathname.

- [ ] **Step 4: Run the focused route test file**

Run: `bun test test/route.test.tsx -t "Route"`
Expected: PASS for rendering cases.

### Task 4: Make anchor interception route-aware

**Files:**
- Modify: `src/route/navigation.ts`

- [ ] **Step 1: Replace same-origin-only interception**
After existing safety checks, query the live route registry for the destination pathname.

- [ ] **Step 2: Respect dynamic `when` and fallback**
Intercept when the destination has any active exact route, otherwise intercept only if an active fallback exists.

- [ ] **Step 3: Keep history behavior unchanged**
Preserve `pushRoute()`, `replaceRoute()`, and back-path metadata semantics.

- [ ] **Step 4: Run the focused route test file**

Run: `bun test test/route.test.tsx -t "anchor|navigation|Route"`
Expected: PASS

### Task 5: Final verification

**Files:**
- Review: `src/route/*.ts`
- Review: `src/route/*.tsx`
- Review: `test/route.test.tsx`

- [ ] **Step 1: Run the focused route suite**

Run: `bun test test/route.test.tsx`
Expected: PASS

- [ ] **Step 2: Run the full unit suite**

Run: `bun run test:unit`
Expected: PASS

- [ ] **Step 3: Run demo typecheck**

Run: `bun run typecheck`
Workdir: `demo/`
Expected: PASS

- [ ] **Step 4: Verify requirement checklist**
Check:

- dynamic `when` affects rendering and click interception immediately
- multiple exact routes can co-render
- `/*` only renders when no exact route matches
- links without any active target route are not intercepted
