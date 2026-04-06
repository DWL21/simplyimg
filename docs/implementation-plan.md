# SimplyImg 구현 계획

iloveimg과 같은 온라인 이미지 편집 웹서비스.
클라이언트 우선 처리(WASM), 서버리스 백엔드(Cloudflare Worker)로 설계.

---

## 목차

1. [기술 스택](#1-기술-스택)
2. [아키텍처](#2-아키텍처)
3. [프로젝트 구조](#3-프로젝트-구조)
4. [패키지: img-processor (Rust WASM)](#4-패키지-img-processor-rust-wasm)
5. [앱: worker (Cloudflare Worker)](#5-앱-worker-cloudflare-worker)
6. [앱: web (React + Cloudflare Pages)](#6-앱-web-react--cloudflare-pages)
7. [처리 파이프라인](#7-처리-파이프라인)
8. [API 명세](#8-api-명세)
9. [배포 구성](#9-배포-구성)
10. [구현 순서](#10-구현-순서)

---

## 1. 기술 스택

### 공유 패키지

| 역할 | 기술 | 이유 |
|------|------|------|
| 이미지 처리 엔진 | **Rust → WASM** | 고성능, 메모리 안전, Workers 1MB 제한 대응 가능 |
| 이미지 크레이트 | `image` (Rust) | JPEG/PNG/WebP/GIF 디코딩·인코딩 통합 지원 |
| WASM 빌드 | `wasm-pack` | JS 바인딩 자동 생성, bundler 타겟 지원 |

### 백엔드 (Worker)

| 역할 | 기술 |
|------|------|
| 런타임 | Cloudflare Workers |
| 프레임워크 | Hono.js |
| 언어 | TypeScript |
| 로컬 개발 | Wrangler (로컬 Worker 에뮬레이션) |

### 프론트엔드 (Web)

| 역할 | 기술 | 이유 |
|------|------|------|
| 프레임워크 | React 19 + Vite | 빠른 빌드, Cloudflare Pages 최적 |
| 라우팅 | React Router v7 | SPA 클라이언트 라우팅 |
| 스타일 | Tailwind CSS v4 | 경량 유틸리티 퍼스트 |
| UI 컴포넌트 | shadcn/ui (Radix 기반) | 접근성 보장된 headless 컴포넌트 |
| 상태 관리 | Zustand | 전역 이미지 상태, Redux 대비 간결 |
| 이미지 처리 | Canvas API + WASM | 서버 요청 없이 클라이언트 처리 |
| 배포 | Cloudflare Pages | Worker와 동일 네트워크, 무료 플랜 |

---

## 2. 아키텍처

```
사용자 브라우저
    │
    ├─ [정적 파일] Cloudflare Pages CDN
    │       React SPA (HTML/CSS/JS)
    │
    ├─ [이미지 처리 - 우선]
    │       Web Worker 스레드
    │       └─ img-processor.wasm (Rust WASM)
    │           zero network, UI 블로킹 없음
    │
    └─ [이미지 처리 - fallback]
            Cloudflare Worker (서버리스)
            └─ img-processor.wasm (동일 모듈)
                multipart 업로드 → binary 응답
```

### 처리 우선순위

```
클라이언트 WASM (브라우저 Web Worker)
    └─ 실패 시 → Cloudflare Worker WASM
```

대부분의 연산(compress/resize/rotate/flip/crop/convert)은 클라이언트에서 처리.
Worker는 클라이언트가 처리 불가한 경우 및 배치 처리 fallback.

---

## 3. 프로젝트 구조

```
simplyimg/
├── package.json                  # pnpm workspaces 루트
├── pnpm-workspace.yaml
├── docs/
│   └── implementation-plan.md   # 이 문서
│
├── packages/
│   └── img-processor/            # Rust → WASM 공유 패키지
│       ├── src/
│       │   └── lib.rs
│       ├── Cargo.toml
│       └── pkg/                  # wasm-pack 빌드 출력
│
└── apps/
    ├── worker/                   # Cloudflare Worker
    │   ├── src/
    │   │   ├── index.ts
    │   │   └── routes/
    │   │       ├── compress.ts
    │   │       ├── resize.ts
    │   │       ├── convert.ts
    │   │       ├── rotate.ts
    │   │       ├── flip.ts
    │   │       └── crop.ts
    │   ├── wrangler.toml
    │   ├── tsconfig.json
    │   └── package.json
    │
    └── web/                      # React + Vite
        ├── src/
        │   ├── main.tsx
        │   ├── App.tsx
        │   ├── pages/
        │   │   ├── Home.tsx
        │   │   ├── Compress.tsx
        │   │   ├── Resize.tsx
        │   │   ├── Convert.tsx
        │   │   ├── Rotate.tsx
        │   │   ├── Crop.tsx
        │   │   └── Flip.tsx
        │   ├── components/
        │   │   ├── layout/
        │   │   │   ├── Header.tsx
        │   │   │   ├── Footer.tsx
        │   │   │   └── ToolCard.tsx
        │   │   ├── upload/
        │   │   │   ├── DropZone.tsx
        │   │   │   └── FileList.tsx
        │   │   ├── editor/
        │   │   │   ├── ImagePreview.tsx
        │   │   │   ├── CropCanvas.tsx
        │   │   │   └── ProgressBar.tsx
        │   │   └── download/
        │   │       └── DownloadPanel.tsx
        │   ├── hooks/
        │   │   ├── useWasm.ts
        │   │   ├── useImageProcess.ts
        │   │   └── useDropZone.ts
        │   ├── store/
        │   │   └── imageStore.ts
        │   ├── lib/
        │   │   ├── wasmClient.ts
        │   │   ├── workerClient.ts
        │   │   ├── canvasUtils.ts
        │   │   └── formatUtils.ts
        │   └── types/
        │       └── image.ts
        ├── public/
        ├── index.html
        ├── vite.config.ts
        └── package.json
```

---

## 4. 패키지: img-processor (Rust WASM)

### 공개 함수

| 함수 | 시그니처 | 설명 |
|------|----------|------|
| `get_info` | `(data: &[u8]) -> JsValue` | width, height, format JSON 반환 |
| `compress` | `(data: &[u8], format: &str, quality: u8) -> Vec<u8>` | 품질 기반 압축 |
| `resize` | `(data: &[u8], width: u32, height: u32, fit: &str) -> Vec<u8>` | 리사이즈 |
| `convert` | `(data: &[u8], to_format: &str, quality: u8) -> Vec<u8>` | 포맷 변환 |
| `rotate` | `(data: &[u8], degrees: u32) -> Vec<u8>` | 90/180/270도 회전 |
| `flip` | `(data: &[u8], horizontal: bool) -> Vec<u8>` | 좌우/상하 반전 |
| `crop` | `(data: &[u8], x: u32, y: u32, w: u32, h: u32) -> Vec<u8>` | 영역 잘라내기 |

### resize `fit` 모드

| 값 | 동작 |
|----|------|
| `contain` | 비율 유지, 지정 크기 내에 맞춤 (기본) |
| `cover` | 비율 유지, 지정 크기를 꽉 채움 (넘치는 부분 잘림) |
| `exact` | 비율 무시, 지정 크기 그대로 |

### Cargo.toml 핵심 설정

```toml
[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2"
image = { version = "0.25", default-features = false, features = [
    "jpeg", "png", "webp", "gif"
] }
serde = { version = "1", features = ["derive"] }
serde-wasm-bindgen = "0.6"

[profile.release]
opt-level = "z"      # 크기 최소화 (Workers 1MB 제한)
lto = true
```

### 빌드 명령

```bash
# packages/img-processor/
wasm-pack build --target bundler --out-dir pkg
```

---

## 5. 앱: worker (Cloudflare Worker)

### 역할

- 브라우저가 WASM 처리에 실패한 경우 fallback
- 서버 측에서 동일한 Rust WASM 모듈로 이미지 처리
- CORS 처리 및 파일 크기 제한 적용

### 라우트 구조

```typescript
// src/index.ts (Hono)
app.get('/health', ...)

app.post('/api/info',     routes.info)
app.post('/api/compress', routes.compress)
app.post('/api/resize',   routes.resize)
app.post('/api/convert',  routes.convert)
app.post('/api/rotate',   routes.rotate)
app.post('/api/flip',     routes.flip)
app.post('/api/crop',     routes.crop)
```

### 요청/응답 형식

**요청**: `multipart/form-data`

| 필드 | 타입 | 설명 |
|------|------|------|
| `file` | File | 원본 이미지 (최대 10MB) |
| `options` | JSON string | 도구별 옵션 (아래 참고) |

**성공 응답**: 처리된 이미지 binary
```
Content-Type: image/jpeg (처리 결과에 따라)
Content-Disposition: attachment; filename="result.jpg"
X-Original-Size: 102400
X-Result-Size: 51200
```

**오류 응답**: JSON
```json
{ "error": "오류 메시지", "code": "INVALID_FORMAT" }
```

### wrangler.toml

```toml
name = "simplyimg-worker"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[wasm_modules]
IMG_PROCESSOR = "../../packages/img-processor/pkg/img_processor_bg.wasm"
```

---

## 6. 앱: web (React + Cloudflare Pages)

### 페이지 라우팅

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/` | Home | 기능 카드 그리드 |
| `/compress` | Compress | JPEG/PNG/WebP 압축 |
| `/resize` | Resize | 이미지 크기 변경 |
| `/convert` | Convert | 포맷 변환 |
| `/rotate` | Rotate | 회전 + 반전 |
| `/crop` | Crop | 자르기 |
| `/flip` | Flip | 좌우/상하 반전 |

### 공통 편집 플로우

```
[1] 파일 업로드      [2] 옵션 설정         [3] 처리 + 다운로드
DropZone         →  도구별 컨트롤 패널  →  before/after 미리보기
다중 파일 지원       슬라이더/입력/버튼      개별/전체 ZIP 다운로드
```

### 도구별 컨트롤 UI

| 페이지 | 컨트롤 |
|--------|--------|
| Compress | 품질 슬라이더 (0–100), 예상 용량 표시 |
| Resize | 너비/높이 입력, 비율 잠금 토글, fit 모드 선택 |
| Convert | 출력 포맷 선택 (JPG/PNG/WebP/GIF), 품질 슬라이더 |
| Rotate | 90°/180°/270° 버튼 |
| Flip | 수평/수직 버튼 |
| Crop | Canvas 위 드래그 영역 선택, 비율 프리셋 (1:1, 16:9 등) |

### 상태 관리 (Zustand)

```typescript
interface ImageStore {
  files: UploadedFile[]        // 업로드된 원본 파일
  results: ProcessedResult[]   // 처리 결과 (Blob URL)
  isProcessing: boolean
  progress: number             // 배치 진행률 (0–100)

  addFiles(files: File[]): void
  processAll(tool: ToolName, options: ToolOptions): Promise<void>
  downloadSingle(index: number): void
  downloadAll(): void          // JSZip으로 ZIP 묶어서 다운로드
  reset(): void
}
```

### WASM 클라이언트 (Web Worker 연동)

```typescript
// lib/wasmClient.ts
// WASM을 Web Worker 스레드에서 실행 → UI 블로킹 없음
// ArrayBuffer transferable로 zero-copy 전달

const wasmWorker = new Worker('/wasm.worker.ts', { type: 'module' })

export function processImage(
  op: Operation,
  buffer: ArrayBuffer,
  options: ToolOptions
): Promise<ArrayBuffer>
```

---

## 7. 처리 파이프라인

```
사용자가 파일 업로드 + 옵션 설정 후 "처리 시작" 클릭
          │
          ▼
  useImageProcess.ts
          │
          ├─ wasmClient.isReady?
          │       │
          │      YES ──► Web Worker 스레드에서 WASM 실행
          │                    │
          │                   성공 ──► Blob URL 생성 → 미리보기 + 다운로드 준비
          │                    │
          │                  실패
          │                    │
          └──────────────────► NO
                               │
                        workerClient.post('/api/{tool}', formData)
                               │
                        Cloudflare Worker WASM 처리
                               │
                        binary 응답 → Blob URL 생성
```

---

## 8. API 명세

### POST `/api/compress`

```json
// options (JSON string)
{
  "quality": 80,           // 0–100
  "format": "jpeg"         // "jpeg" | "png" | "webp" (생략 시 원본 포맷 유지)
}
```

### POST `/api/resize`

```json
{
  "width": 1920,
  "height": 1080,
  "fit": "contain"         // "contain" | "cover" | "exact"
}
```

### POST `/api/convert`

```json
{
  "to": "webp",            // "jpeg" | "png" | "webp" | "gif"
  "quality": 85
}
```

### POST `/api/rotate`

```json
{
  "degrees": 90            // 90 | 180 | 270
}
```

### POST `/api/flip`

```json
{
  "horizontal": true       // true = 좌우, false = 상하
}
```

### POST `/api/crop`

```json
{
  "x": 100,
  "y": 100,
  "width": 800,
  "height": 600
}
```

### GET `/api/info` 응답

```json
{
  "width": 1920,
  "height": 1080,
  "format": "jpeg",
  "size": 204800
}
```

---

## 9. 배포 구성

### Cloudflare Worker

```bash
# 로컬 개발
wrangler dev

# 배포
wrangler deploy
# 엔드포인트: https://simplyimg-worker.{account}.workers.dev
```

### Cloudflare Pages

```bash
# 로컬 개발
pnpm --filter web dev

# 빌드
pnpm --filter web build   # → apps/web/dist/

# 배포 (GitHub 연동 자동 배포 또는 수동)
wrangler pages deploy apps/web/dist --project-name simplyimg
```

### 환경 변수

```bash
# apps/web/.env.local (로컬)
VITE_WORKER_URL=http://localhost:8787

# Cloudflare Pages 환경 변수 (프로덕션)
VITE_WORKER_URL=https://simplyimg-worker.{account}.workers.dev
```

---

## 10. 구현 순서

### Phase 1 — 백엔드 기반 (현재)

- [ ] 모노레포 셋업 (`pnpm workspaces`, 루트 `package.json`)
- [ ] `packages/img-processor` Rust WASM 작성 + `wasm-pack build`
- [ ] `apps/worker` Hono 라우터 + WASM 바인딩
- [ ] 로컬 `wrangler dev`로 API 동작 확인

### Phase 2 — 프론트엔드 기반

- [ ] `apps/web` Vite + React + Tailwind + shadcn 셋업
- [ ] DropZone, ImagePreview, DownloadPanel 공통 컴포넌트
- [ ] WASM 클라이언트 + Web Worker 연동 (`useWasm`, `useImageProcess`)
- [ ] Zustand 스토어 구성

### Phase 3 — 도구 페이지

- [ ] Home 페이지 (기능 카드 그리드)
- [ ] Compress 페이지
- [ ] Resize 페이지
- [ ] Convert 페이지
- [ ] Rotate / Flip 페이지
- [ ] Crop 페이지 (Canvas 드래그 UI)

### Phase 4 — 마무리

- [ ] 배치 처리 (다중 파일 ZIP 다운로드)
- [ ] 반응형 디자인 (모바일 대응)
- [ ] Cloudflare Pages + Worker 프로덕션 배포
