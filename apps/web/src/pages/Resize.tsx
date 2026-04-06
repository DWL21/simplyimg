import { useState } from 'react';
import { ResizeOptions } from '../components/options/ResizeOptions';
import { appMessages } from '../i18n/messages';
import { ToolWorkspace } from './ToolWorkspace';

export function Resize() {
  const [width, setWidth] = useState(1280);
  const [height, setHeight] = useState(720);
  const [fit, setFit] = useState<'contain' | 'cover' | 'exact'>('contain');

  return (
    <ToolWorkspace
      title={appMessages.tools.resize.workspaceTitle}
      description={appMessages.tools.resize.workspaceDescription}
      tool="resize"
      options={{ width, height, fit }}
      processLabel={appMessages.tools.resize.processLabel}
      optionsPanel={
        <ResizeOptions
          width={width}
          height={height}
          fit={fit}
          onWidthChange={setWidth}
          onHeightChange={setHeight}
          onFitChange={setFit}
        />
      }
    />
  );
}
