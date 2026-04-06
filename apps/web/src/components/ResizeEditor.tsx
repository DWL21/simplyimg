import { useEffect, useRef } from 'react';
import type { CropOptions } from '../types/image';

interface Props {
  imageUrl: string;
  width: number;
  height: number;
  value?: CropOptions;
  onChange: (crop: CropOptions) => void;
}

type HitZone = 'tl' | 'tr' | 'bl' | 'br' | 'tm' | 'bm' | 'ml' | 'mr' | 'inside' | 'outside';
type DragMode = 'move' | 'resize';

interface DragState {
  mode: DragMode;
  offsetX: number;
  offsetY: number;
  startCrop: CropOptions;
  edge?: Exclude<HitZone, 'inside' | 'outside'>;
}

const HIT_RADIUS = 10;
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

  function getOutputRatio() {
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
    return {
      x: Math.round(Math.max(0, Math.min(next.x, w - 1))),
      y: Math.round(Math.max(0, Math.min(next.y, h - 1))),
      width: Math.max(1, Math.round(Math.min(next.width, w - Math.max(0, Math.min(next.x, w - 1))))),
      height: Math.max(1, Math.round(Math.min(next.height, h - Math.max(0, Math.min(next.y, h - 1))))),
    };
  }

  function createDefaultRect() {
    const { w, h } = naturalSizeRef.current;
    return clampRect({
      x: w * 0.1,
      y: h * 0.1,
      width: w * 0.8,
      height: h * 0.8,
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
    const middleX = (left + right) / 2;
    const middleY = (top + bottom) / 2;

    if (near(left, top)) return 'tl';
    if (near(right, top)) return 'tr';
    if (near(left, bottom)) return 'bl';
    if (near(right, bottom)) return 'br';
    if (near(middleX, top)) return 'tm';
    if (near(middleX, bottom)) return 'bm';
    if (near(left, middleY)) return 'ml';
    if (near(right, middleY)) return 'mr';
    if (cx >= left && cx <= right && cy >= top && cy <= bottom) return 'inside';
    return 'outside';
  }

  function rectFromEdge(startCrop: CropOptions, edge: Exclude<HitZone, 'inside' | 'outside'>, pointX: number, pointY: number) {
    const { w, h } = naturalSizeRef.current;
    let next = { ...startCrop };

    if (edge.includes('l')) {
      const right = startCrop.x + startCrop.width;
      const nextX = Math.max(0, Math.min(pointX, right - 1));
      next = { ...next, x: nextX, width: right - nextX };
    }

    if (edge.includes('r')) {
      next.width = Math.max(1, Math.min(pointX - startCrop.x, w - startCrop.x));
    }

    if (edge.includes('t')) {
      const bottom = startCrop.y + startCrop.height;
      const nextY = Math.max(0, Math.min(pointY, bottom - 1));
      next = { ...next, y: nextY, height: bottom - nextY };
    }

    if (edge.includes('b')) {
      next.height = Math.max(1, Math.min(pointY - startCrop.y, h - startCrop.y));
    }

    return clampRect(next);
  }

  function rectFromCorner(
    startCrop: CropOptions,
    corner: 'tl' | 'tr' | 'bl' | 'br',
    pointX: number,
    pointY: number,
  ) {
    const ratio = getOutputRatio();
    const anchorX = corner === 'tl' || corner === 'bl'
      ? startCrop.x + startCrop.width
      : startCrop.x;
    const anchorY = corner === 'tl' || corner === 'tr'
      ? startCrop.y + startCrop.height
      : startCrop.y;
    const signX = corner === 'tl' || corner === 'bl' ? -1 : 1;
    const signY = corner === 'tl' || corner === 'tr' ? -1 : 1;
    const rawWidth = Math.abs(pointX - anchorX);
    const rawHeight = Math.abs(pointY - anchorY);

    let nextWidth = rawWidth;
    let nextHeight = nextWidth / ratio;

    if (nextHeight > rawHeight) {
      nextHeight = rawHeight;
      nextWidth = nextHeight * ratio;
    }

    return clampRect({
      x: signX < 0 ? anchorX - nextWidth : anchorX,
      y: signY < 0 ? anchorY - nextHeight : anchorY,
      width: nextWidth,
      height: nextHeight,
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

      if (drag.edge) {
        if (drag.edge === 'tl' || drag.edge === 'tr' || drag.edge === 'bl' || drag.edge === 'br') {
          onChangeRef.current(rectFromCorner(drag.startCrop, drag.edge, point.x, point.y));
          return;
        }

        onChangeRef.current(rectFromEdge(drag.startCrop, drag.edge, point.x, point.y));
      }
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
            offsetX: point.x - current.x,
            offsetY: point.y - current.y,
            startCrop: current,
          };
          return;
        }

        if (hit !== 'outside') {
          dragRef.current = {
            mode: 'resize',
            offsetX: 0,
            offsetY: 0,
            edge: hit,
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
          <div className="crop-handle crop-handle-tm" />
          <div className="crop-handle crop-handle-bm" />
          <div className="crop-handle crop-handle-ml" />
          <div className="crop-handle crop-handle-mr" />
        </div>
      ) : null}
    </div>
  );
}
