import { useEffect, useMemo, useRef, useState } from 'react';
import type { CropOptions } from '../types/image';
import { CanvasControls } from './editor/CanvasControls';

interface Props {
  imageUrl: string;
  width: number;
  height: number;
  crop?: CropOptions;
  zoom?: number;
  pan?: { x: number; y: number };
  showControls?: boolean;
  alignLabel?: string;
  zoomInLabel?: string;
  zoomOutLabel?: string;
  onViewportChange?: (zoom: number, pan: { x: number; y: number }) => void;
  onImageLoad?: (naturalWidth: number, naturalHeight: number) => void;
  onChange: (next: { width: number; height: number; crop: CropOptions }) => void;
}

type Handle = 'tl' | 'tr' | 'bl' | 'br' | 'tm' | 'bm' | 'ml' | 'mr';

interface PanDragState {
  pointerId: number;
  mode: 'pan';
  startClientX: number;
  startClientY: number;
  startPanX: number;
  startPanY: number;
}

interface MoveBoxDragState {
  pointerId: number;
  mode: 'move-box';
  startClientX: number;
  startClientY: number;
  startBoxOffsetX: number;
  startBoxOffsetY: number;
}

interface ResizeDragState {
  pointerId: number;
  mode: 'resize';
  handle: Handle;
  startClientX: number;
  startClientY: number;
  startWidth: number;
  startHeight: number;
  anchorScreenX: number;
  anchorScreenY: number;
  frameCenterScreenX: number;
  frameCenterScreenY: number;
  baseImageWidth: number;
  baseImageHeight: number;
}

interface PinchState {
  pointerIds: [number, number];
  lastDistance: number;
  lastCenter: { x: number; y: number };
}

interface LayoutMetrics {
  imageLeft: number;
  imageTop: number;
  imageWidth: number;
  imageHeight: number;
  boxLeft: number;
  boxTop: number;
  boxWidth: number;
  boxHeight: number;
  frameScale: number;
  baseImageWidth: number;
  baseImageHeight: number;
}

type DragState = PanDragState | MoveBoxDragState | ResizeDragState;

const HANDLE_ORDER: readonly Handle[] = ['tl', 'tm', 'tr', 'mr', 'br', 'bm', 'bl', 'ml'];
const MIN_SIZE = 1;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8;
const ZOOM_BUTTON_FACTOR = 1.15;
const ZOOM_WHEEL_SPEED = 0.00085;
const ZOOM_WHEEL_CTRL_SPEED = 0.0018;
const PINCH_ZOOM_DAMPING = 0.4;

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function scalePanAroundPoint(
  currentPan: { x: number; y: number },
  currentZoom: number,
  nextZoom: number,
  focalPoint: { x: number; y: number },
) {
  if (currentZoom === 0) {
    return currentPan;
  }

  const scale = nextZoom / currentZoom;
  return {
    x: focalPoint.x + scale * (currentPan.x - focalPoint.x),
    y: focalPoint.y + scale * (currentPan.y - focalPoint.y),
  };
}

function applyPinchZoomDamping(rawScale: number) {
  if (!Number.isFinite(rawScale) || rawScale <= 0) {
    return 1;
  }

  return Math.exp(Math.log(rawScale) * PINCH_ZOOM_DAMPING);
}

function cropSignature(width: number, height: number, crop: CropOptions) {
  return `${width}:${height}:${crop.x}:${crop.y}:${crop.width}:${crop.height}`;
}

function deriveFullCrop(naturalSize: { width: number; height: number }): CropOptions {
  return {
    x: 0,
    y: 0,
    width: Math.max(1, naturalSize.width),
    height: Math.max(1, naturalSize.height),
  };
}

