import { useCallback, useEffect, useState } from 'react'
import logoSm from '../assets/kaleidoscope-logo-sm.png'
import { listPatterns, removePattern, clearPatterns, subscribe } from '../lib/patternLibrary.js'
import { TrashIcon, CloseIcon, DownloadIcon, ExternalIcon } from '../components/Icon.jsx'
import Button from '../components/Button.jsx'
import GridCard from '../components/GridCard.jsx'

const MODE_LABELS = { mirror: 'Multi-Mirror', mandala: 'Mandala', geometric: 'Geometric', flow: 'Dynamic Flow' }

function formatDate(ts) {
  try {
    return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })
  } catch {
    return ''
  }
}

function safeFileName(name) {
  return String(name || 'pattern').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()
}

function downloadPattern(p) {
  const a = document.createElement('a')
  const url = p.full || p.thumb
  const mime = (url || '').match(/^data:([^;,]+)/)?.[1]
  const ext = mime === 'image/png' ? 'png' : mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png'
  a.href = url
  a.download = `${safeFileName(p.name)}.${ext}`
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/**
 * Find the dominant non-white colour in an image. Used to tint each card's
 * hover overlay with its own palette so the shadow feels bespoke, not grey.
 * Returns "r,g,b" or null if the image can't be analysed.
 */
function getDominantColor(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const size = 32
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, size, size)
        const { data } = ctx.getImageData(0, 0, size, size)
        const counts = {}
        let dominant = null
        let max = 0
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const a = data[i + 3]
          // skip transparent + near-white pixels
          if (a < 60) continue
          if (r > 238 && g > 238 && b > 238) continue
          // quantise to 5-bit buckets so similar hues group together
          const key = `${r >> 3},${g >> 3},${b >> 3}`
          counts[key] = (counts[key] || 0) + 1
          if (counts[key] > max) {
            max = counts[key]
            dominant = `${r},${g},${b}`
          }
        }
        resolve(dominant)
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** Confirmation dialog for destructive actions (delete pattern, clear all). */
function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div
      className="lightbox-in fixed inset-0 z-[60] flex items-center justify-center bg-ink/70 p-4 backdrop-blur-[1px]"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="lightbox-card relative w-full max-w-sm border border-line-strong bg-paper"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <div className="border-b border-line px-4 py-3">
          <div id="confirm-title" className="font-display text-[14px] font-bold text-ink">
            {title}
          </div>
          <p className="spec mt-0.5 leading-relaxed">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3">
          <Button onClick={onCancel} variant="ghost" size="sm">
            Cancel
          </Button>
          <Button onClick={onConfirm} variant="primary" size="sm">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function PatternGallery() {
  const [patterns, setPatterns] = useState(listPatterns())
  const [active, setActive] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [downloadedId, setDownloadedId] = useState(null)
  const [removingId, setRemovingId] = useState(null)
  const [clearing, setClearing] = useState(false)
  const [tints, setTints] = useState({})

  useEffect(() => subscribe(setPatterns), [])

  // Resolve each card's dominant colour once, cache by id.
  useEffect(() => {
    let cancelled = false
    const pending = patterns.filter((p) => !(p.id in tints) && (p.thumb || p.full))
    if (!pending.length) return
    pending.forEach((p) => {
      getDominantColor(p.full || p.thumb).then((rgb) => {
        if (!cancelled && rgb) setTints((cur) => ({ ...cur, [p.id]: rgb }))
      })
    })
    return () => {
      cancelled = true
    }
  }, [patterns, tints])

  // Gallery "Download" check-flash: swap the button to a ✓ for a beat.
  const flashDownload = useCallback((id) => {
    setDownloadedId(id)
    setTimeout(() => setDownloadedId((cur) => (cur === id ? null : cur)), 1300)
  }, [])

  const confirmRemove = useCallback((p, e) => {
    e?.stopPropagation()
    setConfirm({ type: 'remove', pattern: p })
  }, [])

  const confirmClear = useCallback(() => {
    setConfirm({ type: 'clear' })
  }, [])

  const doRemove = useCallback(
    (id) => {
      removePattern(id)
      setPatterns(listPatterns())
      if (active?.id === id) setActive(null)
    },
    [active],
  )

  const handleConfirm = useCallback(() => {
    if (confirm?.type === 'remove') {
      // Animate the card out before removing it from the list.
      setRemovingId(confirm.pattern.id)
      setTimeout(() => {
        setRemovingId(null)
        doRemove(confirm.pattern.id)
      }, 170)
    } else if (confirm?.type === 'clear') {
      setClearing(true)
      setTimeout(() => {
        setClearing(false)
        clearPatterns()
        setPatterns([])
        setActive(null)
      }, 200)
    }
    setConfirm(null)
  }, [confirm, doRemove])

  // Close the lightbox with Escape (unless a confirm dialog is open).
  useEffect(() => {
    if (!active || confirm) return
    const onKey = (e) => e.key === 'Escape' && setActive(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, confirm])

  return (
    <div className="app-backdrop relative min-h-dvh">
      <div className="app-grid pointer-events-none absolute inset-0" />

      {/* Header */}
      <header className="relative mx-auto flex w-full max-w-[1600px] items-center gap-3 px-4 pt-5 pb-4 lg:px-6 lg:pt-6">
        <div className="flex items-center gap-3">
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden">
            <img src={logoSm} alt="Kaleida logo" className="h-full w-full object-contain" draggable={false} />
          </span>
          <div className="leading-tight">
            <div className="font-display text-[17px] font-bold tracking-tight text-ink">
              Kaleida<span className="text-accent">·</span> pattern library
            </div>
            <div className="spec mt-0.5">
              {patterns.length === 0
                ? 'No patterns yet — make one in Kaleida'
                : `${patterns.length} pattern${patterns.length === 1 ? '' : 's'} saved locally in this browser`}
            </div>
          </div>
        </div>
        <Button
          as="a"
          href={`${import.meta.env.BASE_URL}`}
          target="_blank"
          rel="noopener"
          variant="primary"
          size="sm"
          className="ml-auto hidden sm:flex"
        >
          Open Kaleida studio
          <ExternalIcon size={12} className="opacity-70" />
        </Button>
      </header>

      {/* Toolbar */}
      <div className="relative mx-auto w-full max-w-[1600px] px-4 pb-3 lg:px-6">
        <div className="flex items-center justify-between gap-3 border border-line bg-white/70 px-3 py-2">
          <div className="spec">Saved as 4×4 tiled patterns · print-ready squares</div>
          {patterns.length > 0 && (
            <button
              type="button"
              onClick={confirmClear}
              className="spec flex items-center gap-1 px-1 font-semibold text-ink-soft underline decoration-line underline-offset-4 hover:text-ink"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {patterns.length === 0 ? (
        <div className="relative mx-auto flex w-full max-w-[1600px] flex-col items-center px-4 pt-20 pb-28 text-center lg:px-6">
          <div className="flex h-16 w-16 items-center justify-center border border-line-strong bg-white text-ink-soft">
            <svg
              className="opacity-60"
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z" />
              <path d="M19 19v2H5a1 1 0 0 1-1-1" />
              <path d="M8 7h7M8 11h7" />
            </svg>
          </div>
          <h2 className="font-display mt-6 text-[19px] font-bold text-ink">Your pattern library is empty</h2>
          <p className="mt-2 max-w-[420px] text-[13.5px] leading-relaxed text-ink-soft">
            Open the Kaleida studio, shape a pattern you love, and press{' '}
            <span className="font-semibold text-ink">Add to library</span>. It will appear here instantly.
          </p>
          <Button
            as="a"
            href={`${import.meta.env.BASE_URL}`}
            target="_blank"
            rel="noopener"
            variant="primary"
            size="md"
            className="mt-6"
          >
            Open Kaleida studio
            <ExternalIcon size={13} className="opacity-70" />
          </Button>
        </div>
      ) : (
        /* Pattern grid */
        <main className="relative mx-auto w-full max-w-[1600px] px-4 pb-16 lg:px-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {patterns.map((p, idx) => (
              <GridCard
                key={p.id}
                as="figure"
                onClick={() => setActive(p)}
                className={`gallery-card cursor-pointer ${clearing || removingId === p.id ? 'card-out' : 'card-in'}`}
                style={{ animationDelay: `${Math.min(idx * 90, 700)}ms` }}
              >
                <div className="relative aspect-square overflow-hidden border-b border-line">
                  <img
                    src={p.thumb}
                    alt={p.name}
                    loading="lazy"
                    className="gallery-thumb h-full w-full object-cover"
                    draggable={false}
                  />
                  {/* Tint + actions fade/rise together on one GPU-friendly pass */}
                  <div className="absolute inset-0 opacity-0 transition-opacity duration-300 ease-[var(--ease-snappy)] group-hover:opacity-100 group-focus-within:opacity-100">
                    <div
                      className="absolute inset-0"
                      style={{
                        background: tints[p.id]
                          ? `linear-gradient(rgba(${tints[p.id]},0.2), rgba(${tints[p.id]},0.2)), radial-gradient(circle at 50% 50%, rgba(${tints[p.id]},0) 52%, rgba(${tints[p.id]},0.45) 100%)`
                          : undefined,
                      }}
                    />
                    <div className="absolute inset-0 flex translate-y-2 items-center justify-center gap-2 transition-transform duration-300 ease-[var(--ease-snappy)] group-hover:translate-y-0 group-focus-within:translate-y-0">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          downloadPattern(p)
                          flashDownload(p.id)
                        }}
                        variant={downloadedId === p.id ? 'accent' : 'outline'}
                        size="card"
                        aria-label={`Download ${p.name}`}
                      >
                        {downloadedId === p.id ? (
                          <CheckIcon size={14} className="check-pop" />
                        ) : (
                          <DownloadIcon size={14} />
                        )}
                        {downloadedId === p.id ? 'Saved' : 'Download'}
                      </Button>
                      <Button
                        onClick={(e) => confirmRemove(p, e)}
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${p.name}`}
                      >
                        <TrashIcon size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
                <figcaption className="flex items-center justify-between gap-2 px-2.5 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-semibold text-ink">{p.name}</div>
                    <div className="spec mt-0.5 truncate">{MODE_LABELS[p.mode] || p.mode} · {formatDate(p.createdAt)}</div>
                  </div>
                </figcaption>
              </GridCard>
            ))}
          </div>
        </main>
      )}

      {/* Lightbox */}
      {active && (
        <div
          className="lightbox-in fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-[1px] sm:p-8"
          onClick={() => setActive(null)}
        >
          <div
            className="lightbox-card relative flex max-h-full w-full max-w-3xl flex-col border border-line-strong bg-paper"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <div className="font-display text-[14px] font-bold text-ink">{active.name}</div>
                <div className="spec mt-0.5">
                  {MODE_LABELS[active.mode] || active.mode} · {formatDate(active.createdAt)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => confirmRemove(active)} variant="ghost" size="xs">
                  <TrashIcon size={13} />
                  Delete
                </Button>
                <Button onClick={() => setActive(null)} variant="ghost" size="icon-sm" aria-label="Close">
                  <CloseIcon size={15} />
                </Button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-white px-4 pb-4">
              <img
                src={active.full}
                alt={active.name}
                className="mx-auto w-full max-w-[640px] border border-line"
                draggable={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* Destructive-action confirmation */}
      {confirm?.type === 'remove' && (
        <ConfirmDialog
          title="Delete this pattern?"
          message={`“${confirm.pattern.name}” will be removed from your local library. This can't be undone.`}
          confirmLabel="Delete pattern"
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.type === 'clear' && (
        <ConfirmDialog
          title="Clear the whole library?"
          message={`All ${patterns.length} saved pattern${patterns.length === 1 ? '' : 's'} will be removed from this browser. This can't be undone.`}
          confirmLabel="Clear all"
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}