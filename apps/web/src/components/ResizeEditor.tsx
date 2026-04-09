import { useEffect, useRef, useState } from 'react';
import { CanvasControls } from './editor/CanvasControls';

interface Props {
  imageUrl: string;
  width: number;
  height: number;
  crop?: { x: number; y: number; width: number; height: number };
  alignLabel: string;
  zoomInLabel: string;
  zoomOutLabel: string;
  onChange: (next: { width: number; height: number; crop: { x: number; y: number; width: number; height: number } }) => void;
}

type Handle = 'tl' | 'tr' | 'bl' | 'br' | 'tm' | 'bm' | 'ml' | 'mr';

const MIN_SIZE = 1;
const ZOOM_BUTTON_FACTOR = 1.15;
const ZOOM_WHEEL_SPEED = 0.00085;
const ZOOM_WHEEL_CTRL_SPEED = 0.0018;
const PINCH_ZOOM_DAMPING = 0.4;
const MIN_ZOOM = 0.02;
const MAX_ZOOM = 16;

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
  zoom: number;
  frameCenterScreenX: number;
  frameCenterScreenY: number;
  panX: number;
  panY: number;
}

interface CanvasDragState {
  pointerId: number;
  mode: 'canvas';
  startClientX: number;
  startClientY: number;
  startPanX: number;
  startPanY: number;
}

interface ImageMoveDragState {
  pointerId: number;
  mode: 'move';
  startClientX: number;
  startClientY: number;
  startCropX: number;
  startCropY: number;
  cropWidth: number;
  cropHeight: number;
  scaleX: number;
  scaleY: number;
}

interface PinchState {
  pointerIds: [number, number];
  lastDistance: number;
}

type DragState = ResizeDragState | CanvasDragState | ImageMoveDragState;

function computeSafeCrop(
  crop: Props['crop'],
  nat: { width: number; height: number },
) {
  const maxW = Math.max(1, nat.width);
  const maxH = Math.max(1, nat.height);
  const c = crop ?? { x: 0, y: 0, width: maxW, height: maxH };
  const sw = Math.max(1, Math.min(c.width, maxW));
  const sh = Math.max(1, Math.min(c.height, maxH));
  return {
    x: Math.max(0, Math.min(c.x, maxW - sw)),
    y: Math.max(0, Math.min(c.y, maxH - sh)),
    width: sw,
    height: sh,
  };
}

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

