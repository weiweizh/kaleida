import { useEffect, useRef, useState } from 'react'
import { useElementSize } from '../hooks/useElementSize.js'
import { useKaleidoscopeRenderer } from '../hooks/useKaleidoscopeRenderer.js'
import { DownloadIcon, PlusIcon, LibraryIcon, CheckIcon, ExternalIcon } from './Icon.jsx'
import Button from './Button.jsx'

const MAX_PREVIEW = 1400
const MIN_PREVIEW = 260

const MODE_LABELS = { mirror: 'Multi-Mirror', mandala: 'Mandala', geometric: 'Geometric', flow: 'Dynamic Flow' }

/**
 * Right panel: the live output canvas. Owns sizing + the renderer hook and
 * exposes a Download button that triggers a high-res export.
 */
export default function PreviewPanel({
  source,
  viewport,
  params,
  adjustments,
  background,
  display,
  exporting,
  onExport,
  patternCount = 0,
  addingToLibrary = false,
  justAdded = false,
  libraryFull = false,
  addError = '',
  onAddToLibrary,
  foldKey = 0,
}) {
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const stage = useElementSize(stageRef)

  // Check-flash after a download completes: when `exporting` flips back to
  // false, briefly swap the Download button to a ✓ confirmation.
  const [downloaded, setDownloaded] = useState(false)
  const wasExportingRef = useRef(false)
  useEffect(() => {
    if (wasExportingRef.current && !exporting) {
      setDownloaded(true)
      const t = setTimeout(() => setDownloaded(false), 1400)
      return () => clearTimeout(t)
    }
    wasExportingRef.current = exporting
  }, [exporting])

  const rawW = Math.floor(Math.max(MIN_PREVIEW, Math.min(stage.width, MAX_PREVIEW)))
  const rawH = Math.floor(Math.max(MIN_PREVIEW, Math.min(stage.height, MAX_PREVIEW)))
  const single = display?.layout !== 'tiled'
  let outWidth = single ? Math.min(rawW, rawH) : rawW
  let outHeight = single ? Math.min(rawW, rawH) : rawH

  // In tiled mode, size the canvas to the square-cell grid's exact aspect
  // ratio so the grid fills the output edge-to-edge with no leftover gutters.
  if (!single && outWidth > 0 && outHeight > 0) {
    const tiles = Math.min(8, Math.max(1, display.tiles | 0))
    const cols = outWidth >= outHeight ? Math.max(1, Math.round((tiles * outWidth) / outHeight)) : tiles
    const rows = outWidth >= outHeight ? tiles : Math.max(1, Math.round((tiles * outHeight) / outWidth))
    outHeight = Math.round((outWidth * rows) / cols)
  }
  const mapSize = { width: outWidth, height: outHeight }

  const { fps, animating } = useKaleidoscopeRenderer({
    source,
    viewport,
    params,
    adjustments,
    background,
    display,
    size: mapSize,
    canvasRef,
  })

  // Back the visible canvas at device-pixel ratio for crisp edges.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || outWidth <= 0 || outHeight <= 0) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.round(outWidth * dpr)
    canvas.height = Math.round(outHeight * dpr)
  }, [outWidth, outHeight, foldKey])

  const modeLabel = MODE_LABELS[params.mode] || ''

  const tileCount = display?.layout === 'tiled' ? Math.min(8, Math.max(1, display.tiles | 0)) : 1
  let tiledLabel = ''
  if (display?.layout === 'tiled' && outWidth > 0 && outHeight > 0) {
    const cols = outWidth >= outHeight ? Math.max(1, Math.round((tileCount * outWidth) / outHeight)) : tileCount
    const rows = outWidth >= outHeight ? tileCount : Math.max(1, Math.round((tileCount * outHeight) / outWidth))
    tiledLabel = ` · ${cols}×${rows} tiled`
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-3">
        <div>
          <h2 className="font-display text-[15px] font-bold text-ink">{modeLabel} output</h2>
          <p className="spec mt-0.5">
            {outWidth}×{outHeight}px
            {params.shape === 'circle' ? ' · circle' : params.shape === 'square' ? ' · square' : ''}
            {tiledLabel}
          </p>
        </div>
        {animating && (
          <div className="flex items-center gap-1.5 border border-line px-2.5 py-1">
            <span className="live-dot breathe" />
            <span className="spec font-semibold text-ink">{fps} fps</span>
          </div>
        )}
      </div>

      {/* Stage */}
      <div ref={stageRef} className="relative flex min-h-0 flex-1 items-center justify-center">
        <div
          className="relative flex items-center justify-center border border-line bg-paper"
          style={{ width: outWidth, height: outHeight }}
        >
          <div
            key={foldKey}
            className="re-fold absolute inset-0 flex items-center justify-center"
          >
            <div
              className="absolute inset-0 border border-line-strong bg-white"
              style={{
                background:
                  background === 'paper'
                    ? 'linear-gradient(135deg,#f7f3eb,#e7dfcc)'
                    : background === 'ink'
                      ? '#11121a'
                      : '#ffffff',
              }}
            />
            {source ? (
              <canvas
                ref={canvasRef}
                className="relative h-full w-full"
                style={{
                  width: outWidth,
                  height: outHeight,
                  background: 'transparent',
                }}
              />
            ) : (
              <div className="relative z-10 flex flex-col items-center gap-3 px-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center border border-line-strong bg-paper text-ink-soft">
                  <DownloadIcon size={24} className="opacity-50" />
                </div>
                <p className="max-w-[260px] text-[13px] leading-relaxed text-ink-soft">
                  Choose a built-in source or upload your own image to start generating patterns.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer: export hint + library actions */}
      <div className="flex items-center justify-between gap-3 px-1 pt-3">
        <div className="flex min-w-0 flex-1 items-center gap-3 text-[11px] text-ink-faint">
          <span className="spec shrink-0">Exports a 2048×2048 PNG</span>
          <span className="spec hidden truncate sm:inline">Space = play/pause in Flow mode</span>
        </div>
        <div className="flex flex-col items-end gap-1">
          {addError && <div className="spec text-reg-magenta">{addError}</div>}
          <div className="flex shrink-0 flex-nowrap items-center gap-2">
          <Button
            onClick={onAddToLibrary}
            disabled={addingToLibrary || !source}
            variant={justAdded ? (libraryFull ? 'ghost' : 'accent') : 'secondary'}
            className="group"
          >
            {addingToLibrary ? (
              <>
                <span className="h-3 w-3 animate-spin border border-ink/25 border-t-ink" />
                Saving…
              </>
            ) : justAdded ? (
              <>
                <CheckIcon size={15} className="check-pop" />
                {libraryFull ? 'Library full — delete one' : 'Added to library'}
              </>
            ) : (
              <>
                <PlusIcon size={15} className="transition-transform duration-150 ease-[var(--ease-snappy)] group-hover:-translate-y-px" />
                Add to library
              </>
            )}
          </Button>
          <Button
            as="a"
            href={`${import.meta.env.BASE_URL}gallery.html`}
            target="_blank"
            rel="noopener"
            disabled={patternCount === 0}
            onClick={(e) => patternCount === 0 && e.preventDefault()}
            className="group"
          >
            <LibraryIcon size={15} className="transition-transform duration-150 ease-[var(--ease-snappy)] group-hover:-translate-y-px" />
            Pattern library
            <ExternalIcon size={12} className="opacity-70" />
            <span
              className={`border border-line bg-paper px-1.5 py-px text-[10.5px] font-bold tabular-nums text-ink ${justAdded ? 'count-pulse' : ''}`}
            >
              {patternCount}
            </span>
          </Button>
          <Button onClick={onExport} disabled={exporting || !source} variant={downloaded ? 'accent' : 'primary'} className="group">
            {exporting ? (
              <>
                <span className="h-3 w-3 animate-spin border border-paper/40 border-t-paper" />
                Rendering…
              </>
            ) : downloaded ? (
              <>
                <CheckIcon size={15} className="check-pop" />
                Downloaded
              </>
            ) : (
              <>
                <DownloadIcon size={15} className="transition-transform duration-150 ease-[var(--ease-snappy)] group-hover:translate-y-[1.5px]" />
                Download Pattern
              </>
            )}
          </Button>
        </div>
        </div>
      </div>
    </div>
  )
}
