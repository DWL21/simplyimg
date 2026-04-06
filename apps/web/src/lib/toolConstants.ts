import type { ToolName } from '../types/image';

export const TOOL_LABELS: Record<ToolName, string> = {
  compress: '압축',
  resize: '크기 조절',
  convert: '형식 변환',
  crop: '자르기',
  rotate: '회전',
  flip: '반전',
};

export const ALL_TOOLS: ToolName[] = ['compress', 'resize', 'convert', 'crop', 'rotate', 'flip'];
