import { useState } from 'react';
import { CompressOptions } from '../components/options/CompressOptions';
import { appMessages } from '../i18n/messages';
import { ToolWorkspace } from './ToolWorkspace';

export function Compress() {
  const [quality, setQuality] = useState(80);
  const [format, setFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg');

  return (
    <ToolWorkspace
      title={appMessages.tools.compress.workspaceTitle}
      description={appMessages.tools.compress.workspaceDescription}
      tool="compress"
      options={{ quality, format }}
      processLabel={appMessages.tools.compress.processLabel}
      optionsPanel={
        <CompressOptions
          quality={quality}
          format={format}
          onQualityChange={setQuality}
          onFormatChange={setFormat}
        />
      }
    />
  );
}
