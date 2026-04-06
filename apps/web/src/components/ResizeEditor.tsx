import { useEffect, useRef, useState } from 'react';

interface Props {
  imageUrl: string;
  width: number;
  height: number;
  crop?: { x: number; y: number; width: number; height: number };
  onChange: (next: { width: number; height: number; crop: { x: number; y: number; width: number; height: number } }) => void;
}

type Handle = 'tl' | 'tr' | 'bl' | 'br' | 'tm' | 'bm' | 'ml' | 'mr';

interface ResizeDragState {
  mode: 'resize';
  handle: Handle;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
}

interface MoveDragState {
  mode: 'move';
  startX: number;
  startY: number;
  startCropX: number;
  startCropY: number;
}

type DragState = ResizeDragState | MoveDragState;

const MIN_SIZE = 1;

export default function ResizeEditor({ imageUrl, width, height, crop, onChange }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const onChangeRef = useRef(onChange);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => () => {
    document.body.style.cursor = '';
  }, []);

  function getLayout() {
    const frame = frameRef.current;
    if (!frame) {
      return null;
    }

    const rect = frame.getBoundingClientRect();
    const scale = Math.min((rect.width * 0.84) / width, (rect.height * 0.8) / height);
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

  function getSafeCrop() {
    const maxWidth = Math.max(1, naturalSize.width);
    const maxHeight = Math.max(1, naturalSize.height);
    const nextCrop = crop ?? { x: 0, y: 0, width: maxWidth, height: maxHeight };
    const safeWidth = Math.max(1, Math.min(nextCrop.width, maxWidth));
    const safeHeight = Math.max(1, Math.min(nextCrop.height, maxHeight));
    return {
      x: Math.max(0, Math.min(nextCrop.x, maxWidth - safeWidth)),
      y: Math.max(0, Math.min(nextCrop.y, maxHeight - safeHeight)),
      width: safeWidth,
      height: safeHeight,
    };
  }

  function nextSizeFromDrag(drag: ResizeDragState, clientX: number, clientY: number) {
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

  function nextCropFromMove(drag: MoveDragState, clientX: number, clientY: number) {
    const layout = getLayout();
    if (!layout) {
      return null;
    }

    const activeCrop = getSafeCrop();
    const scaleX = layout.boxWidth / activeCrop.width;
    const scaleY = layout.boxHeight / activeCrop.height;
    const deltaX = Math.round((clientX - drag.startX) / scaleX);
    const deltaY = Math.round((clientY - drag.startY) / scaleY);

    return {
      ...activeCrop,
      x: Math.max(0, Math.min(drag.startCropX - deltaX, naturalSize.width - activeCrop.width)),
      y: Math.max(0, Math.min(drag.startCropY - deltaY, naturalSize.height - activeCrop.height)),
    };
  }

  useEffect(() => {
    if (!naturalSize.width || !naturalSize.height || crop) {
      return;
    }

    onChangeRef.current({
      width,
      height,
      crop: {
        x: 0,
        y: 0,
        width: naturalSize.width,
        height: naturalSize.height,
      },
    });
  }, [crop, height, naturalSize.height, naturalSize.width, width]);

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }

      if (drag.mode === 'resize') {
        const nextSize = nextSizeFromDrag(drag, event.clientX, event.clientY);
        if (nextSize) {
          onChangeRef.current({
            width: nextSize.width,
            height: nextSize.height,
            crop: getSafeCrop(),
          });
        }
        return;
      }

      const nextCrop = nextCropFromMove(drag, event.clientX, event.clientY);
      if (nextCrop) {
        onChangeRef.current({
          width,
          height,
          crop: nextCrop,
        });
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
  const safeCrop = getSafeCrop();
  const imageLeft = layout ? layout.left - safeCrop.x * (layout.boxWidth / safeCrop.width) : 0;
  const imageTop = layout ? layout.top - safeCrop.y * (layout.boxHeight / safeCrop.height) : 0;
  const imageWidth = layout ? naturalSize.width * (layout.boxWidth / safeCrop.width) : 0;
  const imageHeight = layout ? naturalSize.height * (layout.boxHeight / safeCrop.height) : 0;

  return (
    <div className="resize-editor-frame" ref={frameRef}>
      <div className="resize-editor-stage" />
      {layout ? (
        <div
          className="resize-frame-box"
          style={{
            left: layout.left,
            top: layout.top,
            width: layout.boxWidth,
            height: layout.boxHeight,
          }}
        >
          <div
            className="resize-frame-canvas"
            onMouseDown={(event) => {
              if (event.target !== event.currentTarget && !(event.target as HTMLElement).classList.contains('resize-object-image')) {
                return;
              }

              dragRef.current = {
                mode: 'move',
                startX: event.clientX,
                startY: event.clientY,
                startCropX: safeCrop.x,
                startCropY: safeCrop.y,
              };
              document.body.style.cursor = 'grabbing';
            }}
          >
            <img
              src={imageUrl}
              className="resize-object-image"
              draggable={false}
              alt=""
              style={{
                left: imageLeft - layout.left,
                top: imageTop - layout.top,
                width: imageWidth,
                height: imageHeight,
              }}
              onLoad={(event) => {
                setNaturalSize({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                });
              }}
            />
          </div>
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
                  mode: 'resize',
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
