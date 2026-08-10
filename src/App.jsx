import { useEffect, useMemo, useState, useCallback } from 'react'
import SourcePanel from './components/SourcePanel.jsx'
import Viewfinder from './components/Viewfinder.jsx'
import ControlPanel from './components/ControlPanel.jsx'
import PreviewPanel from './components/PreviewPanel.jsx'
import logoSm from './assets/kaleidoscope-logo-sm.png'
import { PRESETS, DEFAULT_PRESET_ID, buildPresetUrl, loadImage } from './lib/presets.js'
import { exportKaleidoscope, GEOMETRIC_PALETTES } from './lib/kaleidoscope.js'
import { downloadBlob, stampFilename } from './lib/utils.js'
import { defaultViewport } from './hooks/useKaleidoscopeRenderer.js'

const DEFAULT_PARAMS = {
  mode: 'mirror',
  shape: 'square',
  segments: 8,
  mandalaOrder: 6,
  patternOffset: 18,
  sourceAngle: 0,
  rotationSpeed: 0.5,
  zoom: 1,
  wave: 0.4,
  palette: 'aqua',
  geoDetail: 3,
  geoSeed: 0,
  playing: true,
}

const DEFAULT_ADJUSTMENTS = {
  brightness: 0,
  contrast: 0,
  hue: 0,
  saturate: 100,
  blur: 0,
  scale: 1,
}

