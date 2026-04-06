import { useState } from 'react';
import { ToolPage } from './ToolPage';

export function Flip() {
  const [horizontal, setHorizontal] = useState(true);

  return (
    <ToolPage
      title="Flip"
      description="Mirror the image horizontally or vertically in a single pass."
      tool="flip"
      options={{ horizontal }}
      optionsPanel={
        <div className="button-row">
          <button className={horizontal ? 'button' : 'button-ghost'} type="button" onClick={() => setHorizontal(true)}>
            Horizontal
          </button>
          <button className={!horizontal ? 'button' : 'button-ghost'} type="button" onClick={() => setHorizontal(false)}>
            Vertical
          </button>
        </div>
      }
    />
  );
}
