import { useEffect, useRef } from 'react';
import type { CropOptions } from '../types/image';

interface Props {
  imageUrl: string;
  width: number;
  height: number;
  value?: CropOptions;
  onChange: (crop: CropOptions) => void;
}

type HitZone = 'tl' | 'tr' | 'bl' | 'br' | 'inside' | 'outside';
type DragMode = 'move' | 'resize';

interface DragState {
  mode: DragMode;
  anchorX: number;
  anchorY: number;
  offsetX: number;
  offsetY: number;
  corner?: 'tl' | 'tr' | 'bl' | 'br';
  startCrop: CropOptions;
}

const HIT_RADIUS = 10;
const CURSOR: Record<HitZone, string> = {
  tl: 'nwse-resize',
  br: 'nwse-resize',
  tr: 'nesw-resize',
  bl: 'nesw-resize',
  inside: 'move',
  outside: 'default',
};

export default function ResizeEditor({ imageUrl, width, height, value, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const naturalSizeRef = useRef({ w: 0, h: 0 });
  const dragRef = useRef<DragState | null>(null);
  const cachedRectRef = useRef<DOMRect | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => () => {
    document.body.style.cursor = '';
  }, []);

  function getAspectRatio() {
    return width / height;
  }

  function getLayout() {
    const el = containerRef.current;
    if (!el || !naturalSizeRef.current.w) {
      return null;
    }

    const { width: cw, height: ch } = el.getBoundingClientRect();
    const { w: iw, h: ih } = naturalSizeRef.current;
    const ir = iw / ih;
    const cr = cw / ch;

    if (ir > cr) {
      return { rw: cw, rh: cw / ir, ox: 0, oy: (ch - cw / ir) / 2, iw, ih };
    }

    return { rw: ch * ir, rh: ch, ox: (cw - ch * ir) / 2, oy: 0, iw, ih };
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

  function clampRect(next: CropOptions) {
    const { w, h } = naturalSizeRef.current;
    const x = Math.max(0, Math.min(next.x, w - 1));
    const y = Math.max(0, Math.min(next.y, h - 1));
    const widthLimit = w - x;
    const heightLimit = h - y;
    const aspectRatio = getAspectRatio();
    const boundedWidth = Math.max(1, Math.min(next.width, widthLimit, heightLimit * aspectRatio));
    const boundedHeight = Math.max(1, Math.min(next.height, heightLimit, widthLimit / aspectRatio));
    const adjustedWidth = Math.min(boundedWidth, boundedHeight * aspectRatio);

    return {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.max(1, Math.round(adjustedWidth)),
      height: Math.max(1, Math.round(adjustedWidth / aspectRatio)),
    };
  }

  function createDefaultRect() {
    const { w, h } = naturalSizeRef.current;
    const aspectRatio = getAspectRatio();
    const imageRatio = w / h;

    if (imageRatio > aspectRatio) {
      const rectHeight = h;
      const rectWidth = rectHeight * aspectRatio;
      return clampRect({
        x: (w - rectWidth) / 2,
        y: 0,
        width: rectWidth,
        height: rectHeight,
      });
    }

    const rectWidth = w;
    const rectHeight = rectWidth / aspectRatio;
    return clampRect({
      x: 0,
      y: (h - rectHeight) / 2,
      width: rectWidth,
      height: rectHeight,
    });
  }

  function ensureRect() {
    if (!naturalSizeRef.current.w) {
      return;
    }

    const current = valueRef.current;
    const next = current ? clampRect(current) : createDefaultRect();
    const changed =
      !current
      || current.x !== next.x
      || current.y !== next.y
      || current.width !== next.width
      || current.height !== next.height;

    if (changed) {
      onChangeRef.current(next);
    }
  }

  function hitTest(cx: number, cy: number): HitZone {
    const current = valueRef.current;
    if (!current) {
      return 'outside';
    }

    const layout = getLayout();
    if (!layout) {
      return 'outside';
    }

    const left = layout.ox + (current.x / layout.iw) * layout.rw;
    const top = layout.oy + (current.y / layout.ih) * layout.rh;
    const right = layout.ox + ((current.x + current.width) / layout.iw) * layout.rw;
    const bottom = layout.oy + ((current.y + current.height) / layout.ih) * layout.rh;
    const near = (px: number, py: number) => Math.abs(cx - px) <= HIT_RADIUS && Math.abs(cy - py) <= HIT_RADIUS;

    if (near(left, top)) return 'tl';
    if (near(right, top)) return 'tr';
    if (near(left, bottom)) return 'bl';
    if (near(right, bottom)) return 'br';
    if (cx >= left && cx <= right && cy >= top && cy <= bottom) return 'inside';
    return 'outside';
  }

  function rectFromCorner(anchorX: number, anchorY: number, pointX: number, pointY: number) {
    const { w, h } = naturalSizeRef.current;
    const aspectRatio = getAspectRatio();
    const signX = pointX >= anchorX ? 1 : -1;
    const signY = pointY >= anchorY ? 1 : -1;
    const maxWidth = signX > 0 ? w - anchorX : anchorX;
    const maxHeight = signY > 0 ? h - anchorY : anchorY;

    let boxWidth = Math.abs(pointX - anchorX);
    let boxHeight = boxWidth / aspectRatio;

    if (boxHeight > Math.abs(pointY - anchorY)) {
      boxHeight = Math.abs(pointY - anchorY);
      boxWidth = boxHeight * aspectRatio;
    }

    boxWidth = Math.max(1, Math.min(boxWidth, maxWidth, maxHeight * aspectRatio));
    boxHeight = Math.max(1, boxWidth / aspectRatio);

    return clampRect({
      x: signX > 0 ? anchorX : anchorX - boxWidth,
      y: signY > 0 ? anchorY : anchorY - boxHeight,
      width: boxWidth,
      height: boxHeight,
    });
  }

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      const drag = dragRef.current;
      const rect = cachedRectRef.current;
      if (!drag || !rect) {
        return;
      }

      const point = toImage(event.clientX - rect.left, event.clientY - rect.top);
      if (!point) {
        return;
      }

      if (drag.mode === 'move') {
        const { w, h } = naturalSizeRef.current;
        const moved = clampRect({
          x: point.x - drag.offsetX,
          y: point.y - drag.offsetY,
          width: drag.startCrop.width,
          height: drag.startCrop.height,
        });

        onChangeRef.current({
          ...moved,
          x: Math.max(0, Math.min(moved.x, w - moved.width)),
          y: Math.max(0, Math.min(moved.y, h - moved.height)),
        });
        return;
      }

      onChangeRef.current(rectFromCorner(drag.anchorX, drag.anchorY, point.x, point.y));
    }

    function handleMouseUp() {
      dragRef.current = null;
      cachedRectRef.current = null;
      document.body.style.cursor = '';
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [height, width]);

  const displayRect = (() => {
    if (!value) {
      return null;
    }

    const layout = getLayout();
    if (!layout) {
      return null;
    }

    return {
      left: layout.ox + (value.x / layout.iw) * layout.rw,
      top: layout.oy + (value.y / layout.ih) * layout.rh,
      width: (value.width / layout.iw) * layout.rw,
      height: (value.height / layout.ih) * layout.rh,
    };
  })();

  return (
    <div
      className="resize-editor"
      ref={containerRef}
      onMouseDown={(event) => {
        const current = valueRef.current;
        const rect = containerRef.current?.getBoundingClientRect();
        if (!current || !rect) {
          return;
        }

        cachedRectRef.current = rect;
        const point = toImage(event.clientX - rect.left, event.clientY - rect.top);
        if (!point) {
          return;
        }

        const hit = hitTest(event.clientX - rect.left, event.clientY - rect.top);
        document.body.style.cursor = CURSOR[hit];

        if (hit === 'inside') {
          dragRef.current = {
            mode: 'move',
            anchorX: 0,
            anchorY: 0,
            offsetX: point.x - current.x,
            offsetY: point.y - current.y,
            startCrop: current,
          };
          return;
        }

        if (hit === 'tl' || hit === 'tr' || hit === 'bl' || hit === 'br') {
          const anchorX = hit === 'tl' || hit === 'bl' ? current.x + current.width : current.x;
          const anchorY = hit === 'tl' || hit === 'tr' ? current.y + current.height : current.y;
          dragRef.current = {
            mode: 'resize',
            anchorX,
            anchorY,
            offsetX: 0,
            offsetY: 0,
            corner: hit,
            startCrop: current,
          };
        }
      }}
      onMouseMove={(event) => {
        if (dragRef.current || !containerRef.current) {
          return;
        }

        const rect = containerRef.current.getBoundingClientRect();
        containerRef.current.style.cursor = CURSOR[hitTest(event.clientX - rect.left, event.clientY - rect.top)];
      }}
    >
      <img
        src={imageUrl}
        className="crop-img"
        draggable={false}
        alt=""
        onLoad={(event) => {
          naturalSizeRef.current = {
            w: event.currentTarget.naturalWidth,
            h: event.currentTarget.naturalHeight,
          };
          ensureRect();
        }}
      />

      {displayRect ? (
        <div
          className="crop-box resize-box"
          style={{
            left: displayRect.left,
            top: displayRect.top,
            width: displayRect.width,
            height: displayRect.height,
          }}
        >
          <div className="resize-box-label">
            {width} x {height}
          </div>
          <div className="crop-handle crop-handle-tl" />
          <div className="crop-handle crop-handle-tr" />
          <div className="crop-handle crop-handle-bl" />
          <div className="crop-handle crop-handle-br" />
        </div>
      ) : null}
    </div>
  );
}
