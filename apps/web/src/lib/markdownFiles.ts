import { getCurrentLocale } from '../i18n/messages';

function fallbackMarkdownName() {
  return getCurrentLocale() === 'ko' ? '새문서' : 'untitled';
}

export function isMarkdownFile(file: { name: string; type?: string }) {
  const lowered = file.name.toLowerCase();
  return Boolean(file.type?.includes('markdown')) || lowered.endsWith('.md') || lowered.endsWith('.markdown');
}

export function normalizeMarkdownFileName(value: string) {
  const sanitized = value
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const baseName = sanitized || fallbackMarkdownName();
  return /\.(md|markdown)$/i.test(baseName) ? baseName : `${baseName}.md`;
}
