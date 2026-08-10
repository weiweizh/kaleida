import { useEffect, useRef } from 'react'
import { useElementSize } from '../hooks/useElementSize.js'
import { clampViewport } from '../hooks/useKaleidoscopeRenderer.js'
import Slider from './Slider.jsx'
import { ResetIcon, CrosshairIcon } from './Icon.jsx'

const HANDLES = [
  { id: 'nw', cursor: 'nwse-resize' },
  { id: 'ne', cursor: 'nesw-resize' },
  { id: 'sw', cursor: 'nesw-resize' },
  { id: 'se', cursor: 'nwse-resize' },
]

/**
 * Interactive viewfinder: pick which part of the source feeds the
 * kaleidoscope. Drag anywhere to pan, drag corners to resize, scroll to
 * zoom in/out, double-click to reset.
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
          className="flex items-center gap-1 border border-line-strong bg-paper px-2 py-1 text-[11.5px] font-semibold text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          <ResetIcon size={12} />
          Reset
        </button>
      </div>

      <div
        ref={boxRef}
        className="no-select relative aspect-[4/3] w-full touch-none overflow-hidden border border-line bg-paper-deep"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={onReset}
        style={{ cursor: dragRef.current?.mode === 'pan' ? 'grabbing' : 'grab' }}
      >
        <img
          src={source.url}
          alt="Active source"
          draggable={false}
          className="absolute pointer-events-none"
          style={{ left: ox, top: oy, width: imgW, height: imgH, objectFit: 'contain' }}
        />

        {/* Dimmed mask outside the crop */}
        {cW > 0 && (
          <>
            <div className="absolute bg-black/55" style={{ top: 0, left: 0, width: cW, height: rect.y }} />
            <div
              className="absolute bg-black/55"
              style={{ top: rect.y + rect.s, left: 0, width: cW, height: cH - rect.y - rect.s }}
            />
            <div className="absolute bg-black/55" style={{ top: rect.y, left: 0, width: rect.x, height: rect.s }} />
            <div
              className="absolute bg-black/55"
              style={{ top: rect.y, left: rect.x + rect.s, width: cW - rect.x - rect.s, height: rect.s }}
            />
          </>
        )}

        {/* Crop frame — print registration: hairline + spot-colour corner ticks */}
        <div
          className="absolute pointer-events-none border border-ink/70"
          style={{ left: rect.x, top: rect.y, width: rect.s, height: rect.s }}
        >
          <span className="absolute -left-[1px] -top-[1px] h-2.5 w-2.5 border-l-2 border-t-2 border-reg-cyan" />
          <span className="absolute -right-[1px] -top-[1px] h-2.5 w-2.5 border-r-2 border-t-2 border-reg-magenta" />
          <span className="absolute -bottom-[1px] -left-[1px] h-2.5 w-2.5 border-b-2 border-l-2 border-reg-yellow" />
          <span className="absolute -right-[1px] -bottom-[1px] h-2.5 w-2.5 border-r-2 border-b-2 border-reg-cyan" />
        </div>

        {/* Rule-of-thirds grid inside the crop */}
        {rect.s > 24 && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: rect.x,
              top: rect.y,
              width: rect.s,
              height: rect.s,
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)',
              backgroundSize: `${rect.s / 3}px ${rect.s / 3}px`,
              backgroundPosition: 'center',
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

        {/* Corner handles */}
        {HANDLES.map((h) => {
          const pos = {
            nw: { left: rect.x - 11, top: rect.y - 11 },
            ne: { left: rect.x + rect.s - 7, top: rect.y - 11 },
            sw: { left: rect.x - 11, top: rect.y + rect.s - 7 },
            se: { left: rect.x + rect.s - 7, top: rect.y + rect.s - 7 },
          }[h.id]
          return (
            <div
              key={h.id}
              data-handle={h.id}
              className="absolute z-10 flex h-[18px] w-[18px] cursor-nwse-resize items-center justify-center"
              style={{ ...pos, cursor: h.cursor }}
            >
              <span className="h-[9px] w-[9px] border border-ink bg-paper shadow-[0_1px_0_rgba(255,255,255,0.6)]" />
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
        Drag to pan · corners to resize · scroll to zoom · double-click to reset
      </div>
    </div>
  )
}
