import type { ProcessedImage } from '../types/image';

const commentNodeType = 8;
const textNodeType = 3;
const elementNodeType = 1;

const editorPrefixes = new Set(['inkscape', 'sodipodi', 'serif']);
const whitespaceSensitiveElements = new Set(['text', 'tspan', 'textPath', 'title', 'desc', 'style', 'script']);
const numericAttributes = new Set([
  'cx',
  'cy',
  'dx',
  'dy',
  'font-size',
  'height',
  'letter-spacing',
  'opacity',
  'pathLength',
  'r',
  'rx',
  'ry',
  'stroke-dashoffset',
  'stroke-miterlimit',
  'stroke-opacity',
  'stroke-width',
  'width',
  'x',
  'x1',
  'x2',
  'y',
  'y1',
  'y2',
]);
const listAttributes = new Set(['d', 'points', 'transform', 'viewBox']);
const colorAttributes = new Set(['fill', 'stroke', 'stop-color']);

interface SvgAttributeLike {
  name: string;
  localName: string;
  prefix?: string | null;
  value: string;
}

interface SvgNodeLike {
  nodeType: number;
  textContent?: string | null;
  parentNode?: {
    removeChild: (child: SvgNodeLike) => void;
  } | null;
}

interface SvgElementLike extends SvgNodeLike {
  localName: string;
  prefix?: string | null;
  attributes: ArrayLike<SvgAttributeLike>;
  childNodes: ArrayLike<SvgNodeLike>;
  removeAttribute: (name: string) => void;
  setAttribute: (name: string, value: string) => void;
}

interface SvgDocumentLike {
  documentElement: SvgElementLike;
  querySelector?: (selector: string) => unknown;
}

interface SvgParserLike {
  parseFromString: (input: string, mimeType: string) => SvgDocumentLike;
}

interface SvgSerializerLike {
  serializeToString: (node: SvgNodeLike) => string;
}

interface SvgDomScopeLike {
  DOMParser?: new () => SvgParserLike;
  XMLSerializer?: new () => SvgSerializerLike;
}

function precisionFromQuality(quality?: number) {
  const value = typeof quality === 'number' ? Math.max(1, Math.min(100, Math.round(quality))) : 80;
  if (value >= 90) return 4;
  if (value >= 70) return 3;
  if (value >= 40) return 2;
  return 1;
}

function minifyNumberToken(token: string, precision: number) {
  const value = Number(token);
  if (!Number.isFinite(value)) {
    return token;
  }

  const rounded = Number(value.toFixed(precision));
  if (Object.is(rounded, -0) || rounded === 0) {
    return '0';
  }

  const next = rounded.toString();
  if (next.startsWith('0.')) {
    return next.slice(1);
  }

  if (next.startsWith('-0.')) {
    return `-${next.slice(2)}`;
  }

  return next;
}

function minifyNumberSequence(value: string, precision: number) {
  return value
    .replace(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi, (token) => minifyNumberToken(token, precision))
    .replace(/\s*,\s*/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
}

function shortenHexColor(value: string) {
  const normalized = value.trim();
  const match = normalized.match(/^#([0-9a-f]{6})$/i);
  if (!match) {
    return normalized;
  }

  const [, hex] = match;
  if (
    hex[0].toLowerCase() === hex[1].toLowerCase() &&
    hex[2].toLowerCase() === hex[3].toLowerCase() &&
    hex[4].toLowerCase() === hex[5].toLowerCase()
  ) {
    return `#${hex[0]}${hex[2]}${hex[4]}`.toLowerCase();
  }

  return normalized.toLowerCase();
}

function optimizeStyleValue(value: string, precision: number) {
  const declarations = value
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIndex = entry.indexOf(':');
      if (separatorIndex < 0) {
        return null;
      }

      const property = entry.slice(0, separatorIndex).trim();
      const rawValue = entry.slice(separatorIndex + 1).trim();
      if (!property || !rawValue) {
        return null;
      }

      let nextValue = rawValue.replace(/\s+/g, ' ');
      if (!nextValue.includes('url(') && !nextValue.includes('#')) {
        nextValue = minifyNumberSequence(nextValue, precision);
      }

      if (property === 'fill' || property === 'stroke' || property === 'stop-color') {
        nextValue = shortenHexColor(nextValue);
      }

      return `${property}:${nextValue}`;
    })
    .filter((entry): entry is string => entry !== null);

  return declarations.join(';');
}

