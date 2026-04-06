import fontkit from '@pdf-lib/fontkit';
import latinBoldUrl from '@fontsource/noto-sans-kr/files/noto-sans-kr-latin-700-normal.woff';
import latinRegularUrl from '@fontsource/noto-sans-kr/files/noto-sans-kr-latin-400-normal.woff';
import koreanBoldUrl from '@fontsource/noto-sans-kr/files/noto-sans-kr-korean-700-normal.woff';
import koreanRegularUrl from '@fontsource/noto-sans-kr/files/noto-sans-kr-korean-400-normal.woff';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
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

type FontWeight = 'regular' | 'bold';
type LoadedFonts = {
  regularLatin: PDFFont;
  regularKorean: PDFFont;
  boldLatin: PDFFont;
  boldKorean: PDFFont;
};

type FontBytes = {
  regularLatin: ArrayBuffer;
  regularKorean: ArrayBuffer;
  boldLatin: ArrayBuffer;
  boldKorean: ArrayBuffer;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 52;
const MARGIN_TOP = 54;
const MARGIN_BOTTOM = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

const COLORS = {
  text: rgb(0.11, 0.1, 0.09),
  muted: rgb(0.42, 0.4, 0.36),
  accent: rgb(0.06, 0.37, 0.29),
  quote: rgb(0.3, 0.29, 0.26),
  codeBg: rgb(0.95, 0.93, 0.89),
  codeBorder: rgb(0.84, 0.82, 0.77),
  tableHeader: rgb(0.91, 0.94, 0.92),
  tableBorder: rgb(0.85, 0.82, 0.78),
};

let fontCache: Promise<FontBytes> | null = null;

function isLatinLike(char: string) {
  if (char === ' ') {
    return true;
  }

  const code = char.codePointAt(0) ?? 0;
  return code <= 0x024f;
}

function normalizeWhitespace(value: string) {
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
    return normalizeWhitespace(token.tokens.map((child) => inlineText(child)).join(''));
  }

  return normalizeWhitespace(token.text ?? token.raw ?? '');
}

function blockText(token: GenericToken | undefined) {
  if (!token) {
    return '';
  }

  if (Array.isArray(token.tokens) && token.tokens.length > 0) {
    return normalizeWhitespace(token.tokens.map((child) => inlineText(child)).join(' '));
  }

  return normalizeWhitespace(token.text ?? token.raw ?? '');
}

async function loadFontBytes(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`폰트를 불러오지 못했습니다: ${url}`);
  }
  return response.arrayBuffer();
}

async function loadFonts(pdf: PDFDocument): Promise<LoadedFonts> {
  pdf.registerFontkit(fontkit);

  if (!fontCache) {
    fontCache = Promise.all([
      loadFontBytes(latinRegularUrl),
      loadFontBytes(latinBoldUrl),
      loadFontBytes(koreanRegularUrl),
      loadFontBytes(koreanBoldUrl),
    ]).then(([latinRegular, latinBold, koreanRegular, koreanBold]) => ({
      regularLatin: latinRegular,
      boldLatin: latinBold,
      regularKorean: koreanRegular,
      boldKorean: koreanBold,
    }));
  }

  const bytes = await fontCache;
  return {
    regularLatin: await pdf.embedFont(bytes.regularLatin),
    boldLatin: await pdf.embedFont(bytes.boldLatin),
    regularKorean: await pdf.embedFont(bytes.regularKorean),
    boldKorean: await pdf.embedFont(bytes.boldKorean),
  };
}

function pickFont(fonts: LoadedFonts, char: string, weight: FontWeight) {
  if (isLatinLike(char)) {
    return weight === 'bold' ? fonts.boldLatin : fonts.regularLatin;
  }

  return weight === 'bold' ? fonts.boldKorean : fonts.regularKorean;
}

function splitRuns(text: string, fonts: LoadedFonts, weight: FontWeight) {
  const runs: Array<{ text: string; font: PDFFont }> = [];

  for (const char of text) {
    const font = pickFont(fonts, char, weight);
    const last = runs.at(-1);
    if (last && last.font === font) {
      last.text += char;
    } else {
      runs.push({ text: char, font });
    }
  }

  return runs;
}

