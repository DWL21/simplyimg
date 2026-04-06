import { useRef, useState, useEffect } from 'react';
import type { CropOptions } from '../types/image';

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Props {
  imageUrl: string;
  value: CropOptions | null;
  onChange: (crop: CropOptions) => void;
}

export default function CropEditor({ imageUrl, value, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const naturalSizeRef = useRef({ w: 0, h: 0 });
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  // Cache the container rect at drag start to avoid per-mousemove layout flushes
  const containerRectRef = useRef<DOMRect | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const [dragDisplay, setDragDisplay] = useState<Rect | null>(null);

  function getLayout() {
    const el = containerRef.current;
    if (!el || !naturalSizeRef.current.w) return null;
    const { width: cw, height: ch } = el.getBoundingClientRect();
    const { w: iw, h: ih } = naturalSizeRef.current;
    const ir = iw / ih;
    const cr = cw / ch;
    if (ir > cr) {
      const rw = cw;
      const rh = cw / ir;
      return { rw, rh, ox: 0, oy: (ch - rh) / 2, iw, ih };
    }
    const rh = ch;
    const rw = ch * ir;
    return { rw, rh, ox: (cw - rw) / 2, oy: 0, iw, ih };
  }

  useEffect(() => {
    function pointFromEvent(e: MouseEvent): { x: number; y: number } | null {
      const r = containerRectRef.current;
      if (!r) return null;
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function onMouseMove(e: MouseEvent) {
      if (!dragStartRef.current) return;
      const p = pointFromEvent(e);
      if (!p) return;
      const s = dragStartRef.current;
      setDragDisplay({
        left: Math.min(s.x, p.x),
        top: Math.min(s.y, p.y),
        width: Math.abs(p.x - s.x),
        height: Math.abs(p.y - s.y),
      });
    }

    function onMouseUp(e: MouseEvent) {
      const start = dragStartRef.current;
      if (!start) return;
      dragStartRef.current = null;
      containerRectRef.current = null;
      setDragDisplay(null);

      const p = pointFromEvent(e);
      if (!p) return;

      const layout = getLayout();
      if (!layout) return;
      const { rw, rh, ox, oy, iw, ih } = layout;

      const toImg = (cx: number, cy: number) => ({
        x: Math.max(0, Math.min(iw, ((cx - ox) / rw) * iw)),
        y: Math.max(0, Math.min(ih, ((cy - oy) / rh) * ih)),
      });

      const a = toImg(start.x, start.y);
      const b = toImg(p.x, p.y);

      const x = Math.round(Math.min(a.x, b.x));
      const y = Math.round(Math.min(a.y, b.y));
      const w = Math.round(Math.abs(b.x - a.x));
      const h = Math.round(Math.abs(b.y - a.y));

      if (w > 4 && h > 4) {
        onChangeRef.current({ x, y, width: w, height: h });
      }
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
    // Capture rect once per drag — avoids per-mousemove getBoundingClientRect calls
    const rect = el.getBoundingClientRect();
    containerRectRef.current = rect;
    const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    dragStartRef.current = p;
    setDragDisplay({ left: p.x, top: p.y, width: 0, height: 0 });
  }

  function getValueRect(): Rect | null {
    if (!value) return null;
    const layout = getLayout();
    if (!layout) return null;
    const { rw, rh, ox, oy, iw, ih } = layout;
    return {
      left: ox + (value.x / iw) * rw,
      top: oy + (value.y / ih) * rh,
      width: (value.width / iw) * rw,
      height: (value.height / ih) * rh,
    };
  }

  const displayRect = dragDisplay ?? getValueRect();

  return (
    <div className="crop-editor" ref={containerRef} onMouseDown={handleMouseDown}>
      <img
        src={imageUrl}
        className="crop-img"
        onLoad={(e) => {
          naturalSizeRef.current = {
            w: e.currentTarget.naturalWidth,
            h: e.currentTarget.naturalHeight,
          };
        }}
        draggable={false}
        alt=""
      />
      {displayRect && displayRect.width > 2 && displayRect.height > 2 && (
        <div
          className="crop-box"
          style={{
            left: displayRect.left,
            top: displayRect.top,
            width: displayRect.width,
            height: displayRect.height,
          }}
        />
      )}
      {!dragDisplay && !value && (
        <div className="crop-hint-overlay">드래그하여 영역 선택</div>
      )}
    </div>
  );
}
