import type { ToolName } from '../types/image';
import { getToolLabel } from '../i18n/messages';

export const ALL_TOOLS: ToolName[] = ['compress', 'resize', 'convert', 'crop', 'rotate', 'flip'];

export function getToolLabels(locale?: string): Record<ToolName, string> {
  return {
    compress: getToolLabel('compress', locale),
    resize: getToolLabel('resize', locale),
    convert: getToolLabel('convert', locale),
    crop: getToolLabel('crop', locale),
    rotate: getToolLabel('rotate', locale),
    flip: getToolLabel('flip', locale),
  };
}

export function getToolDisplayLabel(tool: ToolName, locale?: string) {
  return getToolLabel(tool, locale);
}
