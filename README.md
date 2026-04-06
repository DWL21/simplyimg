<p align="center">
  <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNjAgMTYwIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iZmF2aWNvbkdyYWRpZW50IiB4MT0iMjQiIHkxPSIyMCIgeDI9IjEzNCIgeTI9IjE0MCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZjk3MzE2IiAvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMxZjdhNWYiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8cmVjdCB4PSIyMCIgeT0iMjAiIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiByeD0iMzIiIGZpbGw9IiNmZmZhZjIiIHN0cm9rZT0icmdiYSgyNSwxOCw4LDAuMSkiIC8+CiAgPHBhdGgKICAgIGQ9Ik00OCAxMDIgNzAgODBsMTYgMTYgMjYtMzQiCiAgICBmaWxsPSJub25lIgogICAgc3Ryb2tlPSJ1cmwoI2Zhdmljb25HcmFkaWVudCkiCiAgICBzdHJva2Utd2lkdGg9IjEyIgogICAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogICAgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIKICAvPgogIDxjaXJjbGUgY3g9IjU2IiBjeT0iNTYiIHI9IjEwIiBmaWxsPSIjZjU5ZTBiIiAvPgogIDxwYXRoCiAgICBkPSJNMTAyIDQ2aDE2TTExMCAzOHYxNiIKICAgIGZpbGw9Im5vbmUiCiAgICBzdHJva2U9IiMxZjdhNWYiCiAgICBzdHJva2Utd2lkdGg9IjgiCiAgICBzdHJva2UtbGluZWNhcD0icm91bmQiCiAgLz4KPC9zdmc+Cg==" width="80" height="80" alt="simplyimg" />
</p>

<h1 align="center">simplyimg</h1>

<p align="center">
  <a href="https://simplyimg.com">simplyimg.com</a>
</p>

<p align="center">
  A browser-first image and document processing tool — no uploads, no accounts, no waiting.
</p>

---

## What it does

simplyimg runs image processing directly in your browser using WebAssembly. Your files never leave your device. A Cloudflare Worker API serves as a fallback for browsers that lack full canvas support, and handles formats like GIF that require the Rust pipeline.

**Image tools**

| Tool | What it does |
|---|---|
| Compress | Reduce file size while preserving quality |
| Resize | Scale images to exact dimensions |
| Convert | Change format (JPEG, PNG, WebP, GIF, …) |
| Rotate | Rotate by 90° steps |
| Flip | Mirror horizontally or vertically |
| Crop | Trim to a custom region |

**Document tools**

| Tool | What it does |
|---|---|
| Markdown → PDF | Render `.md` files as paginated A4 PDFs with optional header/footer |

## How it works

```
Browser upload
     │
     ▼
wasmClient.process()          — tries browser path first
     ├─ OffscreenCanvas path  — native Canvas API, no Rust needed
     └─ fallback              — POST to api.simplyimg.com (Rust/WASM on Cloudflare Worker)
```

The Markdown → PDF tool renders entirely in-browser: a Rust WASM renderer converts Markdown to HTML, a JavaScript pagination engine splits the output into A4 pages, and `jspdf` + `html2canvas` produce the downloadable PDF.

## Stack

- **Frontend** — React 19, Vite, Zustand, TypeScript
- **Image engine** — Rust compiled to WebAssembly (`packages/img-processor`)
- **Markdown engine** — Rust compiled to WebAssembly (`packages/md-renderer`)
- **API** — Cloudflare Worker with Hono (`apps/worker`)
- **Hosting** — Cloudflare Pages (frontend) · Cloudflare Workers (API)

## Local development

```bash
pnpm install

pnpm dev:web      # http://localhost:5173
pnpm dev:worker   # http://localhost:8787
```

Build:

```bash
pnpm build:web     # type-check + Vite bundle
pnpm build:worker  # wrangler dry-run
```

To rebuild the WASM packages after editing Rust source:

```bash
# in packages/img-processor or packages/md-renderer
wasm-pack build --target bundler
```

## License

Copyright (c) 2025 DWL21. All rights reserved.

This software is proprietary. Use, copying, modification, and distribution are strictly prohibited without prior written permission from the copyright holder.
