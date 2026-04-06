import koreanRegularWoff2Url from '@fontsource/noto-sans-kr/files/noto-sans-kr-korean-400-normal.woff2?url';
import koreanBoldWoff2Url from '@fontsource/noto-sans-kr/files/noto-sans-kr-korean-700-normal.woff2?url';
import latinRegularWoff2Url from '@fontsource/noto-sans-kr/files/noto-sans-kr-latin-400-normal.woff2?url';
import latinBoldWoff2Url from '@fontsource/noto-sans-kr/files/noto-sans-kr-latin-700-normal.woff2?url';
import initMarkdownRenderer, {
  render_markdown as renderMarkdown,
} from '../../../../packages/md-renderer/pkg/md_renderer.js';
import markdownWasmUrl from '../../../../packages/md-renderer/pkg/md_renderer_bg.wasm?url';

let ready: Promise<unknown> | null = null;

function ensureRenderer() {
  if (!ready) {
    ready = initMarkdownRenderer(markdownWasmUrl);
  }
  return ready;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function documentStyles() {
  return `
    @font-face {
      font-family: "Preview Noto Sans KR";
      font-style: normal;
      font-weight: 400;
      font-display: swap;
      src:
        url("${latinRegularWoff2Url}") format("woff2"),
        url("${koreanRegularWoff2Url}") format("woff2");
    }
    @font-face {
      font-family: "Preview Noto Sans KR";
      font-style: normal;
      font-weight: 700;
      font-display: swap;
      src:
        url("${latinBoldWoff2Url}") format("woff2"),
        url("${koreanBoldWoff2Url}") format("woff2");
    }

    :root {
      color-scheme: light;
      --page-width: 210mm;
      --page-padding-x: 18mm;
      --page-padding-y: 18mm;
      --text: #1b1814;
      --muted: #6f675d;
      --line: rgba(60, 40, 10, 0.12);
      --accent: #165a46;
      --code-bg: #f5f0e8;
      --quote-bg: #eef5f1;
      --table-head: #eef5f1;
      --shadow: 0 18px 42px rgba(40, 28, 10, 0.12);
      font-family: "Preview Noto Sans KR", system-ui, sans-serif;
    }

    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #ece6db; color: var(--text); }
    body.preview {
      padding: 24px;
      font-family: "Preview Noto Sans KR", system-ui, sans-serif;
    }
    body.print {
      background: white;
      font-family: "Preview Noto Sans KR", system-ui, sans-serif;
    }
    .page {
      width: min(var(--page-width), 100%);
      margin: 0 auto;
      background: white;
      box-shadow: var(--shadow);
      padding: var(--page-padding-y) var(--page-padding-x);
      overflow: hidden;
    }
    .doc-header {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 22px;
      padding-bottom: 18px;
      border-bottom: 1px solid var(--line);
    }
    .doc-kicker {
      font-size: 11px;
      font-weight: 700;
      color: var(--muted);
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .doc-title {
      margin: 0;
      font-size: 34px;
      line-height: 1.08;
      letter-spacing: -0.04em;
    }
    .doc-name {
      font-size: 13px;
      color: var(--muted);
    }
    .doc-body {
      font-size: 15px;
      line-height: 1.72;
      word-break: break-word;
    }
    .doc-body > :first-child { margin-top: 0; }
    .doc-body > :last-child { margin-bottom: 0; }
    .doc-body h1,
    .doc-body h2,
    .doc-body h3,
    .doc-body h4,
    .doc-body h5,
    .doc-body h6 {
      margin: 1.5em 0 0.55em;
      line-height: 1.18;
      letter-spacing: -0.03em;
      color: var(--accent);
    }
    .doc-body h1 { font-size: 30px; }
    .doc-body h2 { font-size: 24px; }
    .doc-body h3 { font-size: 20px; }
    .doc-body p,
    .doc-body ul,
    .doc-body ol,
    .doc-body pre,
    .doc-body blockquote,
    .doc-body table {
      margin: 0 0 1.05em;
    }
    .doc-body a {
      color: var(--accent);
      text-decoration: none;
    }
    .doc-body hr {
      border: 0;
      border-top: 1px solid var(--line);
      margin: 28px 0;
    }
    .doc-body code {
      font-family: "Preview Noto Sans KR", "Noto Sans Mono", monospace;
      background: var(--code-bg);
      border-radius: 7px;
      padding: 0.12em 0.36em;
      font-size: 0.92em;
    }
    .doc-body pre {
      background: var(--code-bg);
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 16px 18px;
      overflow-x: auto;
    }
    .doc-body pre code {
      background: transparent;
      padding: 0;
      display: block;
      white-space: pre-wrap;
    }
    .doc-body blockquote {
      margin-left: 0;
      padding: 12px 16px;
      border-left: 3px solid var(--accent);
      background: var(--quote-bg);
      color: #4f4a43;
    }
    .doc-body table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    .doc-body th,
    .doc-body td {
      border: 1px solid var(--line);
      padding: 10px 12px;
      vertical-align: top;
      text-align: left;
    }
    .doc-body th {
      background: var(--table-head);
    }
    .doc-body img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 16px 0;
      border-radius: 12px;
    }
    @media print {
      @page {
        size: A4;
        margin: 14mm;
      }
      html, body {
        background: white !important;
      }
      body.print {
        padding: 0;
      }
      .page {
        width: auto;
        margin: 0;
        padding: 0;
        box-shadow: none;
      }
    }
  `;
}

function buildDocumentHtml(fileName: string, renderedBody: string, mode: 'preview' | 'print') {
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(fileName)}</title>
    <style>${documentStyles()}</style>
  </head>
  <body class="${mode}">
    <article class="page">
      <header class="doc-header">
        <span class="doc-kicker">Markdown</span>
        <h1 class="doc-title">${escapeHtml(fileName.replace(/\.[^.]+$/, ''))}</h1>
        <span class="doc-name">${escapeHtml(fileName)}</span>
      </header>
      <main class="doc-body">${renderedBody}</main>
    </article>
  </body>
</html>`;
}

export async function renderMarkdownPreviewDocument(file: File) {
  await ensureRenderer();
  const markdown = await file.text();
  const renderedBody = renderMarkdown(markdown);

  return {
    previewHtml: buildDocumentHtml(file.name, renderedBody, 'preview'),
    printHtml: buildDocumentHtml(file.name, renderedBody, 'print'),
  };
}

export async function printRenderedDocument(html: string) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';

  document.body.append(iframe);

  const target = iframe.contentWindow;
  if (!target) {
    iframe.remove();
    throw new Error('인쇄 프레임을 만들지 못했습니다.');
  }

  const doc = target.document;
  doc.open();
  doc.write(html);
  doc.close();

  await new Promise<void>((resolve) => {
    iframe.onload = () => resolve();
    window.setTimeout(() => resolve(), 300);
  });

  target.focus();
  target.print();

  window.setTimeout(() => {
    iframe.remove();
  }, 1500);
}
