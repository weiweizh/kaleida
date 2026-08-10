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
    const vp = viewportRef.current
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

    const disp = displayRef.current || { layout: 'single', tiles: 1, gap: 0 }
    const tiles = disp.layout === 'tiled' ? Math.min(8, Math.max(1, disp.tiles | 0)) : 1

    if (tiles === 1) {
      vctx.drawImage(R.off, 0, 0, rs, rh, 0, 0, W, H)
      return
    }

    // Stamp the tile in a grid that fills the rectangle edge-to-edge. The
    // cell count adapts to the canvas aspect ratio so cells stay close to
    // square; each cell is drawn at its exact fractional size so no remainder
    // band is left at the edges.
    const cols = W >= H ? Math.max(1, Math.round((tiles * W) / H)) : tiles
    const rows = W >= H ? tiles : Math.max(1, Math.round((tiles * H) / W))
    const cellW = W / cols
    const cellH = H / rows
    const gapPx = ((disp.gap || 0) / 100) * Math.min(cellW, cellH)
    const tw = Math.max(1, cellW - gapPx)
    const th = Math.max(1, cellH - gapPx)
    const offX = (cellW - tw) / 2
    const offY = (cellH - th) / 2

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
          vctx.drawImage(R.off, 0, 0, rs, rh, c * cellW + offX, r * cellH + offY, tw, th)
        }
      }
      return
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        vctx.drawImage(R.off, 0, 0, rs, rh, c * cellW + offX, r * cellH + offY, tw, th)
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
      if (isAnimated || dirtyRef.current) {
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
