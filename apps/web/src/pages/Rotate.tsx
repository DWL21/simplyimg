import { useState } from 'react';
import { ToolPage } from './ToolPage';

export function Rotate() {
  const [degrees, setDegrees] = useState<90 | 180 | 270>(90);

  return (
    <ToolPage
      title="Rotate"
      description="Apply a quarter-turn rotation without leaving the current page."
      tool="rotate"
      options={{ degrees }}
      optionsPanel={
        <div className="button-row">
          {[90, 180, 270].map((value) => (
            <button
              key={value}
              className={degrees === value ? 'button' : 'button-ghost'}
              type="button"
              onClick={() => setDegrees(value as 90 | 180 | 270)}
            >
              {value}°
            </button>
          ))}
        </div>
      }
    />
  );
}
