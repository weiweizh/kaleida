import { useEffect, useRef, useState } from 'react'
import {
  buildPolarMap,
  buildSourceBuffer,
  buildRenderParams,
  renderKaleidoscope,
  renderGeometric,
  GEOMETRIC_PALETTES,
  clamp,
} from '../lib/kaleidoscope.js'

const GEOMETRIC_PALETTE_IDS = Object.keys(GEOMETRIC_PALETTES)

/**
 * Drives the live preview.
 *
 * - Caches the polar map per canvas size and the source buffer per
 *   image+adjustments combination so most param tweaks only re-run the cheap
 *   fold-and-sample pass.
 * - Runs a single requestAnimationFrame loop: static modes redraw only when
 *   inputs change (dirty flag), the animated "flow" mode redraws every frame.
 *
 * Props:
 *   source       { image, url, name, width, height } | null
 *   viewport     { cx, cy, halfSize }
 *   params       mode/segments/order/speeds etc. (UI state object)
 *   adjustments  { brightness, contrast, hue, saturate, blur, scale }
 *   background   'transparent' | 'ink' | 'paper'
 *   size         { width, height } logical preview size in px
 *   canvasRef    ref to the visible <canvas>
 */
export function useKaleidoscopeRenderer({ source, viewport, params, adjustments, background, display, size, canvasRef }) {
  const rendererRef = useRef(null)
  const [fps, setFps] = useState(0)
  const [animating, setAnimating] = useState(false)

  // Keep latest props reachable from the rAF loop without re-subscribing.
  const paramsRef = useRef(params)
  paramsRef.current = params
  const viewportRef = useRef(viewport)
  viewportRef.current = viewport
  const backgroundRef = useRef(background)
  backgroundRef.current = background
  const adjustmentsRef = useRef(adjustments)
  adjustmentsRef.current = adjustments
  const sourceRef = useRef(source)
  sourceRef.current = source
  const displayRef = useRef(display)
  displayRef.current = display

  const outW = Math.max(1, Math.floor(size?.width || 0))
  const outH = Math.max(1, Math.floor(size?.height || 0))

  // In "tiled" mode we render a single square tile at the integer cell size
  // and then stamp it across the output in a grid at integer positions, so
  // every tile is pixel-identical and the grid fills the canvas edge-to-edge.
  const tileCount = display?.layout === 'tiled' ? Math.min(8, Math.max(1, display.tiles | 0)) : 1
  const renderW = tileCount > 1 ? Math.max(1, Math.floor(Math.min(outW, outH) / tileCount)) : outW
  const renderH = tileCount > 1 ? renderW : outH

  const dirtyRef = useRef(true)
  const smoothViewportRef = useRef(null)

  // ---- Viewport smoothing ----
  // The UI viewport is the drag target; we ease a separate "display viewport"
  // toward it each frame so moving the crop morphs the pattern smoothly.
  const SMOOTH_RATE = 9
  const SNAP_EPS = 0.04
  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

  /** Ease the display viewport one step toward the target; returns distance left. */
  const easeViewport = (target, dt) => {
    const cur = smoothViewportRef.current
    if (!cur) {
      smoothViewportRef.current = { ...target }
      return 0
    }
    const k = 1 - Math.exp(-dt * SMOOTH_RATE)
    cur.cx += (target.cx - cur.cx) * k
    cur.cy += (target.cy - cur.cy) * k
    cur.halfSize += (target.halfSize - cur.halfSize) * k
    return Math.max(
      Math.abs(target.cx - cur.cx),
      Math.abs(target.cy - cur.cy),
      Math.abs(target.halfSize - cur.halfSize),
    )
  }

  /** Rebuild the cached source buffer when image or adjustments change. */
  const ensureSource = () => {
    const R = rendererRef.current
    if (!R || !sourceRef.current) return
    const key = `${sourceRef.current.url.slice(-48)}|${JSON.stringify(adjustmentsRef.current)}`
    if (R.sourceKey !== key) {
      R.sourceBuf = buildSourceBuffer(sourceRef.current.image, adjustmentsRef.current)
      R.sourceKey = key
    }
  }

  /** (Re)create the polar map + offscreen target for a new render size. */
  const ensureRenderer = (w, h) => {
    const R = rendererRef.current
    if (!R || R.map.width !== w || R.map.height !== h) {
      const off = document.createElement('canvas')
      off.width = w
      off.height = h
      rendererRef.current = {
        map: buildPolarMap(w, h),
        off,
        ctx: off.getContext('2d'),
        outData: null,
        sourceBuf: null,
        sourceKey: '',
      }
      rendererRef.current.outData = rendererRef.current.ctx.createImageData(w, h)
    }
  }

  // Rebuild map when preview size or tile count changes.
  useEffect(() => {
    if (renderW <= 0 || renderH <= 0) return
    ensureRenderer(renderW, renderH)
    // A freshly created renderer has no source buffer yet — rebuild it too,
    // otherwise the next draw would bail out and the preview goes stale.
    ensureSource()
    dirtyRef.current = true
  }, [renderW, renderH])

  // Rebuild source buffer + mark dirty when the image or adjustments change.
  useEffect(() => {
    ensureSource()
    dirtyRef.current = true
    smoothViewportRef.current = null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source?.url, adjustments])

  // Any param/viewport/background/display change just marks the frame dirty.
  useEffect(() => {
    dirtyRef.current = true
  }, [params, viewport, background, display])

  /** Render the current state into the visible canvas. */
  const draw = (time) => {
    const canvas = canvasRef.current
    const R = rendererRef.current
    const src = sourceRef.current
    const vp = smoothViewportRef.current || viewportRef.current
    if (!canvas || !R || !R.map || !R.outData || !vp) return
    const rp = buildRenderParams(paramsRef.current, vp, time)
    const geometric = rp.mode === 'geometric'
    if (!geometric && (!R.sourceBuf || !src)) return
    const rs = R.map.width
    const rh = R.map.height

    // Render a single frame into the offscreen tile. Geometric mode is
    // procedural and renders directly; the image modes sample the source.
    if (geometric) {
      renderGeometric(R.ctx, rs, rh, rp, backgroundRef.current)
    } else {
      renderKaleidoscope(R.map, R.sourceBuf, rp, R.outData.data, backgroundRef.current)
      R.ctx.putImageData(R.outData, 0, 0)
    }

    const vctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height
    vctx.clearRect(0, 0, W, H)
    vctx.imageSmoothingEnabled = true
    vctx.imageSmoothingQuality = 'high'

    // With a solid background, paint the full canvas first so any tile gaps
    // show the chosen colour instead of transparency.
    const bg = backgroundRef.current
    if (bg === 'ink') {
      vctx.fillStyle = '#080b13'
      vctx.fillRect(0, 0, W, H)
    } else if (bg === 'paper') {
      vctx.fillStyle = '#f7f5f0'
      vctx.fillRect(0, 0, W, H)
    }

    // Output transparency — fade the whole pattern over the background.
    const opacity = (adjustmentsRef.current.opacity ?? 100) / 100
    vctx.globalAlpha = Math.max(0, Math.min(1, opacity))

    const disp = displayRef.current || { layout: 'single', tiles: 1, gap: 0 }
    const tiles = disp.layout === 'tiled' ? Math.min(8, Math.max(1, disp.tiles | 0)) : 1

    if (tiles === 1) {
      vctx.drawImage(R.off, 0, 0, rs, rh, 0, 0, W, H)
      return
    }

    // Stamp the tile in a grid whose cells are exactly square. The cell
    // count adapts to the canvas aspect ratio; the grid is centred so the
    // remainder is left as an even gutter instead of stretched cells.
    const cols = W >= H ? Math.max(1, Math.round((tiles * W) / H)) : tiles
    const rows = W >= H ? tiles : Math.max(1, Math.round((tiles * H) / W))
    const cellW = W / cols
    const cellH = H / rows
    const cell = Math.min(cellW, cellH)
    const gridW = cols * cell
    const gridH = rows * cell
    const startX = (W - gridW) / 2
    const startY = (H - gridH) / 2
    const gapPx = ((disp.gap || 0) / 100) * cell
    const tw = Math.max(1, cell - gapPx)
    const off = (cell - tw) / 2

    if (geometric) {
      // Geometric tiles are distinct: each cell gets its own palette + seed so
      // the grid reads as a collection of individual mandalas.
      const n = GEOMETRIC_PALETTE_IDS.length
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c
          const palette = GEOMETRIC_PALETTE_IDS[idx % n]
          renderGeometric(
            R.ctx,
            rs,
            rh,
            { ...rp, palette, geoSeed: (rp.geoSeed | 0) + idx * 37 },
            bg,
          )
          vctx.drawImage(R.off, 0, 0, rs, rh, startX + c * cell + off, startY + r * cell + off, tw, tw)
        }
      }
      return
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        vctx.drawImage(R.off, 0, 0, rs, rh, startX + c * cell + off, startY + r * cell + off, tw, tw)
      }
    }
  }

  // The single animation loop. rAF is scheduled *before* drawing so a frame
  // can never stall the loop permanently.
  useEffect(() => {
    let raf
    let last = performance.now()
    let time = 0
    let frames = 0
    let fpsAt = performance.now()

    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const p = paramsRef.current
      const isFlow = p.mode === 'flow'
      const isAnimated = p.playing && (isFlow || p.mode === 'geometric')
      if (isAnimated) time += dt

      // Ease the display viewport toward the drag target. When reduced motion
      // is requested we snap instantly; otherwise we keep drawing until the
      // eased viewport has settled within a small epsilon.
      let smoothing = false
      const target = viewportRef.current
      if (target) {
        if (reducedMotion || smoothViewportRef.current === null) {
          smoothViewportRef.current = { ...target }
        } else if (easeViewport(target, dt) > SNAP_EPS) {
          smoothing = true
        }
      }

      if (isAnimated || dirtyRef.current || smoothing) {
        dirtyRef.current = false
        draw(time)
      }
      setAnimating(isAnimated)
      if (isAnimated) {
        frames++
        if (now - fpsAt >= 500) {
          setFps(Math.round((frames * 1000) / (now - fpsAt)))
          frames = 0
          fpsAt = now
        }
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { fps, animating }
}

/** Derived helpers the viewfinder / renderer share. */
export function defaultViewport(w, h) {
  const halfSize = clamp(Math.min(w, h) * 0.32, 24, Math.min(w, h) / 2)
  return { cx: w / 2, cy: h / 2, halfSize }
}

export function clampViewport(v, w, h) {
  const maxHalf = Math.min(w, h) / 2
  const halfSize = clamp(v.halfSize, 8, maxHalf)
  return {
    cx: clamp(v.cx, halfSize, w - halfSize),
    cy: clamp(v.cy, halfSize, h - halfSize),
    halfSize,
  }
}
