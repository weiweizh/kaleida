import { useEffect, useRef } from 'react'
import { useElementSize } from '../hooks/useElementSize.js'
import { clampViewport } from '../hooks/useKaleidoscopeRenderer.js'
import Slider from './Slider.jsx'
import { ResetIcon, CrosshairIcon } from './Icon.jsx'

const HANDLES = [
  { id: 'n', cursor: 'ns-resize' },
  { id: 'e', cursor: 'ew-resize' },
  { id: 's', cursor: 'ns-resize' },
  { id: 'w', cursor: 'ew-resize' },
]

/**
 * Interactive viewfinder: pick which part of the source feeds the
 * kaleidoscope. The selected area is shown as a circular viewport (like a
 * real kaleidoscope tube). Drag anywhere to pan, drag corners to resize,
 * scroll to zoom in/out, double-click to reset.
 */
export default function Viewfinder({ source, viewport, onChange, onReset }) {
  const boxRef = useRef(null)
  const dragRef = useRef(null)
  const { width: cW, height: cH } = useElementSize(boxRef)

  const { width: sw, height: sh } = source
  const v = viewport

  const scale = cW > 0 ? Math.min(cW / sw, cH / sh) : 1
  const imgW = sw * scale
  const imgH = sh * scale
  const ox = (cW - imgW) / 2
  const oy = (cH - imgH) / 2

  const rect = {
    x: ox + (v.cx - v.halfSize) * scale,
    y: oy + (v.cy - v.halfSize) * scale,
    s: v.halfSize * 2 * scale,
  }
  const center = { x: ox + v.cx * scale, y: oy + v.cy * scale }
  const maxHalf = Math.min(sw, sh) / 2

  const clampAndEmit = (next) => onChange(clampViewport(next, sw, sh))

  // ---- Pointer interaction ----
  const onPointerDown = (e) => {
    const handle = e.target.dataset?.handle || null
    dragRef.current = {
      mode: handle ? `resize:${handle}` : 'pan',
      clientX: e.clientX,
      clientY: e.clientY,
      viewport: { ...v },
      centerDist: 0,
    }
    if (handle) {
      const dx = center.x - e.clientX
      const dy = center.y - e.clientY
      dragRef.current.centerDist = Math.hypot(dx, dy)
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e) => {
    const d = dragRef.current
    if (!d) return
    const dpx = (e.clientX - d.clientX) / scale
    const dpy = (e.clientY - d.clientY) / scale
    if (d.mode === 'pan') {
      clampAndEmit({ cx: d.viewport.cx + dpx, cy: d.viewport.cy + dpy, halfSize: d.viewport.halfSize })
    } else {
      const ndx = e.clientX - center.x
      const ndy = e.clientY - center.y
      const newDist = Math.max(1, Math.hypot(ndx, ndy))
      const nextHalf = Math.max(8, (d.viewport.halfSize * newDist) / Math.max(1, d.centerDist))
      clampAndEmit({ cx: d.viewport.cx, cy: d.viewport.cy, halfSize: Math.min(nextHalf, maxHalf) })
    }
  }

  const onPointerUp = () => {
    dragRef.current = null
  }

  // Non-passive wheel handler so we can preventDefault.
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      const factor = e.deltaY > 0 ? 1.08 : 1 / 1.08
      clampAndEmit({ ...v, halfSize: Math.min(Math.max(8, v.halfSize * factor), maxHalf) })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, maxHalf, scale, center.x, center.y])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="spec">Viewfinder</div>
        <button
          type="button"
          onClick={onReset}
          className="pressable flex items-center gap-1 border border-line-strong bg-paper px-2 py-1 text-[11.5px] font-semibold text-ink-soft hover:border-ink hover:text-ink"
        >
          <ResetIcon size={12} />
          Reset
        </button>
      </div>

      <div
        ref={boxRef}
        className="no-select relative aspect-[4/3] w-full touch-none overflow-hidden border border-line bg-paper-deep transition-colors duration-150 ease-[var(--ease-snappy)] hover:border-line-strong"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={onReset}
        style={{ cursor: dragRef.current?.mode === 'pan' ? 'grabbing' : 'grab' }}
      >
        <img
          key={source.url}
          src={source.url}
          alt="Active source"
          draggable={false}
          className="source-in absolute pointer-events-none"
          style={{ left: ox, top: oy, width: imgW, height: imgH, objectFit: 'contain' }}
        />

        {/* Dimmed mask outside the circular viewport */}
        {cW > 0 && (
          <div
            className="absolute pointer-events-none"
            style={{
              inset: 0,
              background: `radial-gradient(circle at ${center.x}px ${center.y}px, transparent 0 ${Math.max(0, rect.s / 2)}px, rgba(0, 0, 0, 0.55) ${Math.max(0, rect.s / 2)}px)`,
            }}
          />
        )}

        {/* Circular crop frame — a tube-like ring to mimic a real kaleidoscope */}
        <div
          className="absolute pointer-events-none rounded-full border border-ink/80"
          style={{ left: rect.x, top: rect.y, width: rect.s, height: rect.s }}
        >
          {/* Outer rim */}
          <span className="absolute -inset-[5px] rounded-full border border-ink/25" />
          {/* Registration ticks at the cardinal points */}
          <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 border-l-2 border-t-2 border-reg-cyan" />
          <span className="absolute right-0 top-1/2 h-2 w-2 translate-x-1/2 -translate-y-1/2 border-r-2 border-t-2 border-reg-magenta" />
          <span className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 border-b-2 border-l-2 border-reg-yellow" />
          <span className="absolute left-0 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 border-l-2 border-b-2 border-reg-cyan" />
        </div>

        {/* Radial guide inside the viewport — spokes + rings */}
        {rect.s > 24 && (
          <div
            className="absolute pointer-events-none rounded-full"
            style={{
              left: rect.x,
              top: rect.y,
              width: rect.s,
              height: rect.s,
              backgroundImage: `repeating-conic-gradient(rgba(255,255,255,0.15) 0 0.5deg, transparent 0.5deg 45deg), repeating-radial-gradient(circle at ${center.x}px ${center.y}px, transparent 0 ${Math.max(1, rect.s / 6)}px, rgba(255,255,255,0.12) ${Math.max(1, rect.s / 6)}px ${Math.max(1, rect.s / 6) + 1}px, transparent ${Math.max(1, rect.s / 6) + 1}px ${rect.s / 3}px)`,
            }}
          />
        )}

        {/* Center crosshair */}
        <div
          className="absolute pointer-events-none flex -translate-x-1/2 -translate-y-1/2 items-center justify-center text-reg-magenta"
          style={{ left: center.x, top: center.y }}
        >
          <CrosshairIcon size={14} />
        </div>

        {/* Cardinal handles on the rim */}
        {HANDLES.map((h) => {
          const pos = {
            n: { left: center.x - 9, top: rect.y - 11 },
            e: { left: rect.x + rect.s - 7, top: center.y - 9 },
            s: { left: center.x - 9, top: rect.y + rect.s - 7 },
            w: { left: rect.x - 11, top: center.y - 9 },
          }[h.id]
          return (
            <div
              key={h.id}
              data-handle={h.id}
              className="group/handle absolute z-10 flex h-[18px] w-[18px] items-center justify-center transition-transform duration-120 ease-[var(--ease-settle)] hover:scale-125 active:scale-110"
              style={{ ...pos, cursor: h.cursor }}
            >
              <span className="h-[9px] w-[9px] border border-ink bg-paper shadow-[0_1px_0_rgba(255,255,255,0.6)] transition-colors duration-150 ease-[var(--ease-snappy)] group-hover/handle:bg-ink" />
            </div>
          )
        })}
      </div>

      <Slider
        label="Crop size"
        min={8}
        max={Math.max(9, Math.round(maxHalf))}
        step={1}
        value={Math.round(v.halfSize)}
        onChange={(next) => clampAndEmit({ ...v, halfSize: next })}
        format={(x) => `${x}px`}
      />
      <div className="text-[11px] text-ink-soft">
        Drag to pan · rim handles to resize · scroll to zoom · double-click to reset
      </div>
    </div>
  )
}
