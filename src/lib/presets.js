/**
 * Built-in source images.
 *
 * Instead of relying on external placeholder URLs (which can be slow, flaky,
 * or CORS-blocked), these are generated procedurally into local data-URLs at
 * runtime. They load instantly, work offline, and are deliberately busy enough
 * to look great through a kaleidoscope.
 *
 * Styling notes: flat colours, clean vector outlines and contrasting inner
 * shapes on a paper ground — a 1960s/70s pop-art print look.
 */

const SIZE = 800

function createCanvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

/** Deterministic PRNG so the generative art is stable between renders. */
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ------------------------------------------------------------------ *
 * Seed Field: organic bean grid with contrasting cores.
 * Parameterised so variants share the same drawing logic.
 * ------------------------------------------------------------------ */
function drawSeedGrid(ctx, opts = {}) {
  const S = SIZE
  const {
    seed = 1967,
    bg = '#f4efe7',
    cells = 10,
    jitter = 0.5,
    rotMax = 0.35,
    shape = 'ellipse', // 'ellipse' | 'round' | 'diamond' | 'hex'
    core = 'filled',   // 'filled' | 'ring' | 'none'
    layout = 'grid',   // 'grid' | 'brick'
    coreScale = 0.5,
    palette = [
      ['#ef476f', '#ffd166'],
      ['#2f9e44', '#f4a261'],
      ['#118ab2', '#ffd166'],
      ['#7b5cd6', '#f72585'],
      ['#f4a261', '#2f9e44'],
    ],
    outline = '#1f2430',
    lw = 3,
  } = opts
  const rand = mulberry32(seed)

  ctx.fillStyle = bg
  ctx.fillRect(0, 0, S, S)

  const cell = S / cells
  const rowOff = layout === 'brick' ? cell / 2 : 0

  for (let gy = 0; gy < cells; gy++) {
    for (let gx = 0; gx < cells; gx++) {
      const [c1, c2] = palette[(gx * 3 + gy * 7) % palette.length]
      const inset = cell * 0.14 + rand() * cell * 0.08
      const rx = cell * 0.5 - inset * 0.5
      const ry = cell * 0.5 - inset
      const rot = (rand() - 0.5) * rotMax * 2
      const cx = gx * cell + cell / 2 + (rowOff && gy % 2 ? rowOff : 0)
      const cy = gy * cell + cell / 2
      const half = Math.min(rx, ry)

      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(rot)
      ctx.beginPath()
      if (shape === 'round') {
        ctx.arc(0, 0, half, 0, Math.PI * 2)
      } else if (shape === 'diamond') {
        ctx.rect(-rx, -ry, rx * 2, ry * 2)
      } else if (shape === 'hex') {
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i
          const px = Math.cos(a) * rx
          const py = Math.sin(a) * ry
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
      } else {
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
      }
      ctx.fillStyle = c1
      ctx.fill()
      ctx.strokeStyle = outline
      ctx.lineWidth = lw
      ctx.stroke()

      if (core !== 'none') {
        ctx.beginPath()
        if (core === 'ring') {
          ctx.arc(0, 0, half * coreScale, 0, Math.PI * 2)
          ctx.strokeStyle = c2
          ctx.lineWidth = Math.max(2, lw - 1)
          ctx.stroke()
        } else {
          if (shape === 'round') {
            ctx.arc(0, 0, half * coreScale, 0, Math.PI * 2)
          } else if (shape === 'diamond') {
            ctx.rect(-rx * coreScale, -ry * coreScale, rx * 2 * coreScale, ry * 2 * coreScale)
          } else if (shape === 'hex') {
            for (let i = 0; i < 6; i++) {
              const a = (Math.PI / 3) * i
              const px = Math.cos(a) * rx * coreScale
              const py = Math.sin(a) * ry * coreScale
              if (i === 0) ctx.moveTo(px, py)
              else ctx.lineTo(px, py)
            }
            ctx.closePath()
          } else {
            ctx.ellipse(0, 0, rx * coreScale, ry * coreScale, 0, 0, Math.PI * 2)
          }
          ctx.fillStyle = c2
          ctx.fill()
          ctx.strokeStyle = outline
          ctx.lineWidth = lw
          ctx.stroke()
        }
      }
      ctx.restore()
    }
  }
}

const SEED_ORIGINAL = [
  ['#ef476f', '#ffd166'],
  ['#2f9e44', '#f4a261'],
  ['#118ab2', '#ffd166'],
  ['#7b5cd6', '#f72585'],
  ['#f4a261', '#2f9e44'],
]

const SEED_DOTS = [
  ['#f72585', '#ffd166'],
  ['#4cc9f0', '#ffffff'],
  ['#06d6a0', '#ffd166'],
  ['#f4a261', '#ffffff'],
  ['#9d4edd', '#ffd166'],
]

const SEED_RINGS = [
  ['#118ab2', '#ffd166'],
  ['#2f9e44', '#f4a261'],
  ['#7b5cd6', '#06d6a0'],
  ['#ef476f', '#ffd166'],
]

const SEED_DIAMONDS = [
  ['#ef476f', '#ffd166'],
  ['#118ab2', '#f4a261'],
  ['#2f9e44', '#f72585'],
  ['#f4a261', '#06d6a0'],
]

