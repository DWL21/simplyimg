import { useState } from 'react';
import { JpgConvertOptions } from '../components/options/JpgConvertOptions';
import { appMessages } from '../i18n/messages';
import { ToolWorkspace } from './ToolWorkspace';

export function Convert() {
  const [quality, setQuality] = useState(85);

  return (
    <ToolWorkspace
      title={appMessages.tools.convert.workspaceTitle}
      description={appMessages.tools.convert.workspaceDescription}
      tool="convert"
      options={{ to: 'jpeg', quality }}
      processLabel={appMessages.tools.convert.processLabel}
      optionsPanel={<JpgConvertOptions quality={quality} onQualityChange={setQuality} />}
    />
  );
}
