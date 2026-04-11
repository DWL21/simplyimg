export interface TextEditResult {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export function wrapSelection(
  value: string,
  selStart: number,
  selEnd: number,
  prefix: string,
  suffix: string,
  placeholder: string,
): TextEditResult {
  if (selStart !== selEnd) {
    const before = value.slice(0, selStart);
    const selected = value.slice(selStart, selEnd);
    const after = value.slice(selEnd);
    const newValue = before + prefix + selected + suffix + after;
    return {
      value: newValue,
      selectionStart: selStart + prefix.length,
      selectionEnd: selEnd + prefix.length,
    };
  }

  const before = value.slice(0, selStart);
  const after = value.slice(selStart);
  const newValue = before + prefix + placeholder + suffix + after;
  return {
    value: newValue,
    selectionStart: selStart + prefix.length,
    selectionEnd: selStart + prefix.length + placeholder.length,
  };
}

export function insertAtLineStart(
  value: string,
  selStart: number,
  selEnd: number,
  linePrefix: string,
): TextEditResult {
  const lineStart = value.lastIndexOf('\n', selStart - 1) + 1;
  const before = value.slice(0, lineStart);
  const rest = value.slice(lineStart);

  const alreadyPrefixed = rest.startsWith(linePrefix);
  if (alreadyPrefixed) {
    const removed = rest.slice(linePrefix.length);
    const offset = selStart - lineStart;
    const newSelStart = Math.max(lineStart, selStart - linePrefix.length);
    const newSelEnd = Math.max(newSelStart, selEnd - linePrefix.length);
    return {
      value: before + removed,
      selectionStart: newSelStart,
      selectionEnd: newSelEnd,
    };
  }

  const newValue = before + linePrefix + rest;
  return {
    value: newValue,
    selectionStart: selStart + linePrefix.length,
    selectionEnd: selEnd + linePrefix.length,
  };
}

export function insertBlock(
  value: string,
  selStart: number,
  selEnd: number,
  before: string,
  after: string,
): TextEditResult {
  const prefix = value.slice(0, selStart);
  const suffix = value.slice(selEnd);
  const needNewlineBefore = selStart > 0 && value[selStart - 1] !== '\n';
  const insert = (needNewlineBefore ? '\n' : '') + before + after;

  const newValue = prefix + insert + suffix;
  const cursorPos = prefix.length + insert.length - after.length;
  return {
    value: newValue,
    selectionStart: cursorPos,
    selectionEnd: cursorPos,
  };
}

export function handleTabIndent(
  value: string,
  selStart: number,
  selEnd: number,
): TextEditResult {
  const INDENT = '  ';
  const lineStart = value.lastIndexOf('\n', selStart - 1) + 1;
  const lineEnd = value.indexOf('\n', selEnd);
  const end = lineEnd === -1 ? value.length : lineEnd;
  const lines = value.slice(lineStart, end).split('\n');

  const indented = lines.map((line) => INDENT + line).join('\n');
  const newValue = value.slice(0, lineStart) + indented + value.slice(end);

  return {
    value: newValue,
    selectionStart: selStart + INDENT.length,
    selectionEnd: selEnd + INDENT.length * lines.length,
  };
}

export function handleTabOutdent(
  value: string,
  selStart: number,
  selEnd: number,
): TextEditResult {
  const lineStart = value.lastIndexOf('\n', selStart - 1) + 1;
  const lineEnd = value.indexOf('\n', selEnd);
  const end = lineEnd === -1 ? value.length : lineEnd;
  const lines = value.slice(lineStart, end).split('\n');

  let removedTotal = 0;
  let removedBeforeCursor = 0;
  const outdented = lines.map((line, i) => {
    let removed = 0;
    let result = line;
    if (result.startsWith('  ')) {
      result = result.slice(2);
      removed = 2;
    } else if (result.startsWith(' ')) {
      result = result.slice(1);
      removed = 1;
    }
    removedTotal += removed;
    if (i === 0) {
      removedBeforeCursor = removed;
    }
    return result;
  }).join('\n');

  const newValue = value.slice(0, lineStart) + outdented + value.slice(end);
  return {
    value: newValue,
    selectionStart: Math.max(lineStart, selStart - removedBeforeCursor),
    selectionEnd: Math.max(selStart - removedBeforeCursor, selEnd - removedTotal),
  };
}

export function handleAutoIndent(
  value: string,
  selStart: number,
  selEnd: number,
): TextEditResult | null {
  const lineStart = value.lastIndexOf('\n', selStart - 1) + 1;
  const currentLine = value.slice(lineStart, selStart);
  const indentMatch = currentLine.match(/^(\s*)/);
  const indent = indentMatch ? indentMatch[1] : '';

  const prefix = value.slice(0, selStart);
  const suffix = value.slice(selEnd);
  const insert = '\n' + indent;
  const newValue = prefix + insert + suffix;

  const cursorPos = prefix.length + insert.length;
  return {
    value: newValue,
    selectionStart: cursorPos,
    selectionEnd: cursorPos,
  };
}

const CJK_RANGE = /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af\u3400-\u4dbf]/;

export function computeWordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;

  let count = 0;
  let inWord = false;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (CJK_RANGE.test(ch)) {
      if (inWord) {
        count++;
        inWord = false;
      }
      count++;
    } else if (/\s/.test(ch)) {
      if (inWord) {
        count++;
        inWord = false;
      }
    } else {
      inWord = true;
    }
  }

  if (inWord) count++;
  return count;
}

export function computeCharCount(text: string): number {
  return text.length;
}
