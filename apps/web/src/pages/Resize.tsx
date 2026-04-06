import { useState } from 'react';
import { ResizeOptions } from '../components/options/ResizeOptions';
import { appMessages } from '../i18n/messages';
import type { ResizeOptions as ResizeToolOptions } from '../types/image';
import { ToolWorkspace } from './ToolWorkspace';

export function Resize() {
  const [options, setOptions] = useState<ResizeToolOptions>({ width: 1280, height: 720 });

  return (
    <ToolWorkspace
      title={appMessages.tools.resize.workspaceTitle}
      description={appMessages.tools.resize.workspaceDescription}
      tool="resize"
      options={options}
      onOptionsChange={(nextOptions) => setOptions(nextOptions as ResizeToolOptions)}
      processLabel={appMessages.tools.resize.processLabel}
      optionsPanel={
        <ResizeOptions
          width={options.width}
          height={options.height}
          onWidthChange={(width) => setOptions((current) => ({ ...current, width }))}
          onHeightChange={(height) => setOptions((current) => ({ ...current, height }))}
        />
      }
    />
  );
}
