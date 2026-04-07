import { getCurrentLocale } from '../i18n/messages';

function fallbackMarkdownName() {
  return getCurrentLocale() === 'ko' ? '새 문서' : 'untitled';
}

export function normalizeMarkdownFileName(value: string) {
  const sanitized = value
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const baseName = sanitized || fallbackMarkdownName();
  return /\.(md|markdown)$/i.test(baseName) ? baseName : `${baseName}.md`;
}
