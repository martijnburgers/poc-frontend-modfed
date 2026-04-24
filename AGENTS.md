# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project

React 19 + Rspack + Module Federation 2.0 POC. One **host** (`apps/shell`) lazy-loads two **remotes** (`modules/remote-products`, `modules/remote-cart`) at runtime. A fourth workspace, `packages/contracts` (`@poc-mf/contracts`), is promoted to a runtime singleton so the shell and both remotes share the same `UserContext` instance (cross-bundle React Context). See `docs/architecture.md` for the architectural rationale; see `README.md` for user-facing quickstart.

## Stack

- **React 19** (`react` / `react-dom` pinned at `^19.2.0`, types at `^19.2.0`) — shared as singletons across the shell and both remotes.
- **Rspack 1.x** (`@rspack/core`, `@rspack/cli`) using the built-in SWC loader (`builtin:swc-loader`) and native CSS (`experiments.css: true`). No Babel.
- **Module Federation 2.0** via `@module-federation/enhanced/rspack`. The plugin also emits `mf-manifest.json` / `mf-stats.json` and (for remotes) `@mf-types.zip` during build.
- **HMR**: `@rspack/plugin-react-refresh` + `react-refresh@^0.14.2` (works unchanged with React 19).
- **Workspaces**: npm workspaces. Cross-package dev orchestration via `concurrently`.
- **TypeScript 5.5+** with `jsx: "react-jsx"` from a shared `tsconfig.base.json` at the repo root.

## Common commands

All commands are run from the repository root unless stated otherwise.

```sh
npm install                         # install all workspaces
npm run dev                         # start shell (:3000) + both remotes (:3001, :3002) concurrently
npm run dev:shell                   # host only
npm run dev:products                # remote-products only
npm run dev:cart                    # remote-cart only
npm run build                       # build all workspaces
npm run build:shell                 # build one workspace
npm run serve                       # serve prebuilt dist/ folders
npm run typecheck                   # tsc --noEmit across workspaces
npm run clean                       # delete all dist/ folders
```

Ports are **load-bearing** — they are baked into the shell's `module-federation.config.js` and into per-workspace `serve` scripts. Do not change a port without updating both sides.

## Architecture at a glance

- **Workspace layout.** npm workspaces. Hosts live under `apps/*`, remotes under `modules/*`, shared internal libs under `packages/*`. Each federated package is fully self-contained (its own `rspack.config.js`, `module-federation.config.js`, `tsconfig.json`, `package.json`).
- **Federation plugin.** All three federated packages use `ModuleFederationPlugin` from `@module-federation/enhanced/rspack` (MF 2.0), **not** the plugin exported by `@rspack/core`.
- **Shared scope.** `react` and `react-dom` (19.x) are declared as `singleton: true` in every MF config with `requiredVersion` pulled from that workspace's `package.json`. The shell additionally sets `eager: true` for those two because it boots first. All three packages **must** stay on the same major of React — a mismatch will surface at runtime as a shared-module version rejection.
- **Cross-bundle React Context.** `@poc-mf/contracts` (in `packages/contracts`) holds the single `createContext()` call for `UserContext`, plus the `UserProvider` component and the `useUser()` hook. It is added to `shared` in every MF config with `singleton: true`, `requiredVersion: false`, and (shell only) `eager: true`. This is what makes the context object have identical identity in all three bundles. Never create new React contexts inside `apps/shell/src` or a remote's `src` — always put them in `packages/contracts` and re-export through its barrel.
- **Workspace TS source sharing.** `packages/contracts/package.json` sets `main`/`types` to `src/index.ts`. Rspack follows the workspace symlink to the real path under `packages/contracts/src/` (outside `node_modules/`), so `builtin:swc-loader` compiles it transparently. Do not change the MF `exclude` rule or you'll break this.
- **Entry indirection.** Every package has `src/index.ts` whose only job is `import('./bootstrap')`. This async boundary is required for MF to initialise the shared scope before React is touched. Never put `createRoot(...)` directly in `index.ts`.
- **Consumer API.** In the shell, federated imports look like `import('remote_products/ProductList')`. The left side of the slash is the alias in the shell's `remotes` map; the right side is the key in the remote's `exposes` map. These are virtual specifiers, not file paths.
- **Type declarations for remotes.** Ambient types for federated modules are hand-written in `apps/shell/src/remotes.d.ts`. When you expose a new component from a remote, add a matching `declare module` there too.
- **Error isolation.** The shell wraps every remote in a `Suspense` + `RemoteErrorBoundary` pair (see `apps/shell/src/App.tsx`). A failed remote must not crash the shell — preserve that pattern when adding new remotes.
- **CORS.** Each remote's dev server sends `Access-Control-Allow-Origin: *`. The `serve` scripts include `--cors` for the same reason. Don't strip these.
- **Lazy compilation is OFF.** Every `rspack.config.js` sets `experiments.lazyCompilation: false`. Leave it that way. Rspack's lazy compilation feature wraps dynamic `import()` targets in `*!lazy-compilation-proxy` modules; those proxies collide with MF 2.0's per-container HMR registry and throw `Cannot set properties of undefined (setting './src/bootstrap.tsx!lazy-compilation-proxy')` during the first hot update. Disabling it costs a hair of dev-startup time and nothing in production.

