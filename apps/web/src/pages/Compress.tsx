import { useState } from 'react';
import { ToolPage } from './ToolPage';

export function Compress() {
  const [quality, setQuality] = useState(80);
  const [format, setFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg');

  return (
    <ToolPage
      title="Compress"
      description="Reduce file size with a quality slider and choose the output format when needed."
      tool="compress"
      options={{ quality, format }}
      optionsPanel={
        <div className="grid">
          <label className="field">
            <span>Quality: {quality}</span>
            <input className="range" type="range" min={0} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Output format</span>
            <select value={format} onChange={(e) => setFormat(e.target.value as typeof format)}>
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
            </select>
          </label>
        </div>
      }
    />
  );
}
