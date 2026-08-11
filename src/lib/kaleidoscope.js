/**
 * Kaleida — rendering engine.
 *
 * Rendering model
 * ---------------
 * The output disc is sampled per-pixel in polar space. For every output pixel
 * we precompute (in `buildPolarMap`) its normalised radius and raw angle once
 * per canvas size. Each frame we:
 *   1. Fold the raw angle into a single base wedge using the active symmetry
 *      algorithm (segmented mirror, mandala petal or animated flow),
 *   2. Apply optional wave displacement + zoom pulse (dynamic mode),
 *   3. Bilinearly sample the (pre-filtered, pre-multiplied) source buffer.
 *
 * Because the polar map is cached per size and the source buffer is cached
 * per image/adjustment combination, slider tweaks only re-run the cheap
 * fold-and-sample pass.
 */

export const TAU = Math.PI * 2

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)

export const degToRad = (d) => (d * Math.PI) / 180

/**
 * Build the static polar map for a rectangular output canvas.
 * `radius` is normalised to 1 at the edge of the inscribed disc
 * (min(width, height) / 2);
 * `angle` is the pixel's direction from centre;
 * `edge` remaps the whole rectangle onto the source region (square output
 * shape): it's the distance from centre to the rectangle boundary along the
 * pixel's angle, normalised by the disc half-size, so every point inside the
 * rectangle maps into the selected source region.
 */
export function buildPolarMap(width, height) {
  const count = width * height
  const radius = new Float32Array(count)
  const angle = new Float32Array(count)
  const edge = new Float32Array(count)
  const halfW = width / 2
  const halfH = height / 2
  const half = Math.min(halfW, halfH)
  let i = 0
  for (let y = 0; y < height; y++) {
    const dy = y - halfH
    for (let x = 0; x < width; x++) {
      const dx = x - halfW
      const a = Math.atan2(dy, dx)
      radius[i] = Math.sqrt(dx * dx + dy * dy) / half
      angle[i] = a
      const ca = Math.abs(Math.cos(a))
      const sa = Math.abs(Math.sin(a))
      let d
      if (ca > 1e-6 && sa > 1e-6) {
        d = Math.min(halfW / ca, halfH / sa)
      } else if (ca > 1e-6) {
        d = halfW / ca
      } else {
        d = halfH / sa
      }
      edge[i] = half / d
      i++
    }
  }
  return { radius, angle, edge, width, height, count }
}

/** Convert the UI adjustment object into a CSS canvas-filter string. */
export function filterFromAdjustments(a) {
  const parts = []
  const brightness = (a.brightness || 0) / 100 + 1
  const contrast = (a.contrast || 0) / 100 + 1
  const saturate = (a.saturate ?? 100) / 100
  const hue = a.hue || 0
  const blur = a.blur || 0
  if (brightness !== 1) parts.push(`brightness(${brightness.toFixed(3)})`)
  if (contrast !== 1) parts.push(`contrast(${contrast.toFixed(3)})`)
  if (saturate !== 1) parts.push(`saturate(${saturate.toFixed(3)})`)
  if (hue !== 0) parts.push(`hue-rotate(${hue}deg)`)
  if (blur > 0.05) parts.push(`blur(${blur.toFixed(2)}px)`)
  return parts.join(' ')
}

/**
 * Draw the source image into an offscreen canvas applying the adjustment
 * filter, then read it back into a premultiplied-alpha RGBA buffer.
 * Premultiplying up-front makes the bilinear sampling in the renderer blend
 * transparent edges correctly.
 */
export function buildSourceBuffer(image, adjustments) {
  const w = image.naturalWidth || image.width
  const h = image.naturalHeight || image.height
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const filter = filterFromAdjustments(adjustments)
  if (filter) ctx.filter = filter
  ctx.drawImage(image, 0, 0)
  const imgData = ctx.getImageData(0, 0, w, h)
  const d = imgData.data
  let hasAlpha = false
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3]
    if (a !== 255) hasAlpha = true
    d[i] = (d[i] * a) / 255
    d[i + 1] = (d[i + 1] * a) / 255
    d[i + 2] = (d[i + 2] * a) / 255
  }
  return { data: d, width: w, height: h, hasAlpha }
}