function shouldRemoveElement(element: SvgElementLike) {
  if (element.localName === 'metadata') {
    return true;
  }

  if (element.prefix === 'sodipodi' && element.localName === 'namedview') {
    return true;
  }

  if ((element.localName === 'title' || element.localName === 'desc') && !element.textContent?.trim()) {
    return true;
  }

  return false;
}

function shouldRemoveAttribute(attribute: SvgAttributeLike) {
  if (attribute.prefix && editorPrefixes.has(attribute.prefix)) {
    return true;
  }

  return attribute.name === 'xmlns:inkscape'
    || attribute.name === 'xmlns:sodipodi'
    || attribute.name === 'xmlns:serif';
}

function optimizeElement(element: SvgElementLike, precision: number) {
  const attributes = Array.from(element.attributes);
  for (const attribute of attributes) {
    if (shouldRemoveAttribute(attribute)) {
      element.removeAttribute(attribute.name);
      continue;
    }

    const trimmedValue = attribute.value.trim();
    if (!trimmedValue) {
      element.removeAttribute(attribute.name);
      continue;
    }

    let nextValue = trimmedValue;
    if (attribute.name === 'style') {
      nextValue = optimizeStyleValue(trimmedValue, precision);
    } else if (listAttributes.has(attribute.localName)) {
      nextValue = minifyNumberSequence(trimmedValue, precision);
    } else if (numericAttributes.has(attribute.localName)) {
      nextValue = minifyNumberSequence(trimmedValue, precision);
    } else if (colorAttributes.has(attribute.localName)) {
      nextValue = shortenHexColor(trimmedValue);
    } else if (attribute.localName === 'preserveAspectRatio') {
      nextValue = trimmedValue.replace(/\s+/g, ' ');
    }

    if (!nextValue) {
      element.removeAttribute(attribute.name);
    } else if (nextValue !== attribute.value) {
      element.setAttribute(attribute.name, nextValue);
    }
  }

  const children = Array.from(element.childNodes);
  for (const child of children) {
    if (child.nodeType === commentNodeType) {
      child.parentNode?.removeChild(child);
      continue;
    }

    if (child.nodeType === textNodeType) {
      if (!whitespaceSensitiveElements.has(element.localName) && !child.textContent?.trim()) {
        child.parentNode?.removeChild(child);
      }
      continue;
    }

    if (child.nodeType !== elementNodeType) {
      continue;
    }

    const childElement = child as SvgElementLike;
    if (shouldRemoveElement(childElement)) {
      child.parentNode?.removeChild(child);
      continue;
    }

    optimizeElement(childElement, precision);
  }
}

export function optimizeSvgMarkup(source: string, quality?: number) {
  const domScope = globalThis as unknown as SvgDomScopeLike;
  const parserCtor = domScope.DOMParser;
  const serializerCtor = domScope.XMLSerializer;
  if (!parserCtor || !serializerCtor) {
    throw new Error('SVG 최적화를 지원하지 않는 환경입니다.');
  }

  const parser = new parserCtor();
  const document = parser.parseFromString(source, 'image/svg+xml');
  const parserError = typeof document.querySelector === 'function'
    ? document.querySelector('parsererror')
    : null;
  if (parserError || document.documentElement.localName !== 'svg') {
    throw new Error('SVG 파일을 해석할 수 없습니다.');
  }

  const svg = document.documentElement;
  optimizeElement(svg, precisionFromQuality(quality));

  const serialized = new serializerCtor().serializeToString(svg);
  return serialized
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export async function optimizeSvgFile(file: File, quality?: number): Promise<ProcessedImage> {
  const optimized = optimizeSvgMarkup(await file.text(), quality);
  const blob = new Blob([optimized], { type: 'image/svg+xml' });
  return {
    blob,
    mimeType: 'image/svg+xml',
  };
}