export default function ResizeEditor({
  imageUrl,
  width,
  height,
  crop,
  zoom,
  pan,
  showControls = true,
  alignLabel,
  zoomInLabel,
  zoomOutLabel,
  onViewportChange,
  onImageLoad,
  onChange,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const pinchRef = useRef<PinchState | null>(null);
  const activePointersRef = useRef(new Map<number, { x: number; y: number }>());
  const naturalSizeRef = useRef({ width: 0, height: 0 });
  const onChangeRef = useRef(onChange);
  const onViewportChangeRef = useRef(onViewportChange);
  const onImageLoadRef = useRef(onImageLoad);
  const widthRef = useRef(width);
  const heightRef = useRef(height);
  const emittedSignatureRef = useRef('');

  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [boxOffset, setBoxOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [internalZoom, setInternalZoom] = useState(1);
  const [internalPan, setInternalPan] = useState({ x: 0, y: 0 });

  const controlledViewport = zoom !== undefined && pan !== undefined && onViewportChange !== undefined;
  const effectiveZoom = controlledViewport ? zoom : internalZoom;
  const effectivePan = controlledViewport ? pan : internalPan;
  const zoomRef = useRef(effectiveZoom);
  const panRef = useRef(effectivePan);
  const boxOffsetRef = useRef(boxOffset);

  onChangeRef.current = onChange;
  onViewportChangeRef.current = onViewportChange;
  onImageLoadRef.current = onImageLoad;
  widthRef.current = width;
  heightRef.current = height;

  useEffect(() => {
    zoomRef.current = effectiveZoom;
  }, [effectiveZoom]);

  useEffect(() => {
    panRef.current = effectivePan;
  }, [effectivePan]);

  useEffect(() => {
    boxOffsetRef.current = boxOffset;
  }, [boxOffset]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      setFrameSize({ width: 0, height: 0 });
      return undefined;
    }

    const observer = new ResizeObserver(([entry]) => {
      const { width: nextWidth, height: nextHeight } = entry.contentRect;
      setFrameSize((current) => (
        current.width === nextWidth && current.height === nextHeight
          ? current
          : { width: nextWidth, height: nextHeight }
      ));
    });

    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return undefined;
    }

    function preventNativeGesture(event: Event) {
      event.preventDefault();
    }

    frame.addEventListener('gesturestart', preventNativeGesture, { passive: false });
    frame.addEventListener('gesturechange', preventNativeGesture, { passive: false });
    frame.addEventListener('gestureend', preventNativeGesture, { passive: false });

    return () => {
      frame.removeEventListener('gesturestart', preventNativeGesture);
      frame.removeEventListener('gesturechange', preventNativeGesture);
      frame.removeEventListener('gestureend', preventNativeGesture);
    };
  }, []);

  useEffect(() => {
    function handleWindowBlur() {
      const frame = frameRef.current;
      activePointersRef.current.forEach((_, pointerId) => {
        if (frame?.hasPointerCapture(pointerId)) {
          frame.releasePointerCapture(pointerId);
        }
      });
      activePointersRef.current.clear();
      dragRef.current = null;
      pinchRef.current = null;
      setIsPanning(false);
      document.body.style.cursor = '';
    }

    window.addEventListener('blur', handleWindowBlur);
    return () => window.removeEventListener('blur', handleWindowBlur);
  }, []);

  useEffect(() => {
    emittedSignatureRef.current = '';
    dragRef.current = null;
    pinchRef.current = null;
    activePointersRef.current.clear();
    setIsPanning(false);
    setBoxOffset({ x: 0, y: 0 });
    boxOffsetRef.current = { x: 0, y: 0 };
    setNaturalSize({ width: 0, height: 0 });
    naturalSizeRef.current = { width: 0, height: 0 };
    document.body.style.cursor = '';

    if (!controlledViewport) {
      setInternalZoom(1);
      setInternalPan({ x: 0, y: 0 });
      zoomRef.current = 1;
      panRef.current = { x: 0, y: 0 };
    }
  }, [controlledViewport, imageUrl]);

  const layout = useMemo<LayoutMetrics | null>(() => {
    const natWidth = naturalSize.width;
    const natHeight = naturalSize.height;
    if (!natWidth || !natHeight || !frameSize.width || !frameSize.height || !width || !height) {
      return null;
    }

    // Establishes a constant "camera" scale to map targeted dimension pixels mapping into screen
    const baseImageScale = Math.min(frameSize.width / natWidth, frameSize.height / natHeight);

    const rw = Math.max(MIN_SIZE, width * baseImageScale * effectiveZoom);
    const rh = Math.max(MIN_SIZE, height * baseImageScale * effectiveZoom);

    // Image visually matches the target resize box
    const ox = (frameSize.width - rw) / 2 + effectivePan.x + boxOffset.x;
    const oy = (frameSize.height - rh) / 2 + effectivePan.y + boxOffset.y;

    return {
      imageLeft: ox,
      imageTop: oy,
      imageWidth: rw,
      imageHeight: rh,
      boxLeft: ox,
      boxTop: oy,
      boxWidth: rw,
      boxHeight: rh,
      frameScale: baseImageScale * effectiveZoom,
      baseImageWidth: natWidth * baseImageScale,
      baseImageHeight: natHeight * baseImageScale,
    };
  }, [boxOffset.x, boxOffset.y, effectivePan.x, effectivePan.y, effectiveZoom, frameSize.height, frameSize.width, height, naturalSize.height, naturalSize.width, width]);

  useEffect(() => () => {
    document.body.style.cursor = '';
  }, []);

  useEffect(() => {
    if (!layout) {
      return;
    }

    const nextCrop = deriveFullCrop(naturalSize);
    const nextSignature = cropSignature(width, height, nextCrop);
    if (emittedSignatureRef.current === nextSignature) {
      return;
    }

    emittedSignatureRef.current = nextSignature;
    onChangeRef.current({ width, height, crop: nextCrop });
  }, [height, layout, naturalSize.height, naturalSize.width, width]);

  function setViewport(nextZoom: number, nextPan: { x: number; y: number }) {
    const clampedZoom = clampZoom(nextZoom);
    zoomRef.current = clampedZoom;
    panRef.current = nextPan;

    if (controlledViewport) {
      onViewportChangeRef.current?.(clampedZoom, nextPan);
      return;
    }

    setInternalZoom((current) => (current === clampedZoom ? current : clampedZoom));
    setInternalPan((current) => (
      current.x === nextPan.x && current.y === nextPan.y ? current : nextPan
    ));
  }

  function alignCanvas() {
    setViewport(zoomRef.current, { x: 0, y: 0 });
  }

  function getFramePoint(clientX: number, clientY: number) {
    const frame = frameRef.current;
    if (!frame) {
      return null;
    }

    const rect = frame.getBoundingClientRect();
    return {
      x: clientX - rect.left - rect.width / 2,
      y: clientY - rect.top - rect.height / 2,
    };
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
    setIsPanning(false);
    document.body.style.cursor = '';
  }

  function finishPointer(pointerId: number) {
    const frame = frameRef.current;
    if (frame?.hasPointerCapture(pointerId)) {
      frame.releasePointerCapture(pointerId);
    }

    activePointersRef.current.delete(pointerId);

    const pinch = pinchRef.current;
    if (pinch?.pointerIds.includes(pointerId)) {
      pinchRef.current = null;
      if (activePointersRef.current.size === 1) {
        const [[remainingPointerId, remainingPointer]] = Array.from(activePointersRef.current.entries());
        dragRef.current = {
          pointerId: remainingPointerId,
          mode: 'pan',
          startClientX: remainingPointer.x,
          startClientY: remainingPointer.y,
          startPanX: panRef.current.x,
          startPanY: panRef.current.y,
        };
        setIsPanning(true);
        document.body.style.cursor = 'grabbing';
        return;
      }
    }

    if (dragRef.current?.pointerId === pointerId) {
      dragRef.current = null;
    }

    setIsPanning(false);
    document.body.style.cursor = '';
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'touch' && event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target?.closest('.canvas-controls, .canvas-action-btn')) {
      return;
    }

    const frame = event.currentTarget;
    frame.setPointerCapture(event.pointerId);
    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (activePointersRef.current.size >= 2) {
      startPinchGesture();
      event.preventDefault();
      return;
    }

    const handleButton = target?.closest('.resize-handle') as HTMLButtonElement | null;
    if (handleButton && layout) {
      const handle = handleButton.dataset.handle as Handle | undefined;
      const rect = frame.getBoundingClientRect();
      const boxCenterScreenX = rect.left + layout.boxLeft + layout.boxWidth / 2;
      const boxCenterScreenY = rect.top + layout.boxTop + layout.boxHeight / 2;
      let anchorScreenX = boxCenterScreenX;
      let anchorScreenY = boxCenterScreenY;

      if (handle === 'ml' || handle === 'tl' || handle === 'bl') {
        anchorScreenX = boxCenterScreenX + layout.boxWidth / 2;
      } else if (handle === 'mr' || handle === 'tr' || handle === 'br') {
        anchorScreenX = boxCenterScreenX - layout.boxWidth / 2;
      }

      if (handle === 'tl' || handle === 'tm' || handle === 'tr') {
        anchorScreenY = boxCenterScreenY + layout.boxHeight / 2;
      } else if (handle === 'bl' || handle === 'bm' || handle === 'br') {
        anchorScreenY = boxCenterScreenY - layout.boxHeight / 2;
      }

      if (handle) {
        dragRef.current = {
          pointerId: event.pointerId,
          mode: 'resize',
          handle,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startWidth: widthRef.current,
          startHeight: heightRef.current,
          anchorScreenX,
          anchorScreenY,
          frameCenterScreenX: rect.left + rect.width / 2,
          frameCenterScreenY: rect.top + rect.height / 2,
          baseImageWidth: layout.baseImageWidth,
          baseImageHeight: layout.baseImageHeight,
        };
        document.body.style.cursor = window.getComputedStyle(handleButton).cursor;
        event.preventDefault();
        return;
      }
    }

    // Drag inside the crop box → move the box over the image
    if (layout) {
      const rect = frame.getBoundingClientRect();
      const frameX = event.clientX - rect.left;
      const frameY = event.clientY - rect.top;
      const insideBox = (
        frameX >= layout.boxLeft &&
        frameX <= layout.boxLeft + layout.boxWidth &&
        frameY >= layout.boxTop &&
        frameY <= layout.boxTop + layout.boxHeight
      );

      if (insideBox) {
        dragRef.current = {
          pointerId: event.pointerId,
          mode: 'move-box',
          startClientX: event.clientX,
          startClientY: event.clientY,
          startBoxOffsetX: boxOffsetRef.current.x,
          startBoxOffsetY: boxOffsetRef.current.y,
        };
        document.body.style.cursor = 'move';
        event.preventDefault();
        return;
      }
    }

    // Drag on canvas background → pan the image
    dragRef.current = {
      pointerId: event.pointerId,
      mode: 'pan',
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPanX: panRef.current.x,
      startPanY: panRef.current.y,
    };
    setIsPanning(true);
    document.body.style.cursor = 'grabbing';
    event.preventDefault();
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
        const nextCenter = getFramePoint(
          (firstPointer.x + secondPointer.x) / 2,
          (firstPointer.y + secondPointer.y) / 2,
        );

        if (nextCenter) {
          const scale = applyPinchZoomDamping(nextDistance / pinch.lastDistance);
          const nextZoom = zoomRef.current * scale;
          const nextPan = {
            x: nextCenter.x + scale * (panRef.current.x - pinch.lastCenter.x),
            y: nextCenter.y + scale * (panRef.current.y - pinch.lastCenter.y),
          };
          setViewport(nextZoom, nextPan);
          pinch.lastDistance = nextDistance;
          pinch.lastCenter = nextCenter;
          event.preventDefault();
        }
      }
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    if (drag.mode === 'pan') {
      setViewport(zoomRef.current, {
        x: drag.startPanX + event.clientX - drag.startClientX,
        y: drag.startPanY + event.clientY - drag.startClientY,
      });
      event.preventDefault();
      return;
    }

    if (drag.mode === 'move-box') {
      const newOffset = {
        x: drag.startBoxOffsetX + event.clientX - drag.startClientX,
        y: drag.startBoxOffsetY + event.clientY - drag.startClientY,
      };
      setBoxOffset(newOffset);
      boxOffsetRef.current = newOffset;
      event.preventDefault();
      return;
    }

    const currentLayout = layout;
    if (!currentLayout) {
      return;
    }

    const dx = event.clientX - drag.startClientX;
    const dy = event.clientY - drag.startClientY;
    const ratio = drag.startWidth / drag.startHeight;
    const startFrameScale = currentLayout.frameScale;
    let nextWidth = drag.startWidth;
    let nextHeight = drag.startHeight;

    if (drag.handle === 'mr') {
      nextWidth = Math.max(MIN_SIZE, Math.round(drag.startWidth + dx / startFrameScale));
    } else if (drag.handle === 'ml') {
      nextWidth = Math.max(MIN_SIZE, Math.round(drag.startWidth - dx / startFrameScale));
    } else if (drag.handle === 'bm') {
      nextHeight = Math.max(MIN_SIZE, Math.round(drag.startHeight + dy / startFrameScale));
    } else if (drag.handle === 'tm') {
      nextHeight = Math.max(MIN_SIZE, Math.round(drag.startHeight - dy / startFrameScale));
    } else {
      const scaledDx = (drag.handle === 'tl' || drag.handle === 'bl') ? -dx / startFrameScale : dx / startFrameScale;
      const scaledDy = (drag.handle === 'tl' || drag.handle === 'tr') ? -dy / startFrameScale : dy / startFrameScale;
      const widthFromHeight = scaledDy * ratio;
      const dominant = Math.abs(scaledDx) >= Math.abs(widthFromHeight) ? scaledDx : widthFromHeight;
      nextWidth = Math.max(MIN_SIZE, Math.round(drag.startWidth + dominant));
      nextHeight = Math.max(MIN_SIZE, Math.round(nextWidth / ratio));
    }

    const nextFrameScale = currentLayout.frameScale;
    const nextBoxWidth = nextWidth * nextFrameScale;
    const nextBoxHeight = nextHeight * nextFrameScale;
    let nextBoxCenterX = drag.anchorScreenX;
    let nextBoxCenterY = drag.anchorScreenY;

    if (drag.handle === 'ml' || drag.handle === 'tl' || drag.handle === 'bl') {
      nextBoxCenterX = drag.anchorScreenX - nextBoxWidth / 2;
    } else if (drag.handle === 'mr' || drag.handle === 'tr' || drag.handle === 'br') {
      nextBoxCenterX = drag.anchorScreenX + nextBoxWidth / 2;
    }

    if (drag.handle === 'tl' || drag.handle === 'tm' || drag.handle === 'tr') {
      nextBoxCenterY = drag.anchorScreenY - nextBoxHeight / 2;
    } else if (drag.handle === 'bl' || drag.handle === 'bm' || drag.handle === 'br') {
      nextBoxCenterY = drag.anchorScreenY + nextBoxHeight / 2;
    }

    const nextOffset = {
      x: nextBoxCenterX - drag.frameCenterScreenX,
      y: nextBoxCenterY - drag.frameCenterScreenY,
    };

    boxOffsetRef.current = nextOffset;
    setBoxOffset(nextOffset);

    const nextCrop = deriveFullCrop(naturalSizeRef.current);

    const nextSignature = cropSignature(nextWidth, nextHeight, nextCrop);
    emittedSignatureRef.current = nextSignature;
    onChangeRef.current({
      width: nextWidth,
      height: nextHeight,
      crop: nextCrop,
    });
    event.preventDefault();
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    finishPointer(event.pointerId);
  }

  function handlePointerCancel(event: React.PointerEvent<HTMLDivElement>) {
    finishPointer(event.pointerId);
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const speed = event.ctrlKey ? ZOOM_WHEEL_CTRL_SPEED : ZOOM_WHEEL_SPEED;
    const factor = Math.exp(-event.deltaY * speed);
    const focalPoint = getFramePoint(event.clientX, event.clientY);
    const nextZoom = zoomRef.current * factor;
    const nextPan = focalPoint
      ? scalePanAroundPoint(panRef.current, zoomRef.current, clampZoom(nextZoom), focalPoint)
      : panRef.current;

    setViewport(nextZoom, nextPan);
  }

  const imageStyle = layout
    ? {
        left: layout.imageLeft,
        top: layout.imageTop,
        width: layout.imageWidth,
        height: layout.imageHeight,
        visibility: 'visible' as const,
      }
    : {
        visibility: 'hidden' as const,
      };

  return (
    <div
      ref={frameRef}
      className={`resize-editor-frame ${isPanning ? 'is-panning' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onWheel={handleWheel}
    >
      <div className="resize-editor-stage" />
      <img
        src={imageUrl}
        className="resize-editor-image"
        draggable={false}
        alt=""
        style={imageStyle}
        onLoad={(event) => {
          const nextSize = {
            width: event.currentTarget.naturalWidth,
            height: event.currentTarget.naturalHeight,
          };
          naturalSizeRef.current = nextSize;
          setNaturalSize(nextSize);
          onImageLoadRef.current?.(nextSize.width, nextSize.height);
        }}
      />
      {layout ? (
        <div
          className="resize-frame-box"
          style={{
            left: layout.boxLeft,
            top: layout.boxTop,
            width: layout.boxWidth,
            height: layout.boxHeight,
          }}
        >
          <div className="resize-object-label">{width} × {height}</div>
          {HANDLE_ORDER.map((handle) => (
            <button
              key={handle}
              type="button"
              className={`resize-handle resize-handle-${handle}`}
              data-handle={handle}
              aria-label={`Resize ${handle}`}
            />
          ))}
        </div>
      ) : null}
      {showControls && alignLabel && zoomInLabel && zoomOutLabel ? (
        <CanvasControls
          zoom={effectiveZoom}
          alignLabel={alignLabel}
          zoomInLabel={zoomInLabel}
          zoomOutLabel={zoomOutLabel}
          onAlign={alignCanvas}
          onZoomOut={() => setViewport(zoomRef.current / ZOOM_BUTTON_FACTOR, panRef.current)}
          onZoomIn={() => setViewport(zoomRef.current * ZOOM_BUTTON_FACTOR, panRef.current)}
        />
      ) : null}
    </div>
  );
}