function measureText(text: string, fonts: LoadedFonts, size: number, weight: FontWeight) {
  return splitRuns(text, fonts, weight).reduce(
    (sum, run) => sum + run.font.widthOfTextAtSize(run.text, size),
    0,
  );
}

function breakWord(word: string, fonts: LoadedFonts, size: number, width: number, weight: FontWeight) {
  const lines: string[] = [];
  let current = '';

  for (const char of word) {
    const candidate = `${current}${char}`;
    if (measureText(candidate, fonts, size, weight) <= width || current.length === 0) {
      current = candidate;
    } else {
      lines.push(current);
      current = char;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function wrapText(text: string, fonts: LoadedFonts, size: number, width: number, weight: FontWeight) {
  const normalized = normalizeWhitespace(text);
  if (!normalized) {
    return [''];
  }

  const parts = normalized.split(/(\s+)/).filter((part) => part.length > 0);
  const lines: string[] = [];
  let current = '';

  for (const part of parts) {
    const candidate = `${current}${part}`;
    if (measureText(candidate, fonts, size, weight) <= width) {
      current = candidate;
      continue;
    }

    if (current.trim().length > 0) {
      lines.push(current.trimEnd());
      current = part.trimStart();
      if (measureText(current, fonts, size, weight) <= width) {
        continue;
      }
    }

    const broken = breakWord(part.trim(), fonts, size, width, weight);
    if (broken.length === 0) {
      continue;
    }

    lines.push(...broken.slice(0, -1));
    current = broken.at(-1) ?? '';
  }

  if (current.trim().length > 0) {
    lines.push(current.trimEnd());
  }

  return lines.length > 0 ? lines : [''];
}

function drawLine(
  page: PDFPage,
  text: string,
  x: number,
  topY: number,
  fonts: LoadedFonts,
  size: number,
  weight: FontWeight,
  color: ReturnType<typeof rgb>,
) {
  let cursorX = x;
  const baselineY = PAGE_HEIGHT - topY - size;
  const runs = splitRuns(text, fonts, weight);

  runs.forEach((run) => {
    page.drawText(run.text, {
      x: cursorX,
      y: baselineY,
      size,
      font: run.font,
      color,
    });
    cursorX += run.font.widthOfTextAtSize(run.text, size);
  });
}

function createPage(pdf: PDFDocument) {
  return pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
}

function ensureSpace(pdf: PDFDocument, page: PDFPage, cursorY: number, neededHeight: number) {
  if (cursorY + neededHeight <= PAGE_HEIGHT - MARGIN_BOTTOM) {
    return { page, cursorY };
  }

  return {
    page: createPage(pdf),
    cursorY: MARGIN_TOP,
  };
}

function drawParagraph(
  pdf: PDFDocument,
  page: PDFPage,
  cursorY: number,
  text: string,
  fonts: LoadedFonts,
  options?: {
    x?: number;
    width?: number;
    size?: number;
    lineHeight?: number;
    weight?: FontWeight;
    color?: ReturnType<typeof rgb>;
  },
) {
  const x = options?.x ?? MARGIN_X;
  const width = options?.width ?? CONTENT_WIDTH;
  const size = options?.size ?? 11;
  const lineHeight = options?.lineHeight ?? size * 1.55;
  const weight = options?.weight ?? 'regular';
  const color = options?.color ?? COLORS.text;

  const lines = wrapText(text, fonts, size, width, weight);
  ({ page, cursorY } = ensureSpace(pdf, page, cursorY, lines.length * lineHeight));

  lines.forEach((line, index) => {
    drawLine(page, line, x, cursorY + index * lineHeight, fonts, size, weight, color);
  });

  return { page, cursorY: cursorY + lines.length * lineHeight };
}

function drawRule(pdf: PDFDocument, page: PDFPage, cursorY: number) {
  ({ page, cursorY } = ensureSpace(pdf, page, cursorY, 8));
  page.drawLine({
    start: { x: MARGIN_X, y: PAGE_HEIGHT - cursorY - 4 },
    end: { x: PAGE_WIDTH - MARGIN_X, y: PAGE_HEIGHT - cursorY - 4 },
    thickness: 0.7,
    color: COLORS.tableBorder,
  });
  return { page, cursorY: cursorY + 8 };
}

function drawCodeBlock(
  pdf: PDFDocument,
  page: PDFPage,
  cursorY: number,
  token: GenericToken,
  fonts: LoadedFonts,
) {
  const source = (token.text ?? '').replace(/\t/g, '  ');
  const rawLines = source.length > 0 ? source.split('\n') : [''];
  const wrapped = rawLines.flatMap((line) => wrapText(line || ' ', fonts, 10, CONTENT_WIDTH - 18, 'regular'));
  const lineHeight = 16;
  const boxHeight = wrapped.length * lineHeight + 14;

  ({ page, cursorY } = ensureSpace(pdf, page, cursorY, boxHeight + 4));

  page.drawRectangle({
    x: MARGIN_X,
    y: PAGE_HEIGHT - cursorY - boxHeight + 4,
    width: CONTENT_WIDTH,
    height: boxHeight,
    color: COLORS.codeBg,
    borderColor: COLORS.codeBorder,
    borderWidth: 1,
  });

  wrapped.forEach((line, index) => {
    drawLine(page, line, MARGIN_X + 9, cursorY + 9 + index * lineHeight, fonts, 10, 'regular', COLORS.text);
  });

  return { page, cursorY: cursorY + boxHeight + 6 };
}

function drawList(
  pdf: PDFDocument,
  page: PDFPage,
  cursorY: number,
  token: GenericToken,
  fonts: LoadedFonts,
) {
  const items = token.items ?? [];
  let itemIndex = token.start ?? 1;

  for (const item of items) {
    const marker = token.ordered ? `${itemIndex}.` : item.task ? `[${item.checked ? 'x' : ' '}]` : '•';
    const lines = wrapText(
      `${marker} ${blockText({ tokens: item.tokens, text: item.text })}`,
      fonts,
      11,
      CONTENT_WIDTH - 6,
      'regular',
    );
    const lineHeight = 18;
    ({ page, cursorY } = ensureSpace(pdf, page, cursorY, lines.length * lineHeight));
    lines.forEach((line, index) => {
      drawLine(page, line, MARGIN_X + 6, cursorY + index * lineHeight, fonts, 11, 'regular', COLORS.text);
    });
    cursorY += lines.length * lineHeight + 2;
    itemIndex += 1;
  }

  return { page, cursorY };
}

function drawTable(
  pdf: PDFDocument,
  page: PDFPage,
  cursorY: number,
  token: GenericToken,
  fonts: LoadedFonts,
) {
  const headers = token.header ?? [];
  const rows = token.rows ?? [];
  const columnCount = Math.max(headers.length, ...rows.map((row) => row.length), 1);
  const columnWidth = CONTENT_WIDTH / columnCount;
  const lineHeight = 16;

  const normalizeCell = (cell?: { text?: string; tokens?: GenericToken[] }) =>
    normalizeWhitespace(cell?.tokens?.map((child) => inlineText(child)).join(' ') ?? cell?.text ?? '');

  const drawRow = (cells: string[], bold: boolean) => {
    const cellLines = cells.map((cell) => wrapText(cell || ' ', fonts, 10, columnWidth - 10, bold ? 'bold' : 'regular'));
    const rowHeight = Math.max(...cellLines.map((lines) => Math.max(lines.length, 1))) * lineHeight + 10;

    ({ page, cursorY } = ensureSpace(pdf, page, cursorY, rowHeight));

    cells.forEach((_cell, columnIndex) => {
      const x = MARGIN_X + columnWidth * columnIndex;
      page.drawRectangle({
        x,
        y: PAGE_HEIGHT - cursorY - rowHeight + 4,
        width: columnWidth,
        height: rowHeight,
        color: bold ? COLORS.tableHeader : undefined,
        borderColor: COLORS.tableBorder,
        borderWidth: 1,
      });

      cellLines[columnIndex].forEach((line, lineIndex) => {
        drawLine(
          page,
          line,
          x + 5,
          cursorY + 8 + lineIndex * lineHeight,
          fonts,
          10,
          bold ? 'bold' : 'regular',
          COLORS.text,
        );
      });
    });

    cursorY += rowHeight;
  };

  drawRow(Array.from({ length: columnCount }, (_, index) => normalizeCell(headers[index])), true);
  rows.forEach((row) => {
    drawRow(Array.from({ length: columnCount }, (_, index) => normalizeCell(row[index])), false);
  });

  return { page, cursorY: cursorY + 4 };
}

export async function renderMarkdownToPdf(file: File): Promise<ProcessedDocument> {
  const markdown = await file.text();
  const tokens = marked.lexer(markdown, { gfm: true, breaks: true }) as GenericToken[];

  const pdf = await PDFDocument.create();
  const fonts = await loadFonts(pdf);

  let page = createPage(pdf);
  let cursorY = MARGIN_TOP;
  const title = file.name.replace(/\.[^.]+$/, '');

  ({ page, cursorY } = drawParagraph(pdf, page, cursorY, title, fonts, {
    size: 24,
    lineHeight: 34,
    weight: 'bold',
  }));
  ({ page, cursorY } = drawParagraph(pdf, page, cursorY, `Markdown · ${file.name}`, fonts, {
    size: 10,
    lineHeight: 16,
    color: COLORS.muted,
  }));
  ({ page, cursorY } = drawRule(pdf, page, cursorY));
  cursorY += 8;

  for (const token of tokens) {
    switch (token.type) {
      case 'space':
        cursorY += 4;
        break;
      case 'hr':
        ({ page, cursorY } = drawRule(pdf, page, cursorY));
        cursorY += 6;
        break;
      case 'heading': {
        const depth = Math.min(Math.max(token.depth ?? 1, 1), 6);
        const sizeMap = [0, 22, 18, 15, 13, 12, 11];
        const lineHeightMap = [0, 30, 24, 21, 18, 17, 16];
        ({ page, cursorY } = drawParagraph(pdf, page, cursorY, blockText(token), fonts, {
          size: sizeMap[depth],
          lineHeight: lineHeightMap[depth],
          weight: 'bold',
          color: depth <= 2 ? COLORS.accent : COLORS.text,
        }));
        cursorY += depth <= 2 ? 8 : 6;
        break;
      }
      case 'paragraph':
      case 'text':
        ({ page, cursorY } = drawParagraph(pdf, page, cursorY, blockText(token), fonts));
        cursorY += 8;
        break;
      case 'blockquote':
        ({ page, cursorY } = ensureSpace(pdf, page, cursorY, 24));
        page.drawLine({
          start: { x: MARGIN_X, y: PAGE_HEIGHT - cursorY - 2 },
          end: { x: MARGIN_X, y: PAGE_HEIGHT - cursorY - 26 },
          thickness: 2,
          color: COLORS.accent,
        });
        ({ page, cursorY } = drawParagraph(pdf, page, cursorY, blockText(token), fonts, {
          x: MARGIN_X + 14,
          width: CONTENT_WIDTH - 14,
          size: 10.5,
          lineHeight: 17,
          color: COLORS.quote,
        }));
        cursorY += 8;
        break;
      case 'list':
        ({ page, cursorY } = drawList(pdf, page, cursorY, token, fonts));
        cursorY += 6;
        break;
      case 'code':
        ({ page, cursorY } = drawCodeBlock(pdf, page, cursorY, token, fonts));
        cursorY += 4;
        break;
      case 'table':
        ({ page, cursorY } = drawTable(pdf, page, cursorY, token, fonts));
        cursorY += 6;
        break;
      default: {
        const fallback = blockText(token);
        if (fallback) {
          ({ page, cursorY } = drawParagraph(pdf, page, cursorY, fallback, fonts));
          cursorY += 8;
        }
      }
    }
  }

  const bytes = await pdf.save();
  const payload = new Uint8Array(bytes);
  return {
    blob: new Blob([payload], { type: 'application/pdf' }),
    mimeType: 'application/pdf',
  };
}
