import { useEffect, useRef, useState } from 'react';
import type { CropOptions } from '../types/image';

interface Props {
  imageUrl: string;
  value: CropOptions | null;
  zoom: number;
  pan: { x: number; y: number };
  panEnabled: boolean;
  onPanChange: (pan: { x: number; y: number }) => void;
  onImageLoad?: (naturalWidth: number, naturalHeight: number) => void;
  onChange: (crop: CropOptions | null) => void;
}

type HitZone = 'tl' | 'tr' | 'bl' | 'br' | 'inside' | 'outside';
type DragMode = 'move' | 'resize' | 'new' | 'pan';

interface DragState {
  mode: DragMode;
  fixedImgX: number;
  fixedImgY: number;
  offsetX: number;
  offsetY: number;
  startClientX: number;
  startClientY: number;
  startCrop: CropOptions;
  startPanX: number;
  startPanY: number;
}

const HIT_RADIUS = 10;
const DEFAULT_PAD = 0.1;
const CLICK_DRAG_THRESHOLD = 4;

const CURSOR: Record<HitZone, string> = {
  tl: 'nwse-resize',
  br: 'nwse-resize',
  tr: 'nesw-resize',
  bl: 'nesw-resize',
  inside: 'move',
  outside: 'crosshair',
};

export default function CropEditor({
  imageUrl,
  value,
  zoom,
  pan,
  panEnabled,
  onPanChange,
  onImageLoad,
  onChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const naturalSizeRef = useRef({ w: 0, h: 0 });
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const dragRef = useRef<DragState | null>(null);
  const cachedRectRef = useRef<DOMRect | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const onPanChangeRef = useRef(onPanChange);
  const onImageLoadRef = useRef(onImageLoad);

  onChangeRef.current = onChange;
  valueRef.current = value;
  onPanChangeRef.current = onPanChange;
  onImageLoadRef.current = onImageLoad;

  useEffect(() => () => { document.body.style.cursor = ''; }, []);

  function getLayout() {
    const el = containerRef.current;
    const { w: iw, h: ih } = naturalSize;
    if (!el || !iw || !ih) {
      return null;
    }

    const { width: cw, height: ch } = el.getBoundingClientRect();
    const imageRatio = iw / ih;
    const containerRatio = cw / ch;
    let baseWidth = 0;
    let baseHeight = 0;

    if (imageRatio > containerRatio) {
      baseWidth = cw;
      baseHeight = cw / imageRatio;
    } else {
      baseWidth = ch * imageRatio;
      baseHeight = ch;
    }

    const rw = baseWidth * zoom;
    const rh = baseHeight * zoom;

    return {
      rw,
      rh,
      ox: (cw - rw) / 2 + pan.x,
      oy: (ch - rh) / 2 + pan.y,
      iw,
      ih,
    };
  }

  function toImage(cx: number, cy: number) {
    const layout = getLayout();
    if (!layout) {
      return null;
    }

    return {
      x: Math.max(0, Math.min(layout.iw, ((cx - layout.ox) / layout.rw) * layout.iw)),
      y: Math.max(0, Math.min(layout.ih, ((cy - layout.oy) / layout.rh) * layout.ih)),
    };
  }

  function clampCrop(crop: CropOptions): CropOptions {
    const { w, h } = naturalSizeRef.current;
    const x = Math.max(0, Math.min(crop.x, w - 1));
    const y = Math.max(0, Math.min(crop.y, h - 1));

    return {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.max(1, Math.min(Math.round(crop.width), w - x)),
      height: Math.max(1, Math.min(Math.round(crop.height), h - y)),
    };
  }

  function makeBox(ax: number, ay: number, bx: number, by: number): CropOptions {
    const x = Math.max(0, Math.min(ax, bx));
    const y = Math.max(0, Math.min(ay, by));

    return clampCrop({
      x,
      y,
      width: Math.abs(bx - ax),
      height: Math.abs(by - ay),
    });
  }

  function hitTest(cx: number, cy: number): HitZone {
    const currentCrop = valueRef.current;
    const layout = getLayout();
    if (!currentCrop || !layout) {
      return 'outside';
    }

    const left = layout.ox + (currentCrop.x / layout.iw) * layout.rw;
    const top = layout.oy + (currentCrop.y / layout.ih) * layout.rh;
    const right = layout.ox + ((currentCrop.x + currentCrop.width) / layout.iw) * layout.rw;
    const bottom = layout.oy + ((currentCrop.y + currentCrop.height) / layout.ih) * layout.rh;
    const near = (px: number, py: number) => Math.abs(cx - px) <= HIT_RADIUS && Math.abs(cy - py) <= HIT_RADIUS;

    if (near(left, top)) return 'tl';
    if (near(right, top)) return 'tr';
    if (near(left, bottom)) return 'bl';
    if (near(right, bottom)) return 'br';
    if (cx >= left && cx <= right && cy >= top && cy <= bottom) return 'inside';
    return 'outside';
  }

  useEffect(() => {
    function onMouseMove(event: MouseEvent) {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }

      if (drag.mode === 'pan') {
        onPanChangeRef.current({
          x: drag.startPanX + (event.clientX - drag.startClientX),
          y: drag.startPanY + (event.clientY - drag.startClientY),
        });
        return;
      }

      const rect = cachedRectRef.current;
      if (!rect) {
        return;
      }

      const cx = event.clientX - rect.left;
      const cy = event.clientY - rect.top;
      const imagePoint = toImage(cx, cy);
      if (!imagePoint) {
        return;
      }

      let nextCrop: CropOptions;
      if (drag.mode === 'move') {
        const { w, h } = naturalSizeRef.current;
        nextCrop = clampCrop({
          x: imagePoint.x - drag.offsetX,
          y: imagePoint.y - drag.offsetY,
          width: drag.startCrop.width,
          height: drag.startCrop.height,
        });
        nextCrop = {
          ...nextCrop,
          x: Math.max(0, Math.min(nextCrop.x, w - nextCrop.width)),
          y: Math.max(0, Math.min(nextCrop.y, h - nextCrop.height)),
        };
      } else {
        nextCrop = makeBox(drag.fixedImgX, drag.fixedImgY, imagePoint.x, imagePoint.y);
      }

      onChangeRef.current(nextCrop);
    }

    function onMouseUp(event: MouseEvent) {
      const drag = dragRef.current;
      if (drag?.mode === 'new') {
        const movedX = Math.abs(event.clientX - drag.startClientX);
        const movedY = Math.abs(event.clientY - drag.startClientY);
        const currentCrop = valueRef.current;
        const shouldClearSelection = movedX < CLICK_DRAG_THRESHOLD && movedY < CLICK_DRAG_THRESHOLD;
        const createdTinyCrop = currentCrop !== null
          && currentCrop.width <= 1
          && currentCrop.height <= 1;

        if (shouldClearSelection || createdTinyCrop) {
          onChangeRef.current(null);
        }
      }

      dragRef.current = null;
      cachedRectRef.current = null;
      document.body.style.cursor = '';
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  function handleMouseDown(event: React.MouseEvent) {
    event.preventDefault();
    const el = containerRef.current;
    if (!el) {
      return;
    }

    const rect = el.getBoundingClientRect();
    cachedRectRef.current = rect;
    const cx = event.clientX - rect.left;
    const cy = event.clientY - rect.top;
    const imagePoint = toImage(cx, cy);
    if (!imagePoint) {
      return;
    }

    const hit = hitTest(cx, cy);
    const currentCrop = valueRef.current;
    const shouldPanPreview = panEnabled && currentCrop !== null && hit === 'outside';

    document.body.style.cursor = shouldPanPreview ? 'grabbing' : CURSOR[hit];

    if (shouldPanPreview) {
      dragRef.current = {
        mode: 'pan',
        fixedImgX: 0,
        fixedImgY: 0,
        offsetX: 0,
        offsetY: 0,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startCrop: currentCrop,
        startPanX: pan.x,
        startPanY: pan.y,
      };
      return;
    }

    if (hit === 'inside' && currentCrop) {
      dragRef.current = {
        mode: 'move',
        fixedImgX: 0,
        fixedImgY: 0,
        offsetX: imagePoint.x - currentCrop.x,
        offsetY: imagePoint.y - currentCrop.y,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startCrop: currentCrop,
        startPanX: 0,
        startPanY: 0,
      };
      return;
    }

    if ((hit === 'tl' || hit === 'tr' || hit === 'bl' || hit === 'br') && currentCrop) {
      const fixedImgX = hit === 'tl' || hit === 'bl' ? currentCrop.x + currentCrop.width : currentCrop.x;
      const fixedImgY = hit === 'tl' || hit === 'tr' ? currentCrop.y + currentCrop.height : currentCrop.y;
      dragRef.current = {
        mode: 'resize',
        fixedImgX,
        fixedImgY,
        offsetX: 0,
        offsetY: 0,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startCrop: currentCrop,
        startPanX: 0,
        startPanY: 0,
      };
      return;
    }

    dragRef.current = {
      mode: 'new',
      fixedImgX: imagePoint.x,
      fixedImgY: imagePoint.y,
      offsetX: 0,
      offsetY: 0,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startCrop: currentCrop ?? { x: 0, y: 0, width: 1, height: 1 },
      startPanX: 0,
      startPanY: 0,
    };
  }

  function handleMouseMove(event: React.MouseEvent) {
    if (dragRef.current) {
      return;
    }

    const el = containerRef.current;
    if (!el) {
      return;
    }

    const rect = el.getBoundingClientRect();
    const hit = hitTest(event.clientX - rect.left, event.clientY - rect.top);
    el.style.cursor = panEnabled && value !== null && hit === 'outside' ? 'grab' : CURSOR[hit];
  }

  const layout = getLayout();
  const displayRect = (() => {
    if (!value || !layout) {
      return null;
    }

    return {
      left: (value.x / layout.iw) * layout.rw,
      top: (value.y / layout.ih) * layout.rh,
      width: (value.width / layout.iw) * layout.rw,
      height: (value.height / layout.ih) * layout.rh,
    };
  })();

  return (
    <div
      className="crop-editor"
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
    >
      {layout ? (
        <div
          className="crop-stage"
          style={{
            left: layout.ox,
            top: layout.oy,
            width: layout.rw,
            height: layout.rh,
          }}
        >
          <img
            src={imageUrl}
            className="crop-img"
            onLoad={(event) => {
              const { naturalWidth, naturalHeight } = event.currentTarget;
              naturalSizeRef.current = { w: naturalWidth, h: naturalHeight };
              setNaturalSize((current) => (
                current.w === naturalWidth && current.h === naturalHeight
                  ? current
                  : { w: naturalWidth, h: naturalHeight }
              ));
              onImageLoadRef.current?.(naturalWidth, naturalHeight);

              if (!valueRef.current) {
                const pad = DEFAULT_PAD;
                onChangeRef.current({
                  x: Math.round(naturalWidth * pad),
                  y: Math.round(naturalHeight * pad),
                  width: Math.round(naturalWidth * (1 - 2 * pad)),
                  height: Math.round(naturalHeight * (1 - 2 * pad)),
                });
              }
            }}
            draggable={false}
            alt=""
          />

          {value && displayRect && displayRect.width > 0 && displayRect.height > 0 ? (
            <div
              className="crop-box"
              style={{
                left: displayRect.left,
                top: displayRect.top,
                width: displayRect.width,
                height: displayRect.height,
              }}
            >
              <div className="crop-handle crop-handle-tl" />
              <div className="crop-handle crop-handle-tr" />
              <div className="crop-handle crop-handle-bl" />
              <div className="crop-handle crop-handle-br" />
            </div>
          ) : null}
        </div>
      ) : (
        <img
          src={imageUrl}
          className="crop-img crop-img-measure"
          onLoad={(event) => {
            const { naturalWidth, naturalHeight } = event.currentTarget;
            naturalSizeRef.current = { w: naturalWidth, h: naturalHeight };
            setNaturalSize((current) => (
              current.w === naturalWidth && current.h === naturalHeight
                ? current
                : { w: naturalWidth, h: naturalHeight }
            ));
            onImageLoadRef.current?.(naturalWidth, naturalHeight);

            if (!valueRef.current) {
              const pad = DEFAULT_PAD;
              onChangeRef.current({
                x: Math.round(naturalWidth * pad),
                y: Math.round(naturalHeight * pad),
                width: Math.round(naturalWidth * (1 - 2 * pad)),
                height: Math.round(naturalHeight * (1 - 2 * pad)),
              });
            }
          }}
          draggable={false}
          alt=""
        />
      )}
    </div>
  );
}
