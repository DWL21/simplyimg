import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { marked } from 'marked';
import type { ProcessedDocument } from '../types/document';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const RENDER_SCALE = 2;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildMarkdownStyles() {
  return `
    .simplyimg-md-root {
      width: 794px;
      box-sizing: border-box;
      padding: 72px 64px;
      background: #fffdf8;
      color: #1d1a16;
      font-family: Georgia, "Times New Roman", serif;
      line-height: 1.7;
      overflow: hidden;
    }
    .simplyimg-md-root .doc-header {
      margin-bottom: 32px;
      padding-bottom: 20px;
      border-bottom: 1px solid rgba(29, 26, 22, 0.12);
    }
    .simplyimg-md-root .doc-kicker {
      margin: 0 0 10px;
      color: #6c665d;
      font: 700 12px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .simplyimg-md-root .doc-title {
      margin: 0;
      font-size: 36px;
      line-height: 1.05;
      letter-spacing: -0.04em;
    }
    .simplyimg-md-root .doc-meta {
      margin-top: 12px;
      color: #6c665d;
      font-size: 13px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    .simplyimg-md-root h1,
    .simplyimg-md-root h2,
    .simplyimg-md-root h3,
    .simplyimg-md-root h4,
    .simplyimg-md-root h5,
    .simplyimg-md-root h6 {
      margin: 1.5em 0 0.55em;
      line-height: 1.15;
      letter-spacing: -0.03em;
      page-break-after: avoid;
    }
    .simplyimg-md-root h1 { font-size: 31px; }
    .simplyimg-md-root h2 { font-size: 25px; }
    .simplyimg-md-root h3 { font-size: 20px; }
    .simplyimg-md-root p,
    .simplyimg-md-root ul,
    .simplyimg-md-root ol,
    .simplyimg-md-root blockquote,
    .simplyimg-md-root pre,
    .simplyimg-md-root table {
      margin: 0 0 1.05em;
    }
    .simplyimg-md-root a {
      color: #0f5f49;
      text-decoration: none;
    }
    .simplyimg-md-root code {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.9em;
      background: rgba(15, 95, 73, 0.08);
      border-radius: 6px;
      padding: 0.12em 0.38em;
    }
    .simplyimg-md-root pre {
      overflow: hidden;
      padding: 16px 18px;
      border-radius: 14px;
      background: #1f1f1b;
      color: #f8f4eb;
    }
    .simplyimg-md-root pre code {
      background: transparent;
      padding: 0;
      color: inherit;
      display: block;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .simplyimg-md-root blockquote {
      padding: 10px 0 10px 18px;
      border-left: 3px solid rgba(15, 95, 73, 0.4);
      color: #4c4943;
      background: rgba(15, 95, 73, 0.04);
    }
    .simplyimg-md-root table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 14px;
    }
    .simplyimg-md-root th,
    .simplyimg-md-root td {
      border: 1px solid rgba(29, 26, 22, 0.14);
      padding: 10px 12px;
      vertical-align: top;
      word-break: break-word;
    }
    .simplyimg-md-root th {
      background: rgba(15, 95, 73, 0.08);
      text-align: left;
    }
    .simplyimg-md-root img {
      display: block;
      max-width: 100%;
      height: auto;
      border-radius: 12px;
      margin: 16px 0;
    }
    .simplyimg-md-root hr {
      border: 0;
      border-top: 1px solid rgba(29, 26, 22, 0.12);
      margin: 28px 0;
    }
  `;
}

async function buildMarkdownElement(file: File, markdown: string) {
  const root = document.createElement('div');
  root.style.position = 'fixed';
  root.style.left = '-10000px';
  root.style.top = '0';
  root.style.zIndex = '-1';
  root.style.pointerEvents = 'none';

  const renderer = new marked.Renderer();
  renderer.html = ({ text }) => `<pre>${escapeHtml(text)}</pre>`;

  const bodyHtml = await marked.parse(markdown, {
    breaks: true,
    gfm: true,
    renderer,
  });

  root.innerHTML = `
    <style>${buildMarkdownStyles()}</style>
    <article class="simplyimg-md-root">
      <header class="doc-header">
        <p class="doc-kicker">Markdown Document</p>
        <h1 class="doc-title">${escapeHtml(file.name.replace(/\.[^.]+$/, ''))}</h1>
        <div class="doc-meta">${escapeHtml(file.name)} · ${new Date().toLocaleString()}</div>
      </header>
      <section class="doc-body">${bodyHtml}</section>
    </article>
  `;

  document.body.append(root);

  if ('fonts' in document) {
    await document.fonts.ready;
  }

  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        }),
    ),
  );

  return root;
}

function canvasSliceToDataUrl(source: HTMLCanvasElement, offsetY: number, height: number) {
  const sliceCanvas = document.createElement('canvas');
  sliceCanvas.width = source.width;
  sliceCanvas.height = height;
  const context = sliceCanvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas context를 만들 수 없습니다.');
  }

  context.fillStyle = '#fffdf8';
  context.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
  context.drawImage(
    source,
    0,
    offsetY,
    source.width,
    height,
    0,
    0,
    sliceCanvas.width,
    sliceCanvas.height,
  );
  return sliceCanvas.toDataURL('image/png');
}

export async function renderMarkdownToPdf(file: File): Promise<ProcessedDocument> {
  const markdown = await file.text();
  const mount = await buildMarkdownElement(file, markdown);

  try {
    const article = mount.querySelector('.simplyimg-md-root');
    if (!(article instanceof HTMLElement)) {
      throw new Error('Markdown 렌더링 컨테이너를 만들지 못했습니다.');
    }

    const canvas = await html2canvas(article, {
      backgroundColor: '#fffdf8',
      scale: RENDER_SCALE,
      useCORS: true,
      logging: false,
      windowWidth: article.scrollWidth,
      width: article.scrollWidth,
      height: article.scrollHeight,
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const sliceHeight = Math.floor((canvas.width * A4_HEIGHT_MM) / A4_WIDTH_MM);
    let offsetY = 0;
    let pageIndex = 0;

    while (offsetY < canvas.height) {
      const currentHeight = Math.min(sliceHeight, canvas.height - offsetY);
      const image = canvasSliceToDataUrl(canvas, offsetY, currentHeight);

      if (pageIndex > 0) {
        pdf.addPage();
      }

      const renderHeight = (currentHeight * A4_WIDTH_MM) / canvas.width;
      pdf.addImage(image, 'PNG', 0, 0, A4_WIDTH_MM, renderHeight, undefined, 'FAST');

      offsetY += currentHeight;
      pageIndex += 1;
    }

    const blob = pdf.output('blob');
    return {
      blob,
      mimeType: 'application/pdf',
    };
  } finally {
    mount.remove();
  }
}
