# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Root (monorepo)
```bash
pnpm dev:web        # Start web frontend (localhost:5173)
pnpm dev:worker     # Start Cloudflare Worker locally (localhost:8787)
pnpm build:web      # Type-check + Vite build for web
pnpm build:worker   # Dry-run wrangler deploy (type-check)
pnpm typecheck:web
pnpm typecheck:worker
```

### Web app (`apps/web`)
```bash
pnpm --filter web dev
pnpm --filter web build    # runs tsc for 3 tsconfigs + vite build
pnpm --filter web typecheck
```

### Worker (`apps/worker`)
```bash
pnpm --filter worker dev     # wrangler dev
pnpm --filter worker deploy  # wrangler deploy → deploys to api.simplyimg.com
```

### WASM package (`packages/img-processor`)
```bash
wasm-pack build --target bundler   # Rebuilds pkg/ from Rust source
```
The compiled `pkg/` is committed; only rebuild when `src/lib.rs` changes.

## Architecture

### Processing pipeline (browser-first, Worker fallback)

```
User uploads image
      │
      ▼
wasmClient.process()   [apps/web/src/lib/wasmClient.ts]
      │
      ├─ if browser supports OffscreenCanvas+createImageBitmap
      │       └─ postToBrowserWorker() → wasm.worker.ts
      │               └─ OffscreenCanvas 2D API (no Rust/WASM used here)
      │
      └─ fallback: postToWorker()    [apps/web/src/lib/workerClient.ts]
              └─ POST https://api.simplyimg.com/api/<tool>
                      └─ Cloudflare Worker (Hono)
                              └─ img-processor WASM (Rust)
```

- **Browser Worker** (`apps/web/src/workers/wasm.worker.ts`): uses native browser Canvas APIs (no Rust). GIF conversion is not supported here and always falls through to the remote Worker.
- **Cloudflare Worker** (`apps/web`): runs the compiled Rust WASM via `packages/img-processor/pkg/`. Full format support including GIF.

### State management

`imageStore` (Zustand, `apps/web/src/store/imageStore.ts`) is the single source of truth:
- `files[]` — uploaded images with preview blob URLs
- `results[]` — processed output with object URLs
- `processAll(tool, options)` — iterates files, calls `wasmClient.process()`, stores results
- Download: single file or all-as-ZIP via JSZip

Pages call `useImageProcess()` hook → `imageStore.processAll()`.

### Worker API (`apps/worker`)

Hono app at `src/index.ts`. Each tool is a separate route file in `src/routes/`. All routes share the same `ImageProcessor` instance created by `createImageProcessor()` which lazily initialises the WASM module once.

Endpoints: `POST /api/{compress,resize,convert,rotate,flip,crop}` — multipart `file` + JSON `options` field.

### Deployment

- **Frontend**: Cloudflare Pages (`simplyimg` project) → `simplyimg.com`
- **Worker**: Cloudflare Worker (`simplyimg-worker`) → `api.simplyimg.com/*`
  - Route is declared in `apps/worker/wrangler.toml`; `wrangler deploy` registers the route automatically.
- `VITE_WORKER_URL` env var overrides the Worker base URL (default `http://localhost:8787` for local dev).

### Type sharing

`apps/web/src/types/image.ts` defines all shared types (`ToolName`, `ToolOptions`, `*Options`). The Worker has its own parallel types in `apps/worker/src/lib/types.ts` — they are structurally equivalent but not imported from a shared package.
