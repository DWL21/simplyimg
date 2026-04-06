import koreanRegularWoff2Url from '@fontsource/noto-sans-kr/files/noto-sans-kr-korean-400-normal.woff2?url';
import koreanBoldWoff2Url from '@fontsource/noto-sans-kr/files/noto-sans-kr-korean-700-normal.woff2?url';
import latinRegularWoff2Url from '@fontsource/noto-sans-kr/files/noto-sans-kr-latin-400-normal.woff2?url';
import latinBoldWoff2Url from '@fontsource/noto-sans-kr/files/noto-sans-kr-latin-700-normal.woff2?url';
import initMarkdownRenderer, {
  render_markdown as renderMarkdown,
} from '../../../../packages/md-renderer/pkg/md_renderer.js';
import markdownWasmUrl from '../../../../packages/md-renderer/pkg/md_renderer_bg.wasm?url';

let ready: Promise<unknown> | null = null;

interface RenderOptions {
  header: 'none' | 'fileName';
  footer: 'none' | 'fileName' | 'pageNumber';
}

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
      --accent: #1b1814;
      --code-bg: #f5f0e8;
      --quote-bg: #f3efe8;
      --table-head: #f4f0ea;
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
    .page-stack {
      display: flex;
      flex-direction: column;
      gap: 18px;
      align-items: center;
    }
    .page {
      width: min(var(--page-width), 100%);
      height: 297mm;
      margin: 0 auto;
      background: white;
      box-shadow: var(--shadow);
      overflow: hidden;
      min-height: 297mm;
      display: flex;
      flex-direction: column;
    }
    .page-inner {
      flex: 1;
      min-height: 0;
      padding: var(--page-padding-y) var(--page-padding-x);
      display: flex;
      flex-direction: column;
    }
    .doc-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 18px;
      padding-bottom: 14px;
      border-bottom: 1px solid var(--line);
    }
    .doc-header.is-empty,
    .doc-footer.is-empty {
      visibility: hidden;
      min-height: 18px;
    }
    .doc-header-label,
    .doc-footer-label {
      font-size: 12px;
      color: var(--muted);
      letter-spacing: -0.01em;
    }
    .doc-body {
      flex: 1;
      min-height: 0;
      font-size: 15px;
      line-height: 1.72;
      color: var(--text);
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
      color: var(--text);
      text-decoration: none;
      border-bottom: 1px solid rgba(27, 24, 20, 0.24);
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
    .doc-footer {
      display: flex;
      justify-content: flex-end;
      margin-top: 18px;
      padding-top: 12px;
      border-top: 1px solid var(--line);
    }
    .doc-measure {
      position: absolute;
      inset: -99999px auto auto -99999px;
      width: var(--page-width);
      visibility: hidden;
      pointer-events: none;
    }
    .doc-measure .page {
      width: var(--page-width);
      height: 297mm;
      min-height: 297mm;
      box-shadow: none;
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
      .page-stack {
        gap: 0;
      }
      .page {
        width: auto;
        height: 297mm;
        margin: 0;
        box-shadow: none;
        min-height: 297mm;
        break-after: page;
      }
      .page:last-child {
        break-after: auto;
      }
      .page-inner {
        padding: 0;
      }
    }
  `;
}

function buildHeader(fileName: string, options: RenderOptions) {
  const label = options.header === 'fileName' ? escapeHtml(fileName) : '&nbsp;';
  const className = options.header === 'fileName' ? 'doc-header' : 'doc-header is-empty';
  return `<header class="${className}"><span class="doc-header-label">${label}</span></header>`;
}

function buildFooter(fileName: string, options: RenderOptions) {
  const label = options.footer === 'fileName'
    ? escapeHtml(fileName)
    : options.footer === 'pageNumber'
      ? '페이지 1'
      : '&nbsp;';
  const className = options.footer === 'none' ? 'doc-footer is-empty' : 'doc-footer';
  return `<footer class="${className}"><span class="doc-footer-label">${label}</span></footer>`;
}

function paginationScript(options: RenderOptions) {
  return `
    <script>
      const pageStack = document.getElementById('page-stack');
      const template = document.getElementById('doc-template');
      const source = document.getElementById('doc-source');
      const measureRoot = document.getElementById('doc-measure');
      const footerMode = ${JSON.stringify(options.footer)};

      function createPage() {
        const fragment = template.content.cloneNode(true);
        const page = fragment.querySelector('.page');
        const body = fragment.querySelector('.doc-body');
        pageStack.appendChild(fragment);
        return { page: pageStack.lastElementChild, body };
      }

      function getAvailableHeight(page) {
        const inner = page.querySelector('.page-inner');
        const header = page.querySelector('.doc-header');
        const footer = page.querySelector('.doc-footer');
        const body = page.querySelector('.doc-body');
        return inner.clientHeight - header.offsetHeight - footer.offsetHeight - (inner.offsetHeight - body.clientHeight);
      }

      function appendToMeasure(node, page) {
        const clone = page.cloneNode(true);
        const body = clone.querySelector('.doc-body');
        body.appendChild(node.cloneNode(true));
        measureRoot.replaceChildren(clone);
        return body.scrollHeight;
      }

      function paginate() {
        pageStack.innerHTML = '';
        const nodes = Array.from(source.children);
        if (nodes.length === 0) {
          createPage();
          updatePageNumbers();
          return;
        }

        let current = createPage();
        let availableHeight = getAvailableHeight(current.page);

        for (const node of nodes) {
          current.body.appendChild(node.cloneNode(true));
          if (current.body.scrollHeight > availableHeight && current.body.childElementCount > 1) {
            current.body.lastElementChild.remove();
            current = createPage();
            availableHeight = getAvailableHeight(current.page);
            current.body.appendChild(node.cloneNode(true));
          }

          if (current.body.scrollHeight > availableHeight) {
            appendToMeasure(node, current.page);
          }
        }

        updatePageNumbers();
      }

      function updatePageNumbers() {
        if (footerMode !== 'pageNumber') {
          return;
        }

        Array.from(pageStack.querySelectorAll('.page')).forEach((page, index) => {
          const label = page.querySelector('.doc-footer-label');
          if (label) {
            label.textContent = '페이지 ' + (index + 1);
          }
        });
      }

      function schedulePaginate() {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(paginate);
        });
      }

      window.addEventListener('load', schedulePaginate);
      window.addEventListener('resize', paginate);
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(schedulePaginate).catch(() => {});
      }
    </script>
  `;
}

function buildDocumentHtml(fileName: string, renderedBody: string, mode: 'preview' | 'print', options: RenderOptions) {
  const headerHtml = buildHeader(fileName, options);
  const footerHtml = buildFooter(fileName, options);
  const pagedDocument = `
    <div id="page-stack" class="page-stack"></div>
    <template id="doc-template">
      <article class="page">
        <div class="page-inner">
          ${headerHtml}
          <main class="doc-body"></main>
          ${footerHtml}
        </div>
      </article>
    </template>
    <div id="doc-source" style="display:none">${renderedBody}</div>
    <div id="doc-measure" class="doc-measure"></div>
    ${paginationScript(options)}
  `;

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(fileName)}</title>
    <style>${documentStyles()}</style>
  </head>
  <body class="${mode}">
    ${pagedDocument}
  </body>
</html>`;
}