export default function App() {
  // Built once — procedural preset thumbnails + their data-URLs.
  const presetMeta = useMemo(() => PRESETS.map((p) => ({ ...p, url: buildPresetUrl(p) })), [])

  const [source, setSource] = useState(null)
  const [activePresetId, setActivePresetId] = useState('')
  const [presetImages, setPresetImages] = useState({})
  const [viewport, setViewport] = useState(null)
  const [mode, setMode] = useState(DEFAULT_PARAMS.mode)
  const [params, setParams] = useState(DEFAULT_PARAMS)
  const [adjustments, setAdjustments] = useState(DEFAULT_ADJUSTMENTS)
  const [background, setBackground] = useState('transparent')
  const [display, setDisplay] = useState({ layout: 'tiled', tiles: 4, gap: 0 })
  const [exporting, setExporting] = useState(false)
  const [foldKey, setFoldKey] = useState(0)

  // Preload preset images and load the default source on first mount.
  useEffect(() => {
    let mounted = true
    Promise.all(
      presetMeta.map(async (p) => {
        const img = await loadImage(p.url)
        return { id: p.id, img }
      }),
    )
      .then((imgs) => {
        if (!mounted) return
        const map = Object.fromEntries(imgs.map((i) => [i.id, i.img]))
        setPresetImages(map)
        const def = presetMeta.find((p) => p.id === DEFAULT_PRESET_ID)
        const img = map[def.id]
        if (img) {
          setActivePresetId(def.id)
          setSource({
            image: img,
            url: def.url,
            name: def.name,
            width: img.naturalWidth,
            height: img.naturalHeight,
            bytes: 0,
          })
        }
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reset the viewfinder whenever a new source arrives.
  useEffect(() => {
    if (source) setViewport(defaultViewport(source.width, source.height))
  }, [source])

  // Space bar toggles Flow playback (unless a control has focus).
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space' || e.repeat) return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return
      e.preventDefault()
      setParams((p) => (p.mode === 'flow' ? { ...p, playing: !p.playing } : p))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const selectPreset = useCallback(
    (p) => {
      const img = presetImages[p.id]
      if (!img) return
      setActivePresetId(p.id)
      setSource({
        image: img,
        url: p.url,
        name: p.name,
        width: img.naturalWidth,
        height: img.naturalHeight,
        bytes: 0,
      })
    },
    [presetImages],
  )

  const uploadImage = useCallback(async (file) => {
    const url = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
    const img = await loadImage(url)
    setActivePresetId('')
    setSource({
      image: img,
      url,
      name: file.name,
      width: img.naturalWidth,
      height: img.naturalHeight,
      bytes: file.size,
    })
  }, [])

  const handleExport = useCallback(async () => {
    if (!source || exporting) return
    setExporting(true)
    try {
      const blob = await exportKaleidoscope({
        source,
        viewport,
        adjustments,
        params: { ...params, mode, scale: adjustments.scale },
        background,
        display,
        size: 2048,
      })
      const label = display.layout === 'tiled' ? `tiled-${display.tiles}x${display.tiles}` : mode
      downloadBlob(blob, stampFilename(label))
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(false)
    }
  }, [source, viewport, adjustments, params, mode, background, display, exporting])

  const onMode = useCallback(
    (m) => {
      setMode(m)
      setFoldKey((k) => k + 1)
    },
    [],
  )
  const onParam = useCallback((key, value) => setParams((p) => ({ ...p, [key]: value })), [])
  const onAdjust = useCallback((key, value) => setAdjustments((a) => ({ ...a, [key]: value })), [])
  const onTogglePlay = useCallback(() => setParams((p) => ({ ...p, playing: !p.playing })), [])

  // "Surprise me" — randomise the whole composition with one press.
  const onShuffle = useCallback(() => {
    const pick = (min, max) => min + Math.random() * (max - min)
    const pickInt = (min, max) => Math.round(pick(min, max))
    const MODES = ['mirror', 'mandala', 'geometric', 'flow']
    const nextMode = MODES[pickInt(0, MODES.length - 1)]
    const next = {
      segments: pickInt(4, 24),
      mandalaOrder: pickInt(4, 12),
      patternOffset: pickInt(0, 180),
      sourceAngle: pickInt(0, 360),
      rotationSpeed: Math.round(pick(0.1, 1.6) * 100) / 100,
      zoom: Math.round(pick(0.7, 1.5) * 100) / 100,
      wave: Math.round(pick(0.1, 0.8) * 100) / 100,
      palette: Object.keys(GEOMETRIC_PALETTES)[pickInt(0, Object.keys(GEOMETRIC_PALETTES).length - 1)],
      geoDetail: pickInt(1, 5),
      geoSeed: pickInt(0, 100),
      playing: true,
    }
    setMode(nextMode)
    setParams((p) => ({ ...p, ...next }))
    setFoldKey((k) => k + 1)
  }, [])

  return (
    <div className="app-backdrop relative flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden">
      <div className="app-grid pointer-events-none absolute inset-0" />

      {/* Top bar */}
      <header className="relative z-20 mx-auto flex w-full max-w-[1600px] items-center gap-3 px-4 pt-4 pb-2 lg:px-6 lg:pt-5">
        <div className="flex items-center gap-3">
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden">
            <img
              src={logoSm}
              alt="Kaleida logo"
              className="h-full w-full object-contain"
              draggable={false}
            />
          </span>
          <div className="leading-tight">
            <div className="font-display text-[17px] font-bold tracking-tight text-ink">
              Kaleida
            </div>
            <div className="spec mt-0.5">See the world through a kaleidoscope.</div>
          </div>
        </div>
        <div className="spec ml-auto hidden sm:block">2048 px exports · canvas renderer</div>
      </header>

      {/* Main workspace */}
      <main className="relative z-10 mx-auto w-full max-w-[1600px] flex-1 min-h-0 px-4 pb-4 lg:px-6 lg:pb-6">
        <div className="grid grid-cols-1 gap-5 lg:h-full lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
          {/* Left: source + viewfinder + controls */}
          <section className="order-2 min-h-0 border border-line bg-white/70 p-5 lg:order-1 lg:h-full lg:overflow-y-auto">
            <div className="space-y-6">
              <SourcePanel
                source={source}
                presets={presetMeta}
                activePresetId={activePresetId}
                onSelectPreset={selectPreset}
                onUpload={uploadImage}
              />
              <div className="h-px bg-line" />
              {source && viewport ? (
                <Viewfinder
                  source={source}
                  viewport={viewport}
                  onChange={setViewport}
                  onReset={() => setViewport(defaultViewport(source.width, source.height))}
                />
              ) : (
                <div className="py-6 text-center text-[12px] text-ink-soft">Loading source…</div>
              )}
              <div className="h-px bg-line" />
              <ControlPanel
                mode={mode}
                params={params}
                adjustments={adjustments}
                background={background}
                display={display}
                onMode={onMode}
                onParam={onParam}
                onAdjust={onAdjust}
                onBackground={setBackground}
                onDisplay={setDisplay}
                onTogglePlay={onTogglePlay}
                onShuffle={onShuffle}
              />
            </div>
          </section>

          {/* Right: live output */}
          <section className="order-1 min-h-[60dvh] lg:order-2 lg:min-h-0 lg:h-full">
            <PreviewPanel
              source={source}
              viewport={viewport}
              params={{ ...params, mode, scale: adjustments.scale }}
              adjustments={adjustments}
              background={background}
              display={display}
              exporting={exporting}
              onExport={handleExport}
              foldKey={foldKey}
            />
          </section>
        </div>
      </main>
    </div>
  )
}
