import { useState } from 'react';
import { CropCanvas } from '../components/editor/CropCanvas';
import { ToolPage } from './ToolPage';

export function Crop() {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);

  return (
    <ToolPage
      title="Crop"
      description="Crop to an exact rectangle now, with room to layer interactive handles on top later."
      tool="crop"
      options={{ x, y, width, height }}
      optionsPanel={
        <div className="grid">
          <CropCanvas />
          <label className="field">
            <span>X</span>
            <input type="number" min={0} value={x} onChange={(e) => setX(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Y</span>
            <input type="number" min={0} value={y} onChange={(e) => setY(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Width</span>
            <input type="number" min={1} value={width} onChange={(e) => setWidth(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Height</span>
            <input type="number" min={1} value={height} onChange={(e) => setHeight(Number(e.target.value))} />
          </label>
        </div>
      }
    />
  );
}