const SEED_HEX = [
  ['#f72585', '#ffd166'],
  ['#4cc9f0', '#ffffff'],
  ['#06d6a0', '#ffd166'],
  ['#f4a261', '#ffffff'],
  ['#9d4edd', '#ffd166'],
]

const SEED_MARBLE = [
  ['#118ab2', '#ffd166'],
  ['#ef476f', '#f4a261'],
  ['#2f9e44', '#ffd166'],
  ['#7b5cd6', '#f4a261'],
]

const SEED_PAPER = [
  ['#ef476f', '#ffffff'],
  ['#ffd166', '#ffffff'],
  ['#06d6a0', '#ffffff'],
  ['#118ab2', '#ffffff'],
  ['#7b5cd6', '#ffffff'],
]

function drawSeedField(ctx) {
  drawSeedGrid(ctx, { seed: 1967, cells: 10, jitter: 0.5, palette: SEED_ORIGINAL })
}

/** Seed Dots — tight round dots with pale cores on a dark ground. */
function drawSeedDots(ctx) {
  drawSeedGrid(ctx, {
    seed: 2024,
    bg: '#0e1220',
    cells: 14,
    rotMax: 0.5,
    shape: 'round',
    coreScale: 0.42,
    palette: SEED_DOTS,
    outline: '#0e1220',
    lw: 2,
  })
}

/** Seed Rings — brick-laid beans with hollow ring cores. */
function drawSeedRings(ctx) {
  drawSeedGrid(ctx, {
    seed: 77,
    bg: '#fbf8f2',
    cells: 8,
    rotMax: 0.6,
    shape: 'ellipse',
    core: 'ring',
    coreScale: 0.45,
    layout: 'brick',
    palette: SEED_RINGS,
  })
}

/** Seed Diamonds — offset diamonds with contrasting inner facets. */
function drawSeedDiamonds(ctx) {
  drawSeedGrid(ctx, {
    seed: 511,
    bg: '#f4efe7',
    cells: 9,
    rotMax: 0.7,
    shape: 'diamond',
    coreScale: 0.55,
    layout: 'brick',
    palette: SEED_DIAMONDS,
    lw: 4,
  })
}

/** Seed Cross — dense beans with offset plus-mark cores. */
function drawSeedCross(ctx) {
  drawSeedGrid(ctx, {
    seed: 1967,
    bg: '#f4efe7',
    cells: 12,
    rotMax: 0.3,
    shape: 'ellipse',
    core: 'ring',
    coreScale: 0.5,
    palette: SEED_ORIGINAL,
  })
}

/** Seed Hex — brick-laid hexagons with bright inner hexes. */
function drawSeedHex(ctx) {
  drawSeedGrid(ctx, {
    seed: 4242,
    bg: '#f4efe7',
    cells: 9,
    rotMax: 0.4,
    shape: 'hex',
    coreScale: 0.5,
    layout: 'brick',
    palette: SEED_HEX,
    lw: 4,
  })
}

/** Seed Marble — sparse round marbles on a dark ground, no cores. */
function drawSeedMarble(ctx) {
  drawSeedGrid(ctx, {
    seed: 9090,
    bg: '#0e1220',
    cells: 10,
    rotMax: 0.8,
    shape: 'round',
    core: 'none',
    palette: SEED_MARBLE,
    outline: '#0e1220',
    lw: 2,
  })
}

/** Seed Paper — a calm paper-and-ink dotted grid with bright cores. */
function drawSeedPaper(ctx) {
  drawSeedGrid(ctx, {
    seed: 31337,
    bg: '#fbf8f2',
    cells: 11,
    rotMax: 0.2,
    shape: 'ellipse',
    coreScale: 0.4,
    palette: SEED_PAPER,
  })
}

/* ------------------------------------------------------------------ */

export const PRESETS = [
  {
    id: 'seeds',
    name: 'Seed Field',
    tag: 'Organic grid',
    draw: drawSeedField,
  },
  {
    id: 'seed-dots',
    name: 'Seed Dots',
    tag: 'Round dots',
    draw: drawSeedDots,
  },
  {
    id: 'seed-rings',
    name: 'Seed Rings',
    tag: 'Hollow cores',
    draw: drawSeedRings,
  },
  {
    id: 'seed-diamonds',
    name: 'Seed Diamonds',
    tag: 'Offset facets',
    draw: drawSeedDiamonds,
  },
  {
    id: 'seed-cross',
    name: 'Seed Cross',
    tag: 'Dense rings',
    draw: drawSeedCross,
  },
  {
    id: 'seed-hex',
    name: 'Seed Hex',
    tag: 'Brick hexagons',
    draw: drawSeedHex,
  },
  {
    id: 'seed-marble',
    name: 'Seed Marble',
    tag: 'Dark marbles',
    draw: drawSeedMarble,
  },
  {
    id: 'seed-paper',
    name: 'Seed Paper',
    tag: 'Paper dots',
    draw: drawSeedPaper,
  },
]

export const DEFAULT_PRESET_ID = 'seeds'

export function buildPresetUrl(preset) {
  const canvas = createCanvas(SIZE, SIZE)
  preset.draw(canvas.getContext('2d'))
  return canvas.toDataURL('image/png')
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = url
  })
}