## Dev server gotchas

- **Start remotes before the shell.** The shell's imports resolve the first time `<ProductList>` / `<Cart>` renders; if the corresponding remote isn't up on :3001 / :3002 yet, the `RemoteErrorBoundary` will show a red panel until you reload. The `npm run dev` script starts the remotes first for this reason.
- **HMR scope.** React Refresh runs per container. Editing a file in `modules/remote-cart/src/` hot-reloads only the cart bundle; the shell and products bundles keep their state. Editing a file in `packages/contracts/src/` forces a full reload of every container that re-imports it.
- **Port conflicts.** 3000/3001/3002 are baked into `apps/shell/module-federation.config.js` and each workspace's `serve` script. Change all of them together or MF will try to fetch a remote URL that doesn't exist.

## Conventions

- TypeScript everywhere. React 19 with `jsx: "react-jsx"` — never add `import React from 'react'`; import named hooks/types directly (`import { useState, type ReactNode } from 'react'`).
- React 19 uses `react-dom/client` for `createRoot(...)`. Do not import the legacy `react-dom` `render` API — it was removed.
- One default export per exposed module, named to match the exposed key (`./ProductList` → `export default function ProductList`). MF 2.0 accepts named exports too, but the shell's ambient types assume default exports.
- Remote package `name` fields in `module-federation.config.js` use `snake_case` (`remote_products`); directory names use `kebab-case` (`remote-products`). npm workspace names use the `@poc-mf/` scope.
- Each remote must stay runnable standalone (its own `index.html` + `bootstrap.tsx`). Don't make a remote depend on the shell being present. Standalone `bootstrap.tsx` files wrap their component in `<UserProvider>` with a dev user so `useUser()` has a context to connect to; the shell supplies the real provider in production.

## Files a future agent most often needs

- `apps/shell/src/App.tsx` — where remotes get lazy-loaded and composed, and where `<UserProvider>` wraps everything.
- `apps/shell/module-federation.config.js` — registry of remote URLs; also declares `@poc-mf/contracts` as an eager singleton.
- `apps/shell/src/remotes.d.ts` — TypeScript contract for federated imports.
- `modules/<remote>/module-federation.config.js` — what that remote exposes; declares `@poc-mf/contracts` as a non-eager singleton.
- `modules/<remote>/src/<Exposed>.tsx` — the component itself; reads shared state via `useUser()`.
- `packages/contracts/src/UserContext.tsx` — the only place cross-bundle React contexts should be defined.
- `docs/architecture.md` — why the code is shaped this way (section 7 covers cross-bundle React Context).

## When adding a new remote

Follow the step list in `README.md` (section "Adding another remote"). The two steps most commonly missed are: (1) adding the ambient type in `apps/shell/src/remotes.d.ts`, and (2) adding `dev:<name>` / `build:<name>` / `serve:<name>` entries in the root `package.json`.

## Validate before declaring done

After any non-trivial change, run these from the repo root:

```sh
npm run typecheck                   # must be clean across all 4 workspaces
NODE_ENV=production npm run build   # all 3 federated packages must compile
```

For federation-specific changes, additionally check that `dist/mf-manifest.json` for each federated workspace lists the shared modules you expect (`react`, `react-dom`, `@poc-mf/contracts`) and that each remote emits a `remoteEntry.js`. A successful `npm run build` whose manifests look wrong will still fail at runtime.