export async function renderMarkdownPreviewDocument(file: File, options: RenderOptions) {
  await ensureRenderer();
  const markdown = await file.text();
  const renderedBody = renderMarkdown(markdown);

  return {
    previewHtml: buildDocumentHtml(file.name, renderedBody, 'preview', options),
    printHtml: buildDocumentHtml(file.name, renderedBody, 'print', options),
  };
}

export async function downloadAsPdf(html: string, fileName: string) {
  const { default: html2canvas } = await import('html2canvas');
  const { jsPDF } = await import('jspdf');

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = '794px';
  iframe.style.height = '1123px';
  iframe.style.border = '0';
  document.body.append(iframe);

  try {
    const iframeDoc = iframe.contentDocument!;
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    await new Promise<void>((resolve) => {
      iframe.onload = () => resolve();
      window.setTimeout(() => resolve(), 500);
    });

    const iframeWin = iframe.contentWindow!;
    if (iframeWin.document.fonts?.ready) {
      await iframeWin.document.fonts.ready;
    }

    // Wait for pagination script to run
    await new Promise<void>((resolve) => window.setTimeout(resolve, 300));

    const pages = Array.from(iframeDoc.querySelectorAll<HTMLElement>('.page'));
    if (pages.length === 0) throw new Error('렌더링된 페이지를 찾지 못했습니다.');

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const A4_W = 210;
    const A4_H = 297;

    for (let i = 0; i < pages.length; i++) {
      const canvas = await html2canvas(pages[i], {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        windowWidth: 794,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, 0, A4_W, A4_H);
    }

    const baseName = fileName.replace(/\.[^.]+$/, '');
    pdf.save(`${baseName}.pdf`);
  } finally {
    iframe.remove();
  }
}
