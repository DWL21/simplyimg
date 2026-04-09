import { useEffect, useRef, useState } from 'react';
import type { CropOptions } from '../types/image';

interface Props {
  imageUrl: string;
  value: CropOptions | null;
  zoom: number;
  pan: { x: number; y: number };
  panEnabled: boolean;
  onViewportChange: (zoom: number, pan: { x: number; y: number }) => void;
  onImageLoad?: (naturalWidth: number, naturalHeight: number) => void;
  onChange: (crop: CropOptions | null) => void;
}

type HitZone = 'tl' | 'tr' | 'bl' | 'br' | 'tm' | 'bm' | 'ml' | 'mr' | 'inside' | 'outside';
type DragMode = 'move' | 'resize' | 'new' | 'pan';

interface DragState {
  mode: DragMode;
  hit: HitZone;
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

interface PinchState {
  pointerIds: [number, number];
  lastDistance: number;
  lastCenter: { x: number; y: number };
}

const HIT_RADIUS = 10;
const DEFAULT_PAD = 0.1;
const CLICK_DRAG_THRESHOLD = 4;
const PINCH_ZOOM_DAMPING = 0.4;

const CURSOR: Record<HitZone, string> = {
  tl: 'nwse-resize',
  br: 'nwse-resize',
  tr: 'nesw-resize',
  bl: 'nesw-resize',
  tm: 'ns-resize',
  bm: 'ns-resize',
  ml: 'ew-resize',
  mr: 'ew-resize',
  inside: 'move',
  outside: 'crosshair',
};

export default function CropEditor({
  imageUrl,
  value,
  zoom,
  pan,
  panEnabled,
  onViewportChange,
  onImageLoad,
  onChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const naturalSizeRef = useRef({ w: 0, h: 0 });
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const dragRef = useRef<DragState | null>(null);
  const pinchRef = useRef<PinchState | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const activePointersRef = useRef(new Map<number, { x: number; y: number }>());
  const cachedRectRef = useRef<DOMRect | null>(null);
  const defaultCropInitializedRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const onViewportChangeRef = useRef(onViewportChange);
  const onImageLoadRef = useRef(onImageLoad);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);

  onChangeRef.current = onChange;
  valueRef.current = value;
  onViewportChangeRef.current = onViewportChange;
  onImageLoadRef.current = onImageLoad;
  zoomRef.current = zoom;
  panRef.current = pan;

  useEffect(() => () => { document.body.style.cursor = ''; }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return undefined;
    }

    function preventNativeGesture(event: Event) {
      event.preventDefault();
    }

    el.addEventListener('gesturestart', preventNativeGesture, { passive: false });
    el.addEventListener('gesturechange', preventNativeGesture, { passive: false });
    el.addEventListener('gestureend', preventNativeGesture, { passive: false });

    return () => {
      el.removeEventListener('gesturestart', preventNativeGesture);
      el.removeEventListener('gesturechange', preventNativeGesture);
      el.removeEventListener('gestureend', preventNativeGesture);
    };
  }, []);

  function applyPinchZoomDamping(rawScale: number) {
    if (!Number.isFinite(rawScale) || rawScale <= 0) {
      return 1;
    }

    return Math.exp(Math.log(rawScale) * PINCH_ZOOM_DAMPING);
  }

  function commitNaturalSize(naturalWidth: number, naturalHeight: number) {
    naturalSizeRef.current = { w: naturalWidth, h: naturalHeight };
    setNaturalSize((current) => (
      current.w === naturalWidth && current.h === naturalHeight
        ? current
        : { w: naturalWidth, h: naturalHeight }
    ));
    onImageLoadRef.current?.(naturalWidth, naturalHeight);

    if (valueRef.current) {
      defaultCropInitializedRef.current = true;
      return;
    }

    if (defaultCropInitializedRef.current) {
      return;
    }

    defaultCropInitializedRef.current = true;
    const pad = DEFAULT_PAD;
    onChangeRef.current({
      x: Math.round(naturalWidth * pad),
      y: Math.round(naturalHeight * pad),
      width: Math.round(naturalWidth * (1 - 2 * pad)),
      height: Math.round(naturalHeight * (1 - 2 * pad)),
    });
  }

  useEffect(() => {
    defaultCropInitializedRef.current = value !== null;
  }, [value]);

  useEffect(() => {
    defaultCropInitializedRef.current = valueRef.current !== null;
    setNaturalSize({ w: 0, h: 0 });
    naturalSizeRef.current = { w: 0, h: 0 };
    dragRef.current = null;
    pinchRef.current = null;
    activePointerIdRef.current = null;
    const el = containerRef.current;
    activePointersRef.current.forEach((_, pointerId) => {
      if (el?.hasPointerCapture(pointerId)) {
        el.releasePointerCapture(pointerId);
      }
    });
    activePointersRef.current.clear();
    cachedRectRef.current = null;

    if (!imageUrl) {
      return undefined;
    }

    const image = new Image();
    const commit = () => commitNaturalSize(image.naturalWidth, image.naturalHeight);

    image.addEventListener('load', commit);
    image.src = imageUrl;

    if (image.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
      commit();
    }

    return () => {
      image.removeEventListener('load', commit);
    };
  }, [imageUrl]);

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

    const rw = baseWidth * zoomRef.current;
    const rh = baseHeight * zoomRef.current;

    return {
      rw,
      rh,
      ox: (cw - rw) / 2 + panRef.current.x,
      oy: (ch - rh) / 2 + panRef.current.y,
      iw,
      ih,
    };
  }

  function getFramePoint(clientX: number, clientY: number) {
    const el = containerRef.current;
    if (!el) {
      return null;
    }

    const rect = el.getBoundingClientRect();
    return {
      x: clientX - rect.left - rect.width / 2,
      y: clientY - rect.top - rect.height / 2,
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
    if (Math.abs(cy - top) <= HIT_RADIUS && cx >= left && cx <= right) return 'tm';
    if (Math.abs(cy - bottom) <= HIT_RADIUS && cx >= left && cx <= right) return 'bm';
    if (Math.abs(cx - left) <= HIT_RADIUS && cy >= top && cy <= bottom) return 'ml';
    if (Math.abs(cx - right) <= HIT_RADIUS && cy >= top && cy <= bottom) return 'mr';
    if (cx >= left && cx <= right && cy >= top && cy <= bottom) return 'inside';
    return 'outside';
  }

  function resizeFromHandle(drag: DragState, imagePoint: { x: number; y: number }): CropOptions {
    const { w, h } = naturalSizeRef.current;

    if (drag.hit === 'tl' || drag.hit === 'tr' || drag.hit === 'bl' || drag.hit === 'br') {
      return makeBox(drag.fixedImgX, drag.fixedImgY, imagePoint.x, imagePoint.y);
    }

    const startLeft = drag.startCrop.x;
    const startTop = drag.startCrop.y;
    const startRight = drag.startCrop.x + drag.startCrop.width;
    const startBottom = drag.startCrop.y + drag.startCrop.height;

    if (drag.hit === 'ml') {
      const nextLeft = Math.max(0, Math.min(imagePoint.x, startRight - 1));
      return {
        x: Math.round(nextLeft),
        y: drag.startCrop.y,
        width: Math.max(1, Math.min(Math.round(startRight - nextLeft), w - nextLeft)),
        height: drag.startCrop.height,
      };
    }

    if (drag.hit === 'mr') {
      const nextRight = Math.max(startLeft + 1, Math.min(imagePoint.x, w));
      return {
        x: drag.startCrop.x,
        y: drag.startCrop.y,
        width: Math.max(1, Math.min(Math.round(nextRight - startLeft), w - startLeft)),
        height: drag.startCrop.height,
      };
    }

    if (drag.hit === 'tm') {
      const nextTop = Math.max(0, Math.min(imagePoint.y, startBottom - 1));
      return {
        x: drag.startCrop.x,
        y: Math.round(nextTop),
        width: drag.startCrop.width,
        height: Math.max(1, Math.min(Math.round(startBottom - nextTop), h - nextTop)),
      };
    }

    const nextBottom = Math.max(startTop + 1, Math.min(imagePoint.y, h));
    return {
      x: drag.startCrop.x,
      y: drag.startCrop.y,
      width: drag.startCrop.width,
      height: Math.max(1, Math.min(Math.round(nextBottom - startTop), h - startTop)),
    };
  }

  function updateHoverCursor(clientX: number, clientY: number) {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    const rect = el.getBoundingClientRect();
    const hit = hitTest(clientX - rect.left, clientY - rect.top);
    el.style.cursor = panEnabled && valueRef.current !== null && hit === 'outside' ? 'grab' : CURSOR[hit];
  }

  function startPinchGesture() {
    const [firstPointerId, secondPointerId] = Array.from(activePointersRef.current.keys());
    const firstPointer = activePointersRef.current.get(firstPointerId);
    const secondPointer = activePointersRef.current.get(secondPointerId);
    if (!firstPointer || !secondPointer) {
      return;
    }

    const centerPoint = getFramePoint(
      (firstPointer.x + secondPointer.x) / 2,
      (firstPointer.y + secondPointer.y) / 2,
    );
    if (!centerPoint) {
      return;
    }

    pinchRef.current = {
      pointerIds: [firstPointerId, secondPointerId],
      lastDistance: Math.max(1, Math.hypot(firstPointer.x - secondPointer.x, firstPointer.y - secondPointer.y)),
      lastCenter: centerPoint,
    };
    dragRef.current = null;
    activePointerIdRef.current = null;
    cachedRectRef.current = null;
    document.body.style.cursor = '';
  }

  function startDrag(pointerId: number, clientX: number, clientY: number) {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    const rect = el.getBoundingClientRect();
    cachedRectRef.current = rect;
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;
    const imagePoint = toImage(cx, cy);
    if (!imagePoint) {
      return;
    }

    const hit = hitTest(cx, cy);
    const currentCrop = valueRef.current;
    const shouldPanPreview = panEnabled && currentCrop !== null && hit === 'outside';

    document.body.style.cursor = shouldPanPreview ? 'grabbing' : CURSOR[hit];
    activePointerIdRef.current = pointerId;

    if (shouldPanPreview) {
      dragRef.current = {
        mode: 'pan',
        hit,
        fixedImgX: 0,
        fixedImgY: 0,
        offsetX: 0,
        offsetY: 0,
        startClientX: clientX,
        startClientY: clientY,
        startCrop: currentCrop,
        startPanX: panRef.current.x,
        startPanY: panRef.current.y,
      };
      return;
    }

    if (hit === 'inside' && currentCrop) {
      dragRef.current = {
        mode: 'move',
        hit,
        fixedImgX: 0,
        fixedImgY: 0,
        offsetX: imagePoint.x - currentCrop.x,
        offsetY: imagePoint.y - currentCrop.y,
        startClientX: clientX,
        startClientY: clientY,
        startCrop: currentCrop,
        startPanX: 0,
        startPanY: 0,
      };
      return;
    }

    if ((hit === 'tl' || hit === 'tr' || hit === 'bl' || hit === 'br' || hit === 'tm' || hit === 'bm' || hit === 'ml' || hit === 'mr') && currentCrop) {
      const fixedImgX = hit === 'tl' || hit === 'bl'
        ? currentCrop.x + currentCrop.width
        : hit === 'tr' || hit === 'br'
          ? currentCrop.x
          : 0;
      const fixedImgY = hit === 'tl' || hit === 'tr'
        ? currentCrop.y + currentCrop.height
        : hit === 'bl' || hit === 'br'
          ? currentCrop.y
          : 0;
      dragRef.current = {
        mode: 'resize',
        hit,
        fixedImgX,
        fixedImgY,
        offsetX: 0,
        offsetY: 0,
        startClientX: clientX,
        startClientY: clientY,
        startCrop: currentCrop,
        startPanX: 0,
        startPanY: 0,
      };
      return;
    }

    dragRef.current = {
      mode: 'new',
      hit,
      fixedImgX: imagePoint.x,
      fixedImgY: imagePoint.y,
      offsetX: 0,
      offsetY: 0,
      startClientX: clientX,
      startClientY: clientY,
      startCrop: currentCrop ?? { x: 0, y: 0, width: 1, height: 1 },
      startPanX: 0,
      startPanY: 0,
    };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'touch' && event.button !== 0) {
      return;
    }

    const el = containerRef.current;
    if (!el) {
      return;
    }

    event.preventDefault();
    el.setPointerCapture(event.pointerId);
    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (activePointersRef.current.size >= 2) {
      startPinchGesture();
      return;
    }

    startDrag(event.pointerId, event.clientX, event.clientY);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (activePointersRef.current.has(event.pointerId)) {
      activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    const pinch = pinchRef.current;
    if (pinch && pinch.pointerIds.includes(event.pointerId)) {
      const [firstPointer, secondPointer] = pinch.pointerIds
        .map((pointerId) => activePointersRef.current.get(pointerId))
        .filter((pointer): pointer is { x: number; y: number } => Boolean(pointer));

      if (firstPointer && secondPointer) {
        const nextDistance = Math.max(1, Math.hypot(firstPointer.x - secondPointer.x, firstPointer.y - secondPointer.y));
        const centerPoint = getFramePoint(
          (firstPointer.x + secondPointer.x) / 2,
          (firstPointer.y + secondPointer.y) / 2,
        );

        if (centerPoint) {
          const scale = applyPinchZoomDamping(nextDistance / pinch.lastDistance);
          const nextZoom = zoomRef.current * scale;
          const nextPan = {
            x: centerPoint.x + scale * (panRef.current.x - pinch.lastCenter.x),
            y: centerPoint.y + scale * (panRef.current.y - pinch.lastCenter.y),
          };

          onViewportChangeRef.current(nextZoom, nextPan);
          pinch.lastDistance = nextDistance;
          pinch.lastCenter = centerPoint;
          event.preventDefault();
        }
      }

      return;
    }

    const drag = dragRef.current;
    if (drag && activePointerIdRef.current === event.pointerId) {
      if (drag.mode === 'pan') {
        onViewportChangeRef.current(zoomRef.current, {
          x: drag.startPanX + (event.clientX - drag.startClientX),
          y: drag.startPanY + (event.clientY - drag.startClientY),
        });
        event.preventDefault();
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
        nextCrop = resizeFromHandle(drag, imagePoint);
      }

      onChangeRef.current(nextCrop);
      event.preventDefault();
      return;
    }

    if (event.pointerType === 'mouse') {
      updateHoverCursor(event.clientX, event.clientY);
    }
  }

  function finishPointerInteraction(pointerId: number, clearSelectionOnTinyDrag: boolean) {
    const el = containerRef.current;
    if (el?.hasPointerCapture(pointerId)) {
      el.releasePointerCapture(pointerId);
    }

    const pointer = activePointersRef.current.get(pointerId);
    activePointersRef.current.delete(pointerId);

    if (pinchRef.current?.pointerIds.includes(pointerId)) {
      pinchRef.current = null;
    }

    const drag = dragRef.current;
    if (
      clearSelectionOnTinyDrag
      && drag?.mode === 'new'
      && activePointerIdRef.current === pointerId
    ) {
      const endClientX = pointer?.x ?? drag.startClientX;
      const endClientY = pointer?.y ?? drag.startClientY;
      const movedX = Math.abs(endClientX - drag.startClientX);
      const movedY = Math.abs(endClientY - drag.startClientY);
      const currentCrop = valueRef.current;
      const shouldClearSelection = movedX < CLICK_DRAG_THRESHOLD && movedY < CLICK_DRAG_THRESHOLD;
      const createdTinyCrop = currentCrop !== null
        && currentCrop.width <= 1
        && currentCrop.height <= 1;

      if (shouldClearSelection || createdTinyCrop) {
        onChangeRef.current(null);
      }
    }

    if (activePointerIdRef.current === pointerId) {
      activePointerIdRef.current = null;
      dragRef.current = null;
      cachedRectRef.current = null;
    }

    if (activePointersRef.current.size < 2) {
      pinchRef.current = null;
    }

    if (el) {
      el.style.cursor = '';
    }
    document.body.style.cursor = '';
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
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => finishPointerInteraction(event.pointerId, true)}
      onPointerCancel={(event) => finishPointerInteraction(event.pointerId, false)}
      onPointerLeave={() => {
        if (!dragRef.current && !pinchRef.current) {
          if (containerRef.current) {
            containerRef.current.style.cursor = '';
          }
          document.body.style.cursor = '';
        }
      }}
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
              if (naturalWidth && naturalHeight) {
                commitNaturalSize(naturalWidth, naturalHeight);
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
              <div className="crop-handle crop-handle-tm" />
              <div className="crop-handle crop-handle-tr" />
              <div className="crop-handle crop-handle-mr" />
              <div className="crop-handle crop-handle-bl" />
              <div className="crop-handle crop-handle-bm" />
              <div className="crop-handle crop-handle-br" />
              <div className="crop-handle crop-handle-ml" />
            </div>
          ) : null}
        </div>
      ) : (
        <img
          src={imageUrl}
          className="crop-img"
          style={{
            width: 'auto',
            height: 'auto',
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
          }}
          onLoad={(event) => {
            const { naturalWidth, naturalHeight } = event.currentTarget;
            if (naturalWidth && naturalHeight) {
              commitNaturalSize(naturalWidth, naturalHeight);
            }
          }}
          draggable={false}
          alt=""
        />
      )}
    </div>
  );
}
