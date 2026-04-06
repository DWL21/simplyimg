# Repository Guidelines

## Project Structure & Module Organization
`simplyimg` is a `pnpm` workspace with two apps and shared packages:

- `apps/web`: React 19 + Vite frontend in `src/`, static assets in `public/`.
- `apps/worker`: Cloudflare Worker API built with Hono; routes live in `src/routes`, shared server utilities in `src/lib`.
- `packages/img-processor`: Rust image engine compiled to WebAssembly.
- `packages/md-renderer`: Rust Markdown renderer compiled to WebAssembly.
- `docs/`: implementation notes and planning documents.

## Build, Test, and Development Commands
Install dependencies with `pnpm install`.

- `pnpm dev:web`: start the Vite frontend locally.
- `pnpm dev:worker`: run the Cloudflare Worker with Wrangler.
- `pnpm build:web`: type-check and build the frontend bundle.
- `pnpm build:worker`: validate the worker build with `wrangler deploy --dry-run`.
- `pnpm typecheck:web`: run all frontend TypeScript checks.
- `pnpm typecheck:worker`: run worker TypeScript checks.

There is no top-level `pnpm test` script yet; use the typecheck and build commands as the current verification baseline.

## Coding Style & Naming Conventions
Follow the existing style in each part of the monorepo:

- Frontend TypeScript uses ES modules, single quotes, semicolons, and PascalCase component files such as `ToolFlow.tsx`.
- Hooks and stores use camelCase names such as `useImageProcess` and `imageStore.ts`.
- Worker TypeScript currently uses double quotes and semicolons; match the file you are editing instead of reformatting unrelated code.
- Rust code uses standard 4-space indentation and `snake_case` function names.

Keep modules focused, prefer colocating feature-specific UI under `apps/web/src/components`, and avoid broad refactors in unrelated files.

## Testing Guidelines
Add tests alongside the feature when introducing non-trivial logic. Use descriptive names ending in `*.test.*` or `*.spec.*` so they are easy to discover later. Until a dedicated test runner is added, verify changes with the relevant `pnpm typecheck:*` and `pnpm build:*` commands.

## Commit & Pull Request Guidelines
Recent history follows Conventional Commit style, especially `feat:` messages such as `feat: add interactive resize crop editor`. Continue using concise prefixes like `feat:`, `fix:`, or `refactor:`.

Pull requests should include a short summary, note affected areas (`apps/web`, `apps/worker`, or `packages/*`), link the related issue when applicable, and include screenshots for visible UI changes.
