import { useCallback } from 'react';
import type { ToolName, ToolOptions } from '../types/image';
import { useImageStore } from '../store/imageStore';

export function useImageProcess() {
  const processAll = useImageStore((state) => state.processAll);
  const activeTool = useImageStore((state) => state.activeTool);

  return {
    activeTool,
    process: useCallback(
      (tool: ToolName, options: ToolOptions) => processAll(tool, options),
      [processAll],
    ),
  };
}
