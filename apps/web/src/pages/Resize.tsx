import { useState } from 'react';
import { ToolPage } from './ToolPage';

export function Resize() {
  const [width, setWidth] = useState(1280);
  const [height, setHeight] = useState(720);
  const [fit, setFit] = useState<'contain' | 'cover' | 'exact'>('contain');

  return (
    <ToolPage
      title="Resize"
      description="Specify target dimensions and choose how the image should fit inside that frame."
      tool="resize"
      options={{ width, height, fit }}
      optionsPanel={
        <div className="grid">
          <label className="field">
            <span>Width</span>
            <input type="number" value={width} onChange={(e) => setWidth(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Height</span>
            <input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Fit mode</span>
            <select value={fit} onChange={(e) => setFit(e.target.value as typeof fit)}>
              <option value="contain">Contain</option>
              <option value="cover">Cover</option>
              <option value="exact">Exact</option>
            </select>
          </label>
        </div>
      }
    />
  );
}
