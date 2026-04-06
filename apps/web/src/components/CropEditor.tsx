import { useRef, useEffect } from 'react';
import type { CropOptions } from '../types/image';

interface Props {
  imageUrl: string;
  value: CropOptions | null;
  onChange: (crop: CropOptions) => void;
}

type HitZone = 'tl' | 'tr' | 'bl' | 'br' | 'inside' | 'outside';
type DragMode = 'move' | 'resize' | 'new';

interface DragState {
  mode: DragMode;
  fixedImgX: number;
  fixedImgY: number;
  offsetX: number;
  offsetY: number;
  startCrop: CropOptions;
}

const HIT_RADIUS = 10;
const DEFAULT_PAD = 0.1;

const CURSOR: Record<HitZone, string> = {
  tl: 'nwse-resize',
  br: 'nwse-resize',
  tr: 'nesw-resize',
  bl: 'nesw-resize',
  inside: 'move',
  outside: 'crosshair',
};

export default function CropEditor({ imageUrl, value, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const naturalSizeRef = useRef({ w: 0, h: 0 });
  const dragRef = useRef<DragState | null>(null);
  const cachedRectRef = useRef<DOMRect | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);

  // Sync refs synchronously during render so onLoad (which may fire before effects) sees the latest values
  onChangeRef.current = onChange;
  valueRef.current = value;

  // Always cleanup cursor on unmount
  useEffect(() => () => { document.body.style.cursor = ''; }, []);

  function getLayout() {
    const el = containerRef.current;
    if (!el || !naturalSizeRef.current.w) return null;
    const { width: cw, height: ch } = el.getBoundingClientRect();
    const { w: iw, h: ih } = naturalSizeRef.current;
    const ir = iw / ih, cr = cw / ch;
    if (ir > cr) {
      return { rw: cw, rh: cw / ir, ox: 0, oy: (ch - cw / ir) / 2, iw, ih };
    }
    return { rw: ch * ir, rh: ch, ox: (cw - ch * ir) / 2, oy: 0, iw, ih };
  }

  function toImage(cx: number, cy: number) {
    const l = getLayout();
    if (!l) return null;
    return {
      x: Math.max(0, Math.min(l.iw, (cx - l.ox) / l.rw * l.iw)),
      y: Math.max(0, Math.min(l.ih, (cy - l.oy) / l.rh * l.ih)),
    };
  }

  function clampCrop(c: CropOptions): CropOptions {
    const { w, h } = naturalSizeRef.current;
    const x = Math.max(0, Math.min(c.x, w - 1));
    const y = Math.max(0, Math.min(c.y, h - 1));
    return {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.max(1, Math.min(Math.round(c.width), w - x)),
      height: Math.max(1, Math.min(Math.round(c.height), h - y)),
    };
  }

  function makeBox(ax: number, ay: number, bx: number, by: number): CropOptions {
    const x = Math.max(0, Math.min(ax, bx));
    const y = Math.max(0, Math.min(ay, by));
    return clampCrop({
      x, y,
      width: Math.abs(bx - ax),
      height: Math.abs(by - ay),
    });
  }

  function hitTest(cx: number, cy: number): HitZone {
    const v = valueRef.current;
    if (!v) return 'outside';
    const l = getLayout();
    if (!l) return 'outside';
    const L = l.ox + (v.x / l.iw) * l.rw;
    const T = l.oy + (v.y / l.ih) * l.rh;
    const R = l.ox + ((v.x + v.width) / l.iw) * l.rw;
    const B = l.oy + ((v.y + v.height) / l.ih) * l.rh;
    const nr = (px: number, py: number) => Math.abs(cx - px) <= HIT_RADIUS && Math.abs(cy - py) <= HIT_RADIUS;
    if (nr(L, T)) return 'tl';
    if (nr(R, T)) return 'tr';
    if (nr(L, B)) return 'bl';
    if (nr(R, B)) return 'br';
    if (cx >= L && cx <= R && cy >= T && cy <= B) return 'inside';
    return 'outside';
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const rect = cachedRectRef.current;
      if (!rect) return;

      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const ip = toImage(cx, cy);
      if (!ip) return;

      let newCrop: CropOptions;
      if (drag.mode === 'move') {
        const { w, h } = naturalSizeRef.current;
        newCrop = clampCrop({
          x: ip.x - drag.offsetX,
          y: ip.y - drag.offsetY,
          width: drag.startCrop.width,
          height: drag.startCrop.height,
        });
        // Clamp position so box stays within image
        newCrop = {
          ...newCrop,
          x: Math.max(0, Math.min(newCrop.x, w - newCrop.width)),
          y: Math.max(0, Math.min(newCrop.y, h - newCrop.height)),
        };
      } else {
        newCrop = makeBox(drag.fixedImgX, drag.fixedImgY, ip.x, ip.y);
      }

      onChangeRef.current(newCrop);
    }

    function onMouseUp() {
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

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    cachedRectRef.current = rect;
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const ip = toImage(cx, cy);
    if (!ip) return;

    const hit = hitTest(cx, cy);
    const v = valueRef.current;
    document.body.style.cursor = CURSOR[hit];

    if (hit === 'inside' && v) {
      dragRef.current = {
        mode: 'move',
        fixedImgX: 0, fixedImgY: 0,
        offsetX: ip.x - v.x,
        offsetY: ip.y - v.y,
        startCrop: v,
      };
    } else if ((hit === 'tl' || hit === 'tr' || hit === 'bl' || hit === 'br') && v) {
      const fx = hit === 'tl' || hit === 'bl' ? v.x + v.width : v.x;
      const fy = hit === 'tl' || hit === 'tr' ? v.y + v.height : v.y;
      dragRef.current = {
        mode: 'resize',
        fixedImgX: fx, fixedImgY: fy,
        offsetX: 0, offsetY: 0,
        startCrop: v,
      };
    } else {
      dragRef.current = {
        mode: 'new',
        fixedImgX: ip.x, fixedImgY: ip.y,
        offsetX: 0, offsetY: 0,
        startCrop: v ?? { x: 0, y: 0, width: 1, height: 1 },
      };
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (dragRef.current) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top);
    el.style.cursor = CURSOR[hit];
  }

  // Compute display rect from current value for rendering
  const displayRect = (() => {
    if (!value) return null;
    const l = getLayout();
    if (!l) return null;
    return {
      left: l.ox + (value.x / l.iw) * l.rw,
      top: l.oy + (value.y / l.ih) * l.rh,
      width: (value.width / l.iw) * l.rw,
      height: (value.height / l.ih) * l.rh,
    };
  })();

  return (
    <div
      className="crop-editor"
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
    >
      <img
        src={imageUrl}
        className="crop-img"
        onLoad={(e) => {
          const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
          naturalSizeRef.current = { w, h };
          if (!valueRef.current) {
            const p = DEFAULT_PAD;
            onChangeRef.current({
              x: Math.round(w * p),
              y: Math.round(h * p),
              width: Math.round(w * (1 - 2 * p)),
              height: Math.round(h * (1 - 2 * p)),
            });
          }
        }}
        draggable={false}
        alt=""
      />

      {value && displayRect && displayRect.width > 0 && displayRect.height > 0 && (
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
      )}
    </div>
  );
}