/**
 * Collapse UI state into the flat numeric parameter object the hot loop needs.
 * `time` is in seconds and drives animation.
 */
/**
 * Procedural geometric palettes — translucent, harmonious colour sets used by
 * the geometric mode. Each id maps to a labelled group of 5 colours.
 */
export const GEOMETRIC_PALETTES = {
  aqua: { label: 'Aqua & Mint', colors: ['#0ea5e9', '#14b8a6', '#22d3ee', '#10b981', '#0f766e'] },
  sunset: { label: 'Sunset & Teal', colors: ['#f97316', '#fb923c', '#2dd4bf', '#0ea5e9', '#f59e0b'] },
  blossom: { label: 'Pink & Violet', colors: ['#ec4899', '#a855f7', '#f472b6', '#8b5cf6', '#f0abfc'] },
  earth: { label: 'Amber & Bronze', colors: ['#eab308', '#d97706', '#a16207', '#fbbf24', '#92400e'] },
}

/** Deterministic PRNG so each tile seed produces a stable, distinct pattern. */
function mulberry32(seed) {
  let t = (seed >>> 0) + 0x6d2b79f5
  return () => {
    t += 0x6d2b79f5
    let r = t
    r = Math.imul(r ^ (r >>> 15), r | 1)
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const withAlpha = (hex, a) => {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r},${g},${b},${a})`
}

/**
 * Draw a translucent 4-fold symmetric geometric mandala directly into a 2D
 * canvas context. Fully procedural — no source image required.
 *
 * Layers (gated by `p.geoDetail`, 1–5):
 *   1  overlapping rotated squares
 *   2  + outer ring + accent dots
 *   3  + intersecting loop rings
 *   4  + rotating elliptical petals
 *   5  + layered centre star + diamond
 * The `p.geoSeed` shifts proportions/rotations so each tile is distinct.
 */
export function renderGeometric(ctx, width, height, p, background) {
  const palette = (GEOMETRIC_PALETTES[p.palette] || GEOMETRIC_PALETTES.aqua).colors
  const detail = clamp((p.geoDetail | 0) || 3, 1, 5)
  const rng = mulberry32(p.geoSeed || 0)
  const dark = background === 'ink'
  const size = Math.min(width, height)

  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = dark ? '#0b0e16' : background === 'paper' ? '#f7f4ee' : '#ffffff'
  ctx.fillRect(0, 0, width, height)

  const cx = width / 2
  const cy = height / 2
  const R = size * (0.42 + rng() * 0.05)
  const rot = (rng() - 0.5) * 1.2 + (p.rotationPhase || 0)
  const sw = Math.max(1, size * 0.011)

  // Base weave — two translucent squares, one rotated 45°.
  const sq = R * 0.68
  for (const [rr, col, a] of [
    [0, palette[0], 0.4],
    [Math.PI / 4, palette[1], 0.32],
  ]) {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rr + rot * 0.25)
    ctx.fillStyle = withAlpha(col, a)
    ctx.fillRect(-sq, -sq, sq * 2, sq * 2)
    ctx.restore()
  }

  if (detail >= 3) {
    // Intersecting loop rings.
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rot)
    ctx.strokeStyle = withAlpha(palette[3], 0.55)
    ctx.lineWidth = sw
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU
      ctx.beginPath()
      ctx.arc(Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5, R * 0.34, 0, TAU)
      ctx.stroke()
    }
    ctx.restore()
  }

  if (detail >= 4) {
    // Rotating elliptical petals.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + rot * 0.5
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(a)
      ctx.beginPath()
      ctx.ellipse(R * 0.34, 0, R * 0.3, R * 0.15, 0, 0, TAU)
      ctx.fillStyle = withAlpha(i % 2 ? palette[0] : palette[1], 0.22)
      ctx.fill()
      ctx.restore()
    }
  }

  // Pointed 8-point star motif.
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rot * 0.5)
  const starR = R * 0.86
  const inner = starR * 0.62
  ctx.beginPath()
  for (let i = 0; i < 8; i++) {
    const rad = i % 2 === 0 ? starR : inner
    const a = (i / 8) * TAU
    const x = Math.cos(a) * rad
    const y = Math.sin(a) * rad
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = withAlpha(palette[2], 0.5)
  ctx.fill()
  ctx.restore()

  if (detail >= 5) {
    // Layered centre: inner circle + rotating diamond.
    ctx.fillStyle = withAlpha(palette[4], 0.65)
    ctx.beginPath()
    ctx.arc(cx, cy, R * 0.18, 0, TAU)
    ctx.fill()
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rot)
    ctx.fillStyle = withAlpha(palette[2], 0.45)
    ctx.beginPath()
    ctx.moveTo(0, -R * 0.28)
    ctx.lineTo(R * 0.12, 0)
    ctx.lineTo(0, R * 0.28)
    ctx.lineTo(-R * 0.12, 0)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  if (detail >= 2) {
    // Outer ring + accent dots.
    ctx.strokeStyle = withAlpha(palette[3], 0.6)
    ctx.lineWidth = sw
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, TAU)
    ctx.stroke()
    ctx.fillStyle = withAlpha(palette[1], 0.75)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + rot
      ctx.beginPath()
      ctx.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, size * 0.011, 0, TAU)
      ctx.fill()
    }
  }
}

export function buildRenderParams(params, viewport, time) {
  const flow = params.mode === 'flow'
  const geometric = params.mode === 'geometric'
  const zoom = params.zoom * params.scale
  return {
    mode: params.mode,
    shape: params.shape === 'square' ? 'square' : 'circle',
    segments: Math.max(2, (params.segments | 0) || 8),
    mandalaOrder: Math.max(2, (params.mandalaOrder | 0) || 6),
    patternOffsetRad: degToRad(params.patternOffset || 0),
    sourceAngleRad: degToRad(params.sourceAngle || 0),
    rotationPhase: flow || geometric ? time * (params.rotationSpeed || 0) : 0,
    zoom,
    zoomPulseAmp: flow ? 0.06 : 0,
    zoomPulseFreq: flow ? 1.2 : 0,
    wave: flow ? params.wave || 0 : 0,
    waveFreq: 3,
    waveSpeed: 1.6,
    palette: params.palette || 'aqua',
    geoDetail: (params.geoDetail | 0) || 3,
    geoSeed: (params.geoSeed | 0) || 0,
    cx: viewport.cx,
    cy: viewport.cy,
    halfSize: Math.max(1, viewport.halfSize),
  }
}

/**
 * The main per-pixel renderer. Fills `out` (a Uint8ClampedArray of
 * `size*size*4` — typically `imageData.data`) with the kaleidoscope frame.
 */
export function renderKaleidoscope(map, src, p, out, background) {
  const { radius, angle, edge, count } = map
  const { data, width: sw, height: sh, hasAlpha } = src

  // Background: transparent leaves an alpha hole outside the disc, otherwise
  // we fill the full square first.
  const transparent = background === 'transparent'
  let bgR = 0
  let bgG = 0
  let bgB = 0
  if (background === 'ink') {
    bgR = 8
    bgG = 11
    bgB = 19
  } else if (background === 'paper') {
    bgR = 247
    bgG = 245
    bgB = 240
  }

  if (transparent) {
    out.fill(0)
  } else {
    for (let i = 0; i < count; i++) {
      const o = i << 2
      out[o] = bgR
      out[o + 1] = bgG
      out[o + 2] = bgB
      out[o + 3] = 255
    }
  }

  const mandala = p.mode === 'mandala'
  const square = p.shape === 'square'
  const w = mandala ? TAU / p.mandalaOrder : TAU / p.segments
  const halfW = w * 0.5
  const sA = p.sourceAngleRad
  const rot = p.rotationPhase
  const cx = p.cx
  const cy = p.cy
  const half = p.halfSize
  const zoom = p.zoom
  const wave = p.wave
  const waveFreq = p.waveFreq
  const waveSpeed = p.waveSpeed
  const zp = 1 + p.zoomPulseAmp * Math.sin(p.rotationPhase * p.zoomPulseFreq)

  for (let i = 0; i < count; i++) {
    const r = radius[i]
    if (!square && r >= 1) continue // outside the disc — background already set
    const o = i << 2

    // --- Fold the angle into the base wedge ---
    let local
    if (mandala) {
      let t = angle[i] + p.patternOffsetRad + rot
      t -= Math.floor(t / w) * w
      // Each petal is its own mirror image about its centre axis.
      local = t < halfW ? t : w - t
    } else {
      // Multi-mirror / flow: alternating mirrored slices fill the circle.
      const t = angle[i] + rot
      const k = Math.floor(t / w)
      local = t - k * w
      if (k & 1) local = w - local
    }

    // --- Dynamic flow: wave displacement on angle + subtle radial swell ---
    // For the square shape we remap the normalised radius by the square-edge
    // factor so every point inside the square maps into the selected region.
    let sr = (square ? r * edge[i] : r) * zoom * zp
    if (wave > 0) {
      const s1 = Math.sin(r * waveFreq * TAU + p.rotationPhase * waveSpeed)
      local += wave * s1
      sr *= 1 + 0.05 * wave * Math.sin(r * waveFreq * TAU * 0.5 - p.rotationPhase * waveSpeed * 0.7)
    }

    // --- Map to source space ---
    const sa = local + sA
    const ca = Math.cos(sa)
    const sn = Math.sin(sa)
    let sx = cx + sr * half * ca
    let sy = cy + sr * half * sn

    // --- Bilinear sample (with clamped indices) ---
    sx -= 0.5
    sy -= 0.5
    let x0 = sx | 0
    let y0 = sy | 0
    let x1 = x0 + 1
    let y1 = y0 + 1
    if (x0 < 0) x0 = 0
    else if (x0 >= sw) x0 = sw - 1
    if (x1 < 0) x1 = 0
    else if (x1 >= sw) x1 = sw - 1
    if (y0 < 0) y0 = 0
    else if (y0 >= sh) y0 = sh - 1
    if (y1 < 0) y1 = 0
    else if (y1 >= sh) y1 = sh - 1
    const fx = sx - x0
    const fy = sy - y0
    const i00 = (y0 * sw + x0) << 2
    const i10 = (y0 * sw + x1) << 2
    const i01 = (y1 * sw + x0) << 2
    const i11 = (y1 * sw + x1) << 2
    const w00 = (1 - fx) * (1 - fy)
    const w10 = fx * (1 - fy)
    const w01 = (1 - fx) * fy
    const w11 = fx * fy

    const a = data[i00 + 3] * w00 + data[i10 + 3] * w10 + data[i01 + 3] * w01 + data[i11 + 3] * w11
    if (a <= 0) {
      out[o + 3] = 0
      continue
    }
    let cr = data[i00] * w00 + data[i10] * w10 + data[i01] * w01 + data[i11] * w11
    let cg = data[i00 + 1] * w00 + data[i10 + 1] * w10 + data[i01 + 1] * w01 + data[i11 + 1] * w11
    let cb = data[i00 + 2] * w00 + data[i10 + 2] * w10 + data[i01 + 2] * w01 + data[i11 + 2] * w11
    if (hasAlpha && a < 255) {
      const inv = 255 / a
      cr *= inv
      cg *= inv
      cb *= inv
    }
    out[o] = cr
    out[o + 1] = cg
    out[o + 2] = cb
    out[o + 3] = a
  }
}

/**
 * Stamp a square tile canvas across `ctx` in an N×N grid at integer positions,
 * optionally leaving a percentage gap between tiles. The tile canvas must be
 * `Math.floor(size / tiles)` px square so tiles are pixel-identical. Used for
 * both preview and export tiling.
 */
export function composeTiled(ctx, tileCanvas, size, tiles, gapPercent = 0) {
  const cell = Math.floor(size / tiles)
  const gap = Math.round((gapPercent / 100) * size)
  const tw = Math.max(1, cell - gap)
  const off = Math.max(0, Math.floor((cell - tw) / 2))
  const start = Math.max(0, Math.floor((size - cell * tiles) / 2))
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  for (let r = 0; r < tiles; r++) {
    for (let c = 0; c < tiles; c++) {
      ctx.drawImage(
        tileCanvas,
        0,
        0,
        tileCanvas.width,
        tileCanvas.height,
        start + off + c * cell,
        start + off + r * cell,
        tw,
        tw,
      )
    }
  }
}

/**
 * One-shot high-resolution export. Builds its own polar map + source buffer at
 * the requested size so preview resolution never limits the download.
 * `display` = { layout: 'single'|'tiled', tiles, gap } controls tiling.
 */
export async function exportKaleidoscope({
  source,
  viewport,
  adjustments,
  params,
  background,
  size = 2048,
  display,
}) {
  const tiles = display?.layout === 'tiled' ? clamp(display.tiles | 0, 1, 8) : 1
  const tileSize = tiles > 1 ? Math.floor(size / tiles) : size
  const renderParams = buildRenderParams(params, viewport, 0)
  const geometric = renderParams.mode === 'geometric'

  // Geometric mode is procedural — render each tile directly with its own seed
  // so a tiled export becomes a grid of distinct patterns.
  if (geometric && tiles > 1) {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    const cell = Math.floor(size / tiles)
    const gap = Math.round(((display?.gap || 0) / 100) * size)
    const tw = Math.max(1, cell - gap)
    const off = Math.max(0, Math.floor((cell - tw) / 2))
    const start = Math.max(0, Math.floor((size - cell * tiles) / 2))
    const tile = document.createElement('canvas')
    tile.width = tw
    tile.height = tw
    const tctx = tile.getContext('2d')
    const paletteIds = Object.keys(GEOMETRIC_PALETTES)
    for (let r = 0; r < tiles; r++) {
      for (let c = 0; c < tiles; c++) {
        const idx = r * tiles + c
        const seed = (renderParams.geoSeed | 0) + idx * 37
        const palette = paletteIds[idx % paletteIds.length]
        renderGeometric(tctx, tw, tw, { ...renderParams, palette, geoSeed: seed }, background)
        ctx.drawImage(tile, start + off + c * cell, start + off + r * cell)
      }
    }
    return blobFromCanvas(canvas)
  }

  const map = buildPolarMap(tileSize, tileSize)
  const src = buildSourceBuffer(source.image, adjustments)
  const imageData = new ImageData(tileSize, tileSize)
  if (geometric) {
    const tileCanvas = document.createElement('canvas')
    tileCanvas.width = tileSize
    tileCanvas.height = tileSize
    renderGeometric(tileCanvas.getContext('2d'), tileSize, tileSize, renderParams, background)
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    ctx.globalAlpha = Math.max(0, Math.min(1, (adjustments.opacity ?? 100) / 100))
    ctx.drawImage(tileCanvas, 0, 0, size, size)
    return blobFromCanvas(canvas)
  }
  renderKaleidoscope(map, src, renderParams, imageData.data, background)

  const tileCanvas = document.createElement('canvas')
  tileCanvas.width = tileSize
  tileCanvas.height = tileSize
  tileCanvas.getContext('2d').putImageData(imageData, 0, 0)

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.globalAlpha = Math.max(0, Math.min(1, (adjustments.opacity ?? 100) / 100))
  if (tiles === 1) {
    ctx.drawImage(tileCanvas, 0, 0, size, size)
  } else {
    composeTiled(ctx, tileCanvas, size, tiles, display.gap)
  }

  return blobFromCanvas(canvas)
}

function blobFromCanvas(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('PNG encoding failed'))
    }, 'image/png')
  })
}
