# Demo Route Showcase Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `demo/` into a small SPA route showcase that demonstrates the new route APIs in realistic example pages.

**Architecture:** Keep the demo as a single entry app in `demo/src/_.tsx`, split each route example into a small focused component, and use one shared CSS Module for layout and navigation. Demonstrate route behavior through plain links and imperative buttons rather than extra abstractions.

**Tech Stack:** TypeScript, Solid 2 beta, solid-lib route module, CSS Modules

---

### Task 1: Add demo shell and route page components

**Files:**
- Create: `demo/src/RouteShowcase.tsx`
- Create: `demo/src/RouteShowcase.module.css`
- Create: `demo/src/routes/HomeRoute.tsx`
- Create: `demo/src/routes/SearchRoute.tsx`
- Create: `demo/src/routes/HistoryRoute.tsx`
- Create: `demo/src/routes/LazyRoute.tsx`
- Modify: `demo/src/_.tsx`

- [ ] **Step 1: Define the route page structure**
- [ ] **Step 2: Replace the current single-page demo entry**
- [ ] **Step 3: Add route-specific content and navigation**
- [ ] **Step 4: Keep the layout readable on desktop and mobile**

### Task 2: Demonstrate route APIs

**Files:**
- Modify: `demo/src/RouteShowcase.tsx`
- Modify: `demo/src/routes/SearchRoute.tsx`
- Modify: `demo/src/routes/HistoryRoute.tsx`
- Modify: `demo/src/routes/LazyRoute.tsx`

- [ ] **Step 1: Wire `<Route />` declarations for each path**
- [ ] **Step 2: Show `parseParams()` output on `/search`**
- [ ] **Step 3: Show `pushRoute()` / `replaceRoute()` / `getRouteBackPath()` on `/history`**
- [ ] **Step 4: Show a `lazy()` page wrapped by `Loading` on `/lazy`**

### Task 3: Update demo documentation and verification

**Files:**
- Modify: `demo/README.md`

- [ ] **Step 1: Document the new route examples**
- [ ] **Step 2: Run `bun run typecheck` in `demo/`**
- [ ] **Step 3: Run `bun run build` in `demo/`**
- [ ] **Step 4: Report any manual verification gaps**
