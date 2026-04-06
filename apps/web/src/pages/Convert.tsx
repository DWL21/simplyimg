import { useState } from 'react';
import { ToolPage } from './ToolPage';

export function Convert() {
  const [to, setTo] = useState<'jpeg' | 'png' | 'webp' | 'gif'>('webp');
  const [quality, setQuality] = useState(85);

  return (
    <ToolPage
      title="Convert"
      description="Convert between common output formats and adjust quality where the target format supports it."
      tool="convert"
      options={{ to, quality }}
      optionsPanel={
        <div className="grid">
          <label className="field">
            <span>Target format</span>
            <select value={to} onChange={(e) => setTo(e.target.value as typeof to)}>
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
              <option value="gif">GIF</option>
            </select>
          </label>
          <label className="field">
            <span>Quality: {quality}</span>
            <input className="range" type="range" min={0} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} />
          </label>
          {to === 'gif' ? <div className="muted">GIF is routed to the fallback API when the browser worker cannot encode it.</div> : null}
        </div>
      }
    />
  );
}
