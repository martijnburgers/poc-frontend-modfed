# poc-frontend-modfed

Proof-of-concept for a **React + Rspack + Module Federation** micro-frontend setup: a single **app shell** loads two independently-built **remote modules** at runtime.

```
┌──────────────────────────────┐
│   App Shell  (host, :3000)   │
│  ┌──────────────┐ ┌────────┐ │
│  │ ProductList  │ │  Cart  │ │     ← lazy-loaded at runtime
│  └──────▲───────┘ └────▲───┘ │
└─────────┼──────────────┼─────┘
          │ remoteEntry  │ remoteEntry
 ┌────────┴────────┐ ┌───┴─────────┐
 │ remote-products │ │ remote-cart │
 │      :3001      │ │    :3002    │
 └─────────────────┘ └─────────────┘
```

## What this POC demonstrates

- One React **host** dynamically loading two React **remotes** via Module Federation 2.0 (`@module-federation/enhanced`).
- **Physical isolation**: the shell and each remote are independent npm workspaces with their own `rspack.config.js`, `package.json`, and build output. They share nothing at build time.
- **Runtime sharing** of `react` and `react-dom` as singletons so only one React instance ever runs in the browser.
- **Cross-bundle React Context** via a shared `@poc-mf/contracts` workspace promoted to an MF runtime singleton: the shell provides a `UserContext` that *both* remotes consume with full reactivity.
- **Per-remote error isolation** in the shell: a crashed remote does not take the shell down.
- Each remote is **runnable standalone** on its own port for isolated development, and the same build produces the `remoteEntry.js` the shell consumes.

## Repository layout

```
apps/
  shell/                  # Host application (consumes remotes, owns UserProvider)
modules/
  remote-products/        # Remote #1, exposes ./ProductList (reads UserContext)
  remote-cart/            # Remote #2, exposes ./Cart (reads UserContext)
packages/
  contracts/              # Cross-bundle singletons (UserContext + types)
docs/
  architecture.md         # Detailed architecture notes
```

See `docs/architecture.md` for the in-depth explanation of how Module Federation wires everything together.

## Prerequisites

- Node.js ≥ 18.17
- npm ≥ 9 (for `workspaces` support)

## Quickstart

```sh
# from repo root
npm install

# run all three dev servers in parallel
npm run dev
```

Then open:

- Shell (host):   http://localhost:3000
- Products (dev): http://localhost:3001
- Cart (dev):     http://localhost:3002

The shell waits for the two remotes to come up before it can render them — that's why `npm run dev` starts the remotes first.

### Working on a single package

Each workspace is independently runnable:

```sh
npm run dev:shell       # host only (remotes must already be up, or you'll see the error panels)
npm run dev:products    # remote-products standalone at :3001
npm run dev:cart        # remote-cart standalone at :3002
```

### Production build

```sh
npm run build                 # builds all three
npm run build:shell           # individual
npm run build:products
npm run build:cart
```

Each package produces its own `dist/`. To run the built artifacts together behind static file servers:

```sh
npm run serve                 # serves shell on :3000 and both remotes on :3001/:3002
```

### Type-checking

```sh
npm run typecheck
```

## Sharing state across remotes

The shell provides a `UserContext` (defined in `packages/contracts`). Both remotes read it via the `useUser()` hook. Signing in from the shell header updates state in both remotes reactively because every bundle resolves `@poc-mf/contracts` to the **same** module instance at runtime.

The trick is MF's `shared` scope: every workspace declares `@poc-mf/contracts` as `{ singleton: true }`, so the MF runtime guarantees one physical `createContext()` call is reused everywhere. See `docs/architecture.md` for the rationale and common pitfalls.

To add another shared context, type, or hook, put it in `packages/contracts/src/` and export it from the barrel. No MF config changes needed.

## Adding another remote

1. Copy `modules/remote-cart/` to `modules/remote-<name>/`.
2. Update `name` in its `package.json` and `module-federation.config.js` (e.g. `remote_<name>`).
3. Pick a free port (e.g. `3003`) and update `rspack.config.js` and the `serve` script.
4. Expose your component via the `exposes` map.
5. In `apps/shell/module-federation.config.js`, add the new alias to `remotes`.
6. Add an ambient type declaration in `apps/shell/src/remotes.d.ts`.
7. Lazy-load it in `apps/shell/src/App.tsx`.
