import { useEffect, useRef, useState } from 'react';

interface Props {
  imageUrl: string;
  width: number;
  height: number;
  onResize: (size: { width: number; height: number }) => void;
}

type Handle = 'tl' | 'tr' | 'bl' | 'br' | 'tm' | 'bm' | 'ml' | 'mr';

interface DragState {
  handle: Handle;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
}

const MIN_SIZE = 1;

export default function ResizeEditor({ imageUrl, width, height, onResize }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const onResizeRef = useRef(onResize);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    onResizeRef.current = onResize;
  }, [onResize]);

  useEffect(() => () => {
    document.body.style.cursor = '';
  }, []);

  function getLayout() {
    const frame = frameRef.current;
    if (!frame) {
      return null;
    }

    const rect = frame.getBoundingClientRect();
    const maxWidth = Math.max(naturalSize.width, width);
    const maxHeight = Math.max(naturalSize.height, height);
    const scale = Math.min((rect.width * 0.82) / maxWidth, (rect.height * 0.78) / maxHeight);
    const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    const boxWidth = width * safeScale;
    const boxHeight = height * safeScale;

    return {
      scale: safeScale,
      left: (rect.width - boxWidth) / 2,
      top: (rect.height - boxHeight) / 2,
      boxWidth,
      boxHeight,
    };
  }

  function nextSizeFromDrag(drag: DragState, clientX: number, clientY: number) {
    const layout = getLayout();
    if (!layout) {
      return null;
    }

    const deltaX = (clientX - drag.startX) / layout.scale;
    const deltaY = (clientY - drag.startY) / layout.scale;
    const ratio = drag.startWidth / drag.startHeight;

    if (drag.handle === 'ml' || drag.handle === 'mr') {
      const signedDelta = drag.handle === 'mr' ? deltaX : -deltaX;
      return {
        width: Math.max(MIN_SIZE, Math.round(drag.startWidth + signedDelta)),
        height: drag.startHeight,
      };
    }

    if (drag.handle === 'tm' || drag.handle === 'bm') {
      const signedDelta = drag.handle === 'bm' ? deltaY : -deltaY;
      return {
        width: drag.startWidth,
        height: Math.max(MIN_SIZE, Math.round(drag.startHeight + signedDelta)),
      };
    }

    const signedDeltaX = (drag.handle === 'tr' || drag.handle === 'br') ? deltaX : -deltaX;
    const signedDeltaY = (drag.handle === 'bl' || drag.handle === 'br') ? deltaY : -deltaY;
    const widthFromHeight = signedDeltaY * ratio;
    const dominantDelta = Math.abs(signedDeltaX) >= Math.abs(widthFromHeight) ? signedDeltaX : widthFromHeight;
    const nextWidth = Math.max(MIN_SIZE, Math.round(drag.startWidth + dominantDelta));

    return {
      width: nextWidth,
      height: Math.max(MIN_SIZE, Math.round(nextWidth / ratio)),
    };
  }

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }

      const nextSize = nextSizeFromDrag(drag, event.clientX, event.clientY);
      if (nextSize) {
        onResizeRef.current(nextSize);
      }
    }

    function handleMouseUp() {
      dragRef.current = null;
      document.body.style.cursor = '';
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [height, naturalSize.height, naturalSize.width, width]);

  const layout = getLayout();

  return (
    <div className="resize-editor-frame" ref={frameRef}>
      <div className="resize-editor-stage" />
      {layout ? (
        <div
          className="resize-object"
          style={{
            left: layout.left,
            top: layout.top,
            width: layout.boxWidth,
            height: layout.boxHeight,
          }}
        >
          <img
            src={imageUrl}
            className="resize-object-image"
            draggable={false}
            alt=""
            onLoad={(event) => {
              setNaturalSize({
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
              });
            }}
          />
          <div className="resize-object-label">
            {width} x {height}
          </div>
          {(['tl', 'tm', 'tr', 'mr', 'br', 'bm', 'bl', 'ml'] as const).map((handle) => (
            <button
              key={handle}
              type="button"
              className={`resize-handle resize-handle-${handle}`}
              onMouseDown={(event) => {
                event.preventDefault();
                dragRef.current = {
                  handle,
                  startX: event.clientX,
                  startY: event.clientY,
                  startWidth: width,
                  startHeight: height,
                };
                document.body.style.cursor = window.getComputedStyle(event.currentTarget).cursor;
              }}
              aria-label={`Resize ${handle}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
