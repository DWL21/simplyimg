import { jsPDF } from 'jspdf';
import { marked } from 'marked';
import type { ProcessedDocument } from '../types/document';

type GenericToken = {
  type?: string;
  raw?: string;
  text?: string;
  depth?: number;
  ordered?: boolean;
  start?: number;
  lang?: string;
  tokens?: GenericToken[];
  items?: Array<{
    text?: string;
    tokens?: GenericToken[];
    task?: boolean;
    checked?: boolean;
  }>;
  header?: Array<{ text?: string; tokens?: GenericToken[] }>;
  rows?: Array<Array<{ text?: string; tokens?: GenericToken[] }>>;
};

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_X = 18;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 18;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

const COLORS = {
  text: '#1d1a16',
  muted: '#6c665d',
  accent: '#0f5f49',
  quote: '#4c4943',
  codeBg: '#f2ede4',
  codeBorder: '#d8d0c4',
  tableHeader: '#e7f0ec',
  tableBorder: '#d9d2c8',
};

function addPage(pdf: jsPDF) {
  pdf.addPage('a4', 'portrait');
}

function ensureSpace(pdf: jsPDF, cursorY: number, neededHeight: number) {
  if (cursorY + neededHeight <= PAGE_HEIGHT - MARGIN_BOTTOM) {
    return cursorY;
  }

  addPage(pdf);
  return MARGIN_TOP;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((char) => `${char}${char}`).join('')
    : normalized;
  const int = Number.parseInt(value, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function setTextColor(pdf: jsPDF, color: string) {
  const { r, g, b } = hexToRgb(color);
  pdf.setTextColor(r, g, b);
}

function setDrawColor(pdf: jsPDF, color: string) {
  const { r, g, b } = hexToRgb(color);
  pdf.setDrawColor(r, g, b);
}

function setFillColor(pdf: jsPDF, color: string) {
  const { r, g, b } = hexToRgb(color);
  pdf.setFillColor(r, g, b);
}

function cleanWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function inlineText(token: GenericToken | undefined): string {
  if (!token) {
    return '';
  }

  if (token.type === 'codespan') {
    return token.text ?? '';
  }

  if (token.type === 'image') {
    return token.text ? `[Image: ${token.text}]` : '[Image]';
  }

  if (Array.isArray(token.tokens) && token.tokens.length > 0) {
    const combined = token.tokens.map((child) => inlineText(child)).join('');
    return cleanWhitespace(combined);
  }

  return cleanWhitespace(token.text ?? token.raw ?? '');
}

function blockText(token: GenericToken | undefined) {
  if (!token) {
    return '';
  }

  if (Array.isArray(token.tokens) && token.tokens.length > 0) {
    return cleanWhitespace(token.tokens.map((child) => inlineText(child)).join(' '));
  }

  return cleanWhitespace(token.text ?? token.raw ?? '');
}

function writeLines(
  pdf: jsPDF,
  lines: string[],
  x: number,
  startY: number,
  lineHeight: number,
) {
  lines.forEach((line, index) => {
    pdf.text(line, x, startY + lineHeight * index);
  });
}

function splitText(pdf: jsPDF, text: string, width: number) {
  const normalized = cleanWhitespace(text);
  if (!normalized) {
    return [''];
  }
  return pdf.splitTextToSize(normalized, width) as string[];
}

function renderParagraph(pdf: jsPDF, cursorY: number, text: string, options?: {
  x?: number;
  width?: number;
  fontSize?: number;
  lineHeight?: number;
  color?: string;
  style?: 'normal' | 'bold' | 'italic' | 'bolditalic';
}) {
  const x = options?.x ?? MARGIN_X;
  const width = options?.width ?? CONTENT_WIDTH;
  const fontSize = options?.fontSize ?? 11;
  const lineHeight = options?.lineHeight ?? fontSize * 0.48 + 1.8;

  pdf.setFont('times', options?.style ?? 'normal');
  pdf.setFontSize(fontSize);
  setTextColor(pdf, options?.color ?? COLORS.text);

  const lines = splitText(pdf, text, width);
  cursorY = ensureSpace(pdf, cursorY, lineHeight * lines.length);
  writeLines(pdf, lines, x, cursorY, lineHeight);
  return cursorY + lineHeight * lines.length;
}

function renderCodeBlock(pdf: jsPDF, cursorY: number, token: GenericToken) {
  pdf.setFont('courier', 'normal');
  pdf.setFontSize(9.5);

  const source = (token.text ?? '').replace(/\t/g, '  ');
  const lines = source.length > 0 ? source.split('\n') : [''];
  const wrapped = lines.flatMap((line) => {
    const parts = pdf.splitTextToSize(line || ' ', CONTENT_WIDTH - 8) as string[];
    return parts.length > 0 ? parts : [' '];
  });

  const lineHeight = 5.2;
  const boxHeight = wrapped.length * lineHeight + 8;
  cursorY = ensureSpace(pdf, cursorY, boxHeight);

  setFillColor(pdf, COLORS.codeBg);
  setDrawColor(pdf, COLORS.codeBorder);
  pdf.roundedRect(MARGIN_X, cursorY - 3.2, CONTENT_WIDTH, boxHeight, 2, 2, 'FD');
  setTextColor(pdf, COLORS.text);
  writeLines(pdf, wrapped, MARGIN_X + 4, cursorY + 1.2, lineHeight);

  return cursorY + boxHeight + 2;
}

function renderRule(pdf: jsPDF, cursorY: number) {
  cursorY = ensureSpace(pdf, cursorY, 8);
  setDrawColor(pdf, COLORS.tableBorder);
  pdf.setLineWidth(0.35);
  pdf.line(MARGIN_X, cursorY + 2, PAGE_WIDTH - MARGIN_X, cursorY + 2);
  return cursorY + 6;
}

function renderTable(pdf: jsPDF, cursorY: number, token: GenericToken) {
  const headers = token.header ?? [];
  const rows = token.rows ?? [];
  const columnCount = Math.max(headers.length, ...rows.map((row) => row.length), 1);
  const columnWidth = CONTENT_WIDTH / columnCount;
  const lineHeight = 4.8;

  const normalizeCell = (cell?: { text?: string; tokens?: GenericToken[] }) =>
    cleanWhitespace(cell?.tokens?.map((child) => inlineText(child)).join(' ') ?? cell?.text ?? '');

  const drawRow = (cells: string[], y: number, isHeader: boolean) => {
    const cellLines = cells.map((cell) => {
      pdf.setFont('times', isHeader ? 'bold' : 'normal');
      pdf.setFontSize(10);
      return splitText(pdf, cell || ' ', columnWidth - 6);
    });
    const rowHeight = Math.max(...cellLines.map((lines) => Math.max(lines.length, 1))) * lineHeight + 6;
    cursorY = ensureSpace(pdf, y, rowHeight);

    cells.forEach((_cell, columnIndex) => {
      const x = MARGIN_X + columnWidth * columnIndex;
      setDrawColor(pdf, COLORS.tableBorder);
      if (isHeader) {
        setFillColor(pdf, COLORS.tableHeader);
        pdf.rect(x, cursorY, columnWidth, rowHeight, 'FD');
      } else {
        pdf.rect(x, cursorY, columnWidth, rowHeight);
      }

      pdf.setFont('times', isHeader ? 'bold' : 'normal');
      pdf.setFontSize(10);
      setTextColor(pdf, COLORS.text);
      writeLines(pdf, cellLines[columnIndex], x + 3, cursorY + 5, lineHeight);
    });

    return cursorY + rowHeight;
  };

  const headerCells = Array.from({ length: columnCount }, (_, index) => normalizeCell(headers[index]));
  cursorY = drawRow(headerCells, cursorY, true);

  rows.forEach((row) => {
    const rowCells = Array.from({ length: columnCount }, (_, index) => normalizeCell(row[index]));
    cursorY = drawRow(rowCells, cursorY, false);
  });

  return cursorY + 3;
}

function renderList(pdf: jsPDF, cursorY: number, token: GenericToken) {
  const items = token.items ?? [];
  let itemIndex = token.start ?? 1;

  items.forEach((item) => {
    const marker = token.ordered ? `${itemIndex}.` : item.task ? `[${item.checked ? 'x' : ' '}]` : '•';
    const text = blockText({ tokens: item.tokens, text: item.text });
    const markerWidth = 10;

    pdf.setFont('times', 'normal');
    pdf.setFontSize(11);
    const lines = splitText(pdf, `${marker} ${text}`, CONTENT_WIDTH - 4);
    const lineHeight = 6;
    cursorY = ensureSpace(pdf, cursorY, lines.length * lineHeight);
    writeLines(pdf, lines, MARGIN_X + markerWidth / 2, cursorY, lineHeight);
    cursorY += lines.length * lineHeight + 1;
    itemIndex += 1;
  });

  return cursorY + 1;
}

export async function renderMarkdownToPdf(file: File): Promise<ProcessedDocument> {
  const markdown = await file.text();
  const tokens = marked.lexer(markdown, { gfm: true, breaks: true }) as GenericToken[];

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  let cursorY = MARGIN_TOP;

  pdf.setProperties({
    title: file.name.replace(/\.[^.]+$/, ''),
    subject: 'Markdown to PDF',
    author: 'SimplyImg',
  });

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  setTextColor(pdf, COLORS.text);
  const titleLines = splitText(pdf, file.name.replace(/\.[^.]+$/, ''), CONTENT_WIDTH);
  writeLines(pdf, titleLines, MARGIN_X, cursorY, 8.8);
  cursorY += titleLines.length * 8.8;

  pdf.setFont('courier', 'normal');
  pdf.setFontSize(9.5);
  setTextColor(pdf, COLORS.muted);
  pdf.text(`Markdown · ${file.name}`, MARGIN_X, cursorY + 1);
  cursorY += 8;

  cursorY = renderRule(pdf, cursorY);
  cursorY += 2;

  for (const token of tokens) {
    switch (token.type) {
      case 'space':
        cursorY += 2;
        break;
      case 'hr':
        cursorY = renderRule(pdf, cursorY) + 2;
        break;
      case 'heading': {
        const depth = Math.min(Math.max(token.depth ?? 1, 1), 6);
        const sizeMap = [0, 20, 16.5, 14, 12.5, 11.5, 11];
        cursorY = renderParagraph(pdf, cursorY, blockText(token), {
          fontSize: sizeMap[depth],
          lineHeight: depth === 1 ? 8 : 6.8,
          color: depth <= 2 ? COLORS.accent : COLORS.text,
          style: 'bold',
        }) + (depth <= 2 ? 3 : 2);
        break;
      }
      case 'paragraph':
      case 'text':
        cursorY = renderParagraph(pdf, cursorY, blockText(token)) + 3;
        break;
      case 'blockquote':
        cursorY = ensureSpace(pdf, cursorY, 12);
        setDrawColor(pdf, COLORS.accent);
        pdf.setLineWidth(0.8);
        pdf.line(MARGIN_X, cursorY - 1.5, MARGIN_X, cursorY + 8);
        cursorY = renderParagraph(pdf, cursorY, blockText(token), {
          x: MARGIN_X + 4.5,
          width: CONTENT_WIDTH - 4.5,
          fontSize: 10.5,
          lineHeight: 5.8,
          color: COLORS.quote,
          style: 'italic',
        }) + 3;
        break;
      case 'list':
        cursorY = renderList(pdf, cursorY, token);
        break;
      case 'code':
        cursorY = renderCodeBlock(pdf, cursorY, token);
        break;
      case 'table':
        cursorY = renderTable(pdf, cursorY, token);
        break;
      default: {
        const fallback = blockText(token);
        if (fallback) {
          cursorY = renderParagraph(pdf, cursorY, fallback) + 3;
        }
      }
    }
  }

  return {
    blob: pdf.output('blob'),
    mimeType: 'application/pdf',
  };
}
