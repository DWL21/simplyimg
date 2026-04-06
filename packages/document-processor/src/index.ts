import mammoth from "mammoth";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

export type DocumentFormat = "md" | "docx";

type TextBlockKind = "title" | "heading" | "paragraph" | "list" | "code" | "quote" | "spacer";

interface TextBlock {
  kind: TextBlockKind;
  text: string;
}

interface PdfTheme {
  titleSize: number;
  headingSize: number;
  bodySize: number;
  codeSize: number;
  lineGap: number;
  paragraphGap: number;
}

const PAGE = {
  width: 595.28,
  height: 841.89,
  marginX: 52,
  marginTop: 56,
  marginBottom: 52,
};

const THEME: PdfTheme = {
  titleSize: 20,
  headingSize: 15,
  bodySize: 11,
  codeSize: 10,
  lineGap: 4,
  paragraphGap: 12,
};

const LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;
const IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)]+)\)/g;

const normalizeLine = (line: string) =>
  line
    .replace(IMAGE_PATTERN, (_match, alt: string, src: string) =>
      alt && alt.trim().length > 0 ? `${alt.trim()} (${src})` : src,
    )
    .replace(LINK_PATTERN, "$1 ($2)")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/<[^>]+>/g, "")
    .trim();

const splitParagraphs = (text: string): string[] =>
  text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const detectFormat = (fileName: string): DocumentFormat | null => {
  const lowered = fileName.toLowerCase();
  if (lowered.endsWith(".md") || lowered.endsWith(".markdown")) {
    return "md";
  }
  if (lowered.endsWith(".docx")) {
    return "docx";
  }
  return null;
};

function markdownToBlocks(markdown: string, fileName: string): TextBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: TextBlock[] = [{ kind: "title", text: fileName.replace(/\.[^.]+$/, "") }];
  let inCode = false;
  let codeBuffer: string[] = [];

  const flushCode = () => {
    if (codeBuffer.length === 0) {
      return;
    }
    blocks.push({ kind: "code", text: codeBuffer.join("\n") });
    codeBuffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, "  ");
    if (line.trim().startsWith("```")) {
      if (inCode) {
        flushCode();
        blocks.push({ kind: "spacer", text: "" });
      }
      inCode = !inCode;
      continue;
    }

    if (inCode) {
      codeBuffer.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (trimmed.length === 0) {
      blocks.push({ kind: "spacer", text: "" });
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({ kind: "heading", text: normalizeLine(headingMatch[2]) });
      blocks.push({ kind: "spacer", text: "" });
      continue;
    }

    const quoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      blocks.push({ kind: "quote", text: normalizeLine(quoteMatch[1]) });
      continue;
    }

    const listMatch = trimmed.match(/^(([-*+])|(\d+\.))\s+(.*)$/);
    if (listMatch) {
      const bullet = listMatch[3] ? `${listMatch[3]}` : "•";
      blocks.push({ kind: "list", text: `${bullet} ${normalizeLine(listMatch[4])}` });
      continue;
    }

    blocks.push({ kind: "paragraph", text: normalizeLine(trimmed) });
  }

  flushCode();
  return blocks;
}

async function docxToBlocks(input: Uint8Array, fileName: string): Promise<TextBlock[]> {
  const arrayBuffer = new Uint8Array(input).slice().buffer;
  const { value } = await mammoth.extractRawText({
    arrayBuffer,
  });
  const paragraphs = splitParagraphs(value);
  return [
    { kind: "title", text: fileName.replace(/\.[^.]+$/, "") },
    ...paragraphs.flatMap<TextBlock>((paragraph) => [
      { kind: "paragraph", text: paragraph.replace(/\s+\n/g, "\n").trim() },
      { kind: "spacer", text: "" },
    ]),
  ];
}

const widthFor = (font: PDFFont, text: string, size: number) => font.widthOfTextAtSize(text, size);

function wrapLine(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length === 0) {
    return [""];
  }

  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (widthFor(font, candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = word;
      continue;
    }

    let chunk = "";
    for (const char of word) {
      const next = `${chunk}${char}`;
      if (widthFor(font, next, size) <= maxWidth) {
        chunk = next;
      } else {
        if (chunk) {
          lines.push(chunk);
        }
        chunk = char;
      }
    }
    current = chunk;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

async function renderPdf(blocks: TextBlock[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);

  let page = pdf.addPage([PAGE.width, PAGE.height]);
  let cursorY = PAGE.height - PAGE.marginTop;
  const maxWidth = PAGE.width - PAGE.marginX * 2;

  const addPage = () => {
    page = pdf.addPage([PAGE.width, PAGE.height]);
    cursorY = PAGE.height - PAGE.marginTop;
  };

  const ensureSpace = (neededHeight: number) => {
    if (cursorY - neededHeight < PAGE.marginBottom) {
      addPage();
    }
  };

  for (const block of blocks) {
    if (block.kind === "spacer") {
      cursorY -= THEME.paragraphGap / 2;
      continue;
    }

    const font =
      block.kind === "title" || block.kind === "heading" ? bold : block.kind === "code" ? mono : regular;
    const size =
      block.kind === "title"
        ? THEME.titleSize
        : block.kind === "heading"
          ? THEME.headingSize
          : block.kind === "code"
            ? THEME.codeSize
            : THEME.bodySize;
    const color =
      block.kind === "quote" ? rgb(0.36, 0.36, 0.36) : block.kind === "heading" ? rgb(0.1, 0.25, 0.2) : rgb(0, 0, 0);
    const textLines =
      block.kind === "code"
        ? block.text.split("\n").map((line) => line.replace(/\r/g, ""))
        : wrapLine(block.text, font, size, maxWidth);
    const lineHeight = size + THEME.lineGap;
    const totalHeight = textLines.length * lineHeight + THEME.paragraphGap;

    ensureSpace(totalHeight);

    for (const line of textLines) {
      page.drawText(line, {
        x: PAGE.marginX,
        y: cursorY,
        size,
        font,
        color,
      });
      cursorY -= lineHeight;
    }

    cursorY -= THEME.paragraphGap;
  }

  return pdf.save();
}

export const getDocumentFormat = (fileName: string): DocumentFormat | null => detectFormat(fileName);

export async function convertDocumentToPdf(
  input: Uint8Array,
  fileName: string,
  format = detectFormat(fileName),
): Promise<Uint8Array> {
  if (!format) {
    throw new Error("Unsupported document format. Only md and docx are supported.");
  }

  const blocks = format === "md" ? markdownToBlocks(new TextDecoder().decode(input), fileName) : await docxToBlocks(input, fileName);
  return renderPdf(blocks);
}