export default function ResizeEditor({
  imageUrl,
  width,
  height,
  crop,
  alignLabel,
  zoomInLabel,
  zoomOutLabel,
  onChange,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const pinchRef = useRef<PinchState | null>(null);
  const activePointersRef = useRef(new Map<number, { x: number; y: number }>());
  const onChangeRef = useRef(onChange);
  const cropRef = useRef(crop);
  const widthRef = useRef(width);
  const heightRef = useRef(height);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const naturalSizeRef = useRef({ width: 0, height: 0 });

  const [zoom, setZoom] = useState<number | null>(null);
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const [boxOffset, setBoxOffset] = useState({ x: 0, y: 0 });
  const zoomRef = useRef<number | null>(null);
  const canvasPanRef = useRef({ x: 0, y: 0 });
  const boxOffsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { cropRef.current = crop; }, [crop]);
  useEffect(() => { widthRef.current = width; }, [width]);
  useEffect(() => { heightRef.current = height; }, [height]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { canvasPanRef.current = canvasPan; }, [canvasPan]);
  useEffect(() => { boxOffsetRef.current = boxOffset; }, [boxOffset]);

  useEffect(() => {
    if (zoom !== null) return;
    const frame = frameRef.current;
    if (!frame || !width || !height) return;
    const { width: fw, height: fh } = frame.getBoundingClientRect();
    if (!fw || !fh) return;
    const fitted = Math.min((fw * 0.84) / width, (fh * 0.8) / height);
    const safe = Number.isFinite(fitted) && fitted > 0 ? fitted : 1;
    setZoom(safe);
    zoomRef.current = safe;
  }, [zoom, width, height]);

  useEffect(() => () => {
    activePointersRef.current.clear();
    pinchRef.current = null;
    document.body.style.cursor = '';
  }, []);

  useEffect(() => {
    if (!naturalSize.width || !naturalSize.height || crop) return;
    onChangeRef.current({
      width,
      height,
      crop: { x: 0, y: 0, width: naturalSize.width, height: naturalSize.height },
    });
  }, [crop, height, naturalSize.height, naturalSize.width, width]);

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

  function setZoomAround(nextZoom: number, clientX?: number, clientY?: number) {
    const clampedZoom = clampZoom(nextZoom);
    const currentZoom = zoomRef.current ?? 1;
    const focalPoint = clientX !== undefined && clientY !== undefined
      ? getFramePoint(clientX, clientY)
      : null;

    const nextPan = focalPoint
      ? scalePanAroundPoint(canvasPanRef.current, currentZoom, clampedZoom, focalPoint)
      : canvasPanRef.current;

    zoomRef.current = clampedZoom;
    canvasPanRef.current = nextPan;

    setZoom((current) => (current === clampedZoom ? current : clampedZoom));
    setCanvasPan((current) => (
      current.x === nextPan.x && current.y === nextPan.y ? current : nextPan
    ));
  }

  function handleAlign() {
    canvasPanRef.current = { x: 0, y: 0 };
    boxOffsetRef.current = { x: 0, y: 0 };
    setCanvasPan({ x: 0, y: 0 });
    setBoxOffset({ x: 0, y: 0 });
  }

  function startPinchGesture() {
    const [firstPointerId, secondPointerId] = Array.from(activePointersRef.current.keys());
    const firstPointer = activePointersRef.current.get(firstPointerId);
    const secondPointer = activePointersRef.current.get(secondPointerId);
    if (!firstPointer || !secondPointer) {
      return;
    }

    pinchRef.current = {
      pointerIds: [firstPointerId, secondPointerId],
      lastDistance: Math.max(1, Math.hypot(firstPointer.x - secondPointer.x, firstPointer.y - secondPointer.y)),
    };
    dragRef.current = null;
    document.body.style.cursor = '';
  }

  function finishPointer(pointerId: number) {
    const frame = frameRef.current;
    if (frame?.hasPointerCapture(pointerId)) {
      frame.releasePointerCapture(pointerId);
    }

    activePointersRef.current.delete(pointerId);

    if (pinchRef.current?.pointerIds.includes(pointerId)) {
      pinchRef.current = null;
    }

    if (dragRef.current?.pointerId === pointerId) {
      dragRef.current = null;
    }

    document.body.style.cursor = '';
  }

  function handleFramePointerMove(event: React.PointerEvent<HTMLElement>) {
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
        const nextZoom = (zoomRef.current ?? 1) * applyPinchZoomDamping(nextDistance / pinch.lastDistance);
        const centerX = (firstPointer.x + secondPointer.x) / 2;
        const centerY = (firstPointer.y + secondPointer.y) / 2;
        setZoomAround(nextZoom, centerX, centerY);
        pinch.lastDistance = nextDistance;
        event.preventDefault();
      }
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    if (drag.mode === 'canvas') {
      const nextPan = {
        x: drag.startPanX + event.clientX - drag.startClientX,
        y: drag.startPanY + event.clientY - drag.startClientY,
      };
      canvasPanRef.current = nextPan;
      setCanvasPan(nextPan);
      event.preventDefault();
      return;
    }

    if (drag.mode === 'move') {
      const nat = naturalSizeRef.current;
      const dx = event.clientX - drag.startClientX;
      const dy = event.clientY - drag.startClientY;
      const nextX = Math.max(0, Math.min(drag.startCropX - Math.round(dx / drag.scaleX), nat.width - drag.cropWidth));
      const nextY = Math.max(0, Math.min(drag.startCropY - Math.round(dy / drag.scaleY), nat.height - drag.cropHeight));
      onChangeRef.current({
        width: widthRef.current,
        height: heightRef.current,
        crop: { x: nextX, y: nextY, width: drag.cropWidth, height: drag.cropHeight },
      });
      event.preventDefault();
      return;
    }

    const { handle, zoom: dragZoom, startWidth, startHeight } = drag;
    const dx = event.clientX - drag.startClientX;
    const dy = event.clientY - drag.startClientY;
    const ratio = startWidth / startHeight;
    let nextWidth = startWidth;
    let nextHeight = startHeight;

    if (handle === 'mr') {
      nextWidth = Math.max(MIN_SIZE, Math.round(startWidth + dx / dragZoom));
    } else if (handle === 'ml') {
      nextWidth = Math.max(MIN_SIZE, Math.round(startWidth - dx / dragZoom));
    } else if (handle === 'bm') {
      nextHeight = Math.max(MIN_SIZE, Math.round(startHeight + dy / dragZoom));
    } else if (handle === 'tm') {
      nextHeight = Math.max(MIN_SIZE, Math.round(startHeight - dy / dragZoom));
    } else {
      const scaledDx = (handle === 'tl' || handle === 'bl') ? -dx / dragZoom : dx / dragZoom;
      const scaledDy = (handle === 'tl' || handle === 'tr') ? -dy / dragZoom : dy / dragZoom;
      const widthFromHeight = scaledDy * ratio;
      const dominant = Math.abs(scaledDx) >= Math.abs(widthFromHeight) ? scaledDx : widthFromHeight;
      nextWidth = Math.max(MIN_SIZE, Math.round(startWidth + dominant));
      nextHeight = Math.max(MIN_SIZE, Math.round(nextWidth / ratio));
    }

    const nextBoxWidth = nextWidth * dragZoom;
    const nextBoxHeight = nextHeight * dragZoom;

    let nextBoxCenterX: number;
    let nextBoxCenterY: number;

    if (handle === 'ml' || handle === 'tl' || handle === 'bl') {
      nextBoxCenterX = drag.anchorScreenX - nextBoxWidth / 2;
    } else if (handle === 'mr' || handle === 'tr' || handle === 'br') {
      nextBoxCenterX = drag.anchorScreenX + nextBoxWidth / 2;
    } else {
      nextBoxCenterX = drag.anchorScreenX;
    }

    if (handle === 'tl' || handle === 'tm' || handle === 'tr') {
      nextBoxCenterY = drag.anchorScreenY - nextBoxHeight / 2;
    } else if (handle === 'bl' || handle === 'bm' || handle === 'br') {
      nextBoxCenterY = drag.anchorScreenY + nextBoxHeight / 2;
    } else {
      nextBoxCenterY = drag.anchorScreenY;
    }

    const nextOffset = {
      x: nextBoxCenterX - drag.frameCenterScreenX - drag.panX,
      y: nextBoxCenterY - drag.frameCenterScreenY - drag.panY,
    };
    boxOffsetRef.current = nextOffset;
    setBoxOffset(nextOffset);

    const nextCrop = computeSafeCrop(cropRef.current, naturalSizeRef.current);
    onChangeRef.current({ width: nextWidth, height: nextHeight, crop: nextCrop });
    event.preventDefault();
  }

  const frameRect = frameRef.current?.getBoundingClientRect();
  const frameWidth = frameRect?.width ?? 0;
  const frameHeight = frameRect?.height ?? 0;
  const effectiveZoom = zoom ?? 1;
  const boxWidth = width * effectiveZoom;
  const boxHeight = height * effectiveZoom;
  const boxCenterX = frameWidth / 2 + canvasPan.x + boxOffset.x;
  const boxCenterY = frameHeight / 2 + canvasPan.y + boxOffset.y;
  const safeCrop = computeSafeCrop(crop, naturalSize);
  const scaleX = boxWidth / safeCrop.width;
  const scaleY = boxHeight / safeCrop.height;

  return (
    <div
      className="resize-editor-frame"
      ref={frameRef}
      onPointerDown={(event) => {
        const target = event.target as HTMLElement;
        if (
          !target.classList.contains('resize-editor-frame') &&
          !target.classList.contains('resize-editor-stage')
        ) {
          return;
        }

        if (event.pointerType !== 'touch' && event.button !== 0) {
          return;
        }

        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

        if (activePointersRef.current.size >= 2) {
          startPinchGesture();
          return;
        }

        dragRef.current = {
          pointerId: event.pointerId,
          mode: 'canvas',
          startClientX: event.clientX,
          startClientY: event.clientY,
          startPanX: canvasPanRef.current.x,
          startPanY: canvasPanRef.current.y,
        };
        document.body.style.cursor = 'grabbing';
      }}
      onPointerMove={handleFramePointerMove}
      onPointerUp={(event) => finishPointer(event.pointerId)}
      onPointerCancel={(event) => finishPointer(event.pointerId)}
      onWheel={(event) => {
        event.preventDefault();
        const speed = event.ctrlKey ? ZOOM_WHEEL_CTRL_SPEED : ZOOM_WHEEL_SPEED;
        const factor = Math.exp(-event.deltaY * speed);
        setZoomAround((zoomRef.current ?? 1) * factor, event.clientX, event.clientY);
      }}
    >
      <div className="resize-editor-stage" />
      {zoom !== null && frameWidth > 0 ? (
        <div
          className="resize-frame-box"
          style={{ left: boxCenterX - boxWidth / 2, top: boxCenterY - boxHeight / 2, width: boxWidth, height: boxHeight }}
        >
          <div
            className="resize-frame-canvas"
            onPointerDown={(event) => {
              const target = event.target as HTMLElement;
              if (
                !target.classList.contains('resize-frame-canvas') &&
                !target.classList.contains('resize-object-image')
              ) {
                return;
              }

              if (event.pointerType !== 'touch' && event.button !== 0) {
                return;
              }

              event.stopPropagation();
              event.currentTarget.setPointerCapture(event.pointerId);
              activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
              dragRef.current = {
                pointerId: event.pointerId,
                mode: 'move',
                startClientX: event.clientX,
                startClientY: event.clientY,
                startCropX: safeCrop.x,
                startCropY: safeCrop.y,
                cropWidth: safeCrop.width,
                cropHeight: safeCrop.height,
                scaleX,
                scaleY,
              };
              document.body.style.cursor = 'grabbing';
            }}
            onPointerMove={handleFramePointerMove}
            onPointerUp={(event) => finishPointer(event.pointerId)}
            onPointerCancel={(event) => finishPointer(event.pointerId)}
          >
            <img
              src={imageUrl}
              className="resize-object-image"
              draggable={false}
              alt=""
              style={{
                left: -safeCrop.x * scaleX,
                top: -safeCrop.y * scaleY,
                width: naturalSize.width * scaleX,
                height: naturalSize.height * scaleY,
              }}
              onLoad={(event) => {
                const nextSize = {
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                };
                setNaturalSize(nextSize);
                naturalSizeRef.current = nextSize;
              }}
            />
          </div>
          <div className="resize-object-label">{width} × {height}</div>
          {(['tl', 'tm', 'tr', 'mr', 'br', 'bm', 'bl', 'ml'] as const).map((handle) => (
            <button
              key={handle}
              type="button"
              className={`resize-handle resize-handle-${handle}`}
              onPointerDown={(event) => {
                if (event.pointerType !== 'touch' && event.button !== 0) {
                  return;
                }

                event.preventDefault();
                event.stopPropagation();
                event.currentTarget.setPointerCapture(event.pointerId);
                activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

                const frame = frameRef.current;
                if (!frame) return;

                const rect = frame.getBoundingClientRect();
                const frameCenterScreenX = rect.left + rect.width / 2;
                const frameCenterScreenY = rect.top + rect.height / 2;
                const pan = canvasPanRef.current;
                const offset = boxOffsetRef.current;
                const activeZoom = zoomRef.current ?? effectiveZoom;
                const activeBoxWidth = widthRef.current * activeZoom;
                const activeBoxHeight = heightRef.current * activeZoom;
                const activeBoxCenterX = frameCenterScreenX + pan.x + offset.x;
                const activeBoxCenterY = frameCenterScreenY + pan.y + offset.y;

                let anchorX: number;
                let anchorY: number;

                if (handle === 'ml' || handle === 'tl' || handle === 'bl') {
                  anchorX = activeBoxCenterX + activeBoxWidth / 2;
                } else if (handle === 'mr' || handle === 'tr' || handle === 'br') {
                  anchorX = activeBoxCenterX - activeBoxWidth / 2;
                } else {
                  anchorX = activeBoxCenterX;
                }

                if (handle === 'tl' || handle === 'tm' || handle === 'tr') {
                  anchorY = activeBoxCenterY + activeBoxHeight / 2;
                } else if (handle === 'bl' || handle === 'bm' || handle === 'br') {
                  anchorY = activeBoxCenterY - activeBoxHeight / 2;
                } else {
                  anchorY = activeBoxCenterY;
                }

                dragRef.current = {
                  pointerId: event.pointerId,
                  mode: 'resize',
                  handle,
                  startClientX: event.clientX,
                  startClientY: event.clientY,
                  startWidth: widthRef.current,
                  startHeight: heightRef.current,
                  anchorScreenX: anchorX,
                  anchorScreenY: anchorY,
                  zoom: activeZoom,
                  frameCenterScreenX,
                  frameCenterScreenY,
                  panX: pan.x,
                  panY: pan.y,
                };
                document.body.style.cursor = window.getComputedStyle(event.currentTarget).cursor;
              }}
              onPointerMove={handleFramePointerMove}
              onPointerUp={(event) => finishPointer(event.pointerId)}
              onPointerCancel={(event) => finishPointer(event.pointerId)}
              aria-label={`Resize ${handle}`}
            />
          ))}
        </div>
      ) : null}

      <CanvasControls
        zoom={effectiveZoom}
        alignLabel={alignLabel}
        zoomInLabel={zoomInLabel}
        zoomOutLabel={zoomOutLabel}
        onAlign={handleAlign}
        onZoomOut={() => setZoomAround((zoomRef.current ?? 1) / ZOOM_BUTTON_FACTOR)}
        onZoomIn={() => setZoomAround((zoomRef.current ?? 1) * ZOOM_BUTTON_FACTOR)}
      />
    </div>
  );
}
