import { useEffect, useRef } from 'react'
import { useElementSize } from '../hooks/useElementSize.js'
import { useKaleidoscopeRenderer } from '../hooks/useKaleidoscopeRenderer.js'
import { DownloadIcon } from './Icon.jsx'

const MAX_PREVIEW = 1400
const MIN_PREVIEW = 260

const MODE_LABELS = { mirror: 'Multi-Mirror', mandala: 'Mandala', geometric: 'Geometric', flow: 'Dynamic Flow' }

/**
 * Right panel: the live output canvas. Owns sizing + the renderer hook and
 * exposes a Download button that triggers a high-res export.
 */
export default function PreviewPanel({ source, viewport, params, adjustments, background, display, exporting, onExport, foldKey = 0 }) {
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const stage = useElementSize(stageRef)

  const outWidth = Math.floor(Math.max(MIN_PREVIEW, Math.min(stage.width, MAX_PREVIEW)))
  const outHeight = Math.floor(Math.max(MIN_PREVIEW, Math.min(stage.height, MAX_PREVIEW)))
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
            {params.shape === 'square' ? ' · square' : ''}
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

      {/* Footer: export hint + download action */}
      <div className="flex items-center justify-between gap-3 px-1 pt-3">
        <div className="flex min-w-0 items-center gap-3 text-[11px] text-ink-faint">
          <span className="spec shrink-0">Exports a 2048×2048 PNG</span>
          <span className="spec hidden truncate sm:inline">Space = play/pause in Flow mode</span>
        </div>
        <button
          type="button"
          onClick={onExport}
          disabled={exporting || !source}
          className={`flex shrink-0 items-center gap-2 border px-3.5 py-2 text-[12.5px] font-semibold transition-colors ${
            exporting || !source
              ? 'cursor-not-allowed border-line bg-white text-ink-faint'
              : 'border-ink bg-ink text-paper hover:bg-accent hover:border-accent'
          }`}
        >
          {exporting ? (
            <>
              <span className="h-3 w-3 animate-spin border border-paper/40 border-t-paper" />
              Rendering…
            </>
          ) : (
            <>
              <DownloadIcon size={15} />
              Download Pattern
            </>
          )}
        </button>
      </div>
    </div>
  )
}
