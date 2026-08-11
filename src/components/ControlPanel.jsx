import { useState } from 'react'
import SegmentedControl from './SegmentedControl.jsx'
import Slider from './Slider.jsx'
import { MirrorIcon, MandalaIcon, FlowIcon, GeometricIcon, PlayIcon, PauseIcon, SparkleIcon, TiledIcon, ShuffleIcon, ChevronIcon } from './Icon.jsx'
import { GEOMETRIC_PALETTES } from '../lib/kaleidoscope.js'

const MODE_OPTIONS = [
  { value: 'mirror', label: 'Mirror', icon: <MirrorIcon size={16} /> },
  { value: 'mandala', label: 'Mandala', icon: <MandalaIcon size={16} /> },
  { value: 'geometric', label: 'Geometric', icon: <GeometricIcon size={16} /> },
  { value: 'flow', label: 'Flow', icon: <FlowIcon size={16} /> },
]

const MODE_BLURBS = {
  mirror: 'Slice the source into mirrored wedges that repeat around a circle.',
  mandala: 'Build layered radial petals for a geometric, symmetrical bloom.',
  geometric: 'Procedural translucent mandalas — overlapping squares, loops and stars in 4-fold symmetry.',
  flow: 'Set the pattern in motion with rotation, zoom and wave distortion.',
}

const BACKGROUND_OPTIONS = [
  { value: 'transparent', label: 'None' },
  { value: 'ink', label: 'Ink' },
  { value: 'paper', label: 'Paper' },
]

const DISPLAY_OPTIONS = [
  { value: 'single', label: 'Single', icon: <SparkleIcon size={16} /> },
  { value: 'tiled', label: 'Tiled', icon: <TiledIcon size={16} /> },
]

const SHAPE_OPTIONS = [
  { value: 'square', label: 'Square' },
  { value: 'circle', label: 'Circle' },
]

const SHAPE_BLURBS = {
  square: 'Fill the whole square canvas with the mirrored pattern.',
  circle: 'Show the classic circular kaleidoscope on the background.',
}

function Section({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="group flex w-full items-center gap-2 py-1 text-left"
      >
        <span className={`spec font-semibold transition-colors duration-150 ease-[var(--ease-snappy)] ${open ? 'text-ink' : 'text-ink-soft group-hover:text-ink'}`}>{title}</span>
        <span className="h-px flex-1 bg-line transition-colors duration-150 ease-[var(--ease-snappy)] group-hover:bg-line-strong" />
        <ChevronIcon
          size={13}
          className={`text-ink-soft transition-all duration-150 ease-[var(--ease-snappy)] group-hover:-translate-y-px ${open ? 'rotate-180 text-ink' : 'group-hover:text-ink'}`}
        />
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="pt-3">{children}</div>
        </div>
      </div>
    </div>
  )
}

function AnimateRow({ params, onTogglePlay }) {
  return (
    <div className="flex items-center justify-between gap-3 border border-line bg-paper px-3 py-2.5">
      <div>
        <div className="text-[13px] font-medium text-ink">Animate</div>
        <div className="spec mt-0.5">Space toggles playback</div>
      </div>
      <button
        type="button"
        onClick={onTogglePlay}
        className={`pressable flex h-10 w-10 items-center justify-center border ${
          params.playing ? 'border-ink bg-ink text-paper' : 'border-line-strong bg-paper text-ink-soft hover:border-ink hover:text-ink'
        }`}
        aria-label={params.playing ? 'Pause animation' : 'Play animation'}
      >
        {params.playing ? <PauseIcon size={17} /> : <PlayIcon size={17} />}
      </button>
    </div>
  )
}

/**
 * Left control sidebar. Grouped by outcome — Algorithm, Geometry,
 * Fine-tune, Output — so a mode switch never reshuffles the whole page.
 */
export default function ControlPanel({ mode, params, adjustments, background, display, onMode, onParam, onAdjust, onBackground, onDisplay, onTogglePlay, onShuffle }) {
  const flow = mode === 'flow'
  const [shuffleSpin, setShuffleSpin] = useState(0)

  return (
    <div className="space-y-6">
      <Section title="Algorithm">
        <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={onMode} />
        <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">{MODE_BLURBS[mode]}</p>
        <button
          type="button"
          onClick={() => {
            setShuffleSpin((s) => s + 1)
            onShuffle()
          }}
          className="pressable mt-3 flex w-full items-center justify-center gap-2 border border-ink bg-paper px-3 py-2.5 text-[12.5px] font-semibold text-ink hover:bg-ink hover:text-paper"
        >
          <ShuffleIcon key={shuffleSpin} size={15} className="shuffle-spin" />
          Surprise me
        </button>
      </Section>

      {mode === 'mirror' && (
        <Section title="Geometry">
          <div className="space-y-4">
            <Slider
              label="Segments"
              min={3}
              max={32}
              step={1}
              value={params.segments}
              onChange={(v) => onParam('segments', v)}
              format={(x) => `${x} slices`}
            />
            <Slider
              label="Source rotation"
              min={0}
              max={360}
              step={1}
              value={params.sourceAngle}
              onChange={(v) => onParam('sourceAngle', v)}
              format={(x) => `${x}°`}
            />
          </div>
        </Section>
      )}

      {mode === 'mandala' && (
        <Section title="Geometry">
          <div className="space-y-4">
            <Slider
              label="Symmetry order"
              min={3}
              max={16}
              step={1}
              value={params.mandalaOrder}
              onChange={(v) => onParam('mandalaOrder', v)}
              format={(x) => `${x} petals`}
            />
            <Slider
              label="Pattern offset"
              min={0}
              max={180}
              step={1}
              value={params.patternOffset}
              onChange={(v) => onParam('patternOffset', v)}
              format={(x) => `${x}°`}
            />
            <Slider
              label="Source rotation"
              min={0}
              max={360}
              step={1}
              value={params.sourceAngle}
              onChange={(v) => onParam('sourceAngle', v)}
              format={(x) => `${x}°`}
            />
          </div>
        </Section>
      )}

      {mode === 'geometric' && (
        <Section title="Geometry">
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 text-[13px] font-medium text-ink">Palette</div>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(GEOMETRIC_PALETTES).map(([id, pal]) => {
                  const active = params.palette === id
                  return (
                    <button
                      key={id}
                      type="button"
                      title={pal.label}
                      onClick={() => onParam('palette', id)}
                      className={`pressable flex flex-col items-center gap-1.5 border p-2 ${
                        active ? 'border-ink bg-paper' : 'border-line bg-white hover:border-ink'
                      }`}
                    >
                      <span className="flex h-8 w-8 items-center justify-center overflow-hidden border border-line-strong">
                        {pal.colors.map((c, i) => (
                          <span
                            key={c}
                            className="h-full flex-1"
                            style={{ background: c, transform: `translateY(${i * 2}px)` }}
                          />
                        ))}
                      </span>
                      <span className={`text-[10.5px] leading-tight ${active ? 'font-semibold text-ink' : 'text-ink-soft'}`}>
                        {pal.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
            <Slider
              label="Detail"
              min={1}
              max={5}
              step={1}
              value={params.geoDetail}
              onChange={(v) => onParam('geoDetail', v)}
              format={(x) => `${x}`}
            />
            <Slider
              label="Variation"
              min={0}
              max={100}
              step={1}
              value={params.geoSeed}
              onChange={(v) => onParam('geoSeed', v)}
              format={(x) => `${x}`}
            />
            <AnimateRow params={params} onTogglePlay={onTogglePlay} />
            <Slider
              label="Rotation speed"
              min={0}
              max={2}
              step={0.05}
              value={params.rotationSpeed}
              onChange={(v) => onParam('rotationSpeed', v)}
              format={(x) => `${x.toFixed(2)}×`}
            />
          </div>
        </Section>
      )}

      {flow && (
        <Section title="Geometry">
          <div className="space-y-4">
            <AnimateRow params={params} onTogglePlay={onTogglePlay} />
            <Slider
              label="Rotation speed"
              min={0}
              max={3}
              step={0.05}
              value={params.rotationSpeed}
              onChange={(v) => onParam('rotationSpeed', v)}
              format={(x) => `${x.toFixed(2)}×`}
            />
            <Slider
              label="Zoom factor"
              min={0.5}
              max={1.8}
              step={0.01}
              value={params.zoom}
              onChange={(v) => onParam('zoom', v)}
              format={(x) => `${x.toFixed(2)}×`}
            />
            <Slider
              label="Wave intensity"
              min={0}
              max={1}
              step={0.01}
              value={params.wave}
              onChange={(v) => onParam('wave', v)}
              format={(x) => `${Math.round(x * 100)}%`}
            />
            <Slider
              label="Segments"
              min={3}
              max={32}
              step={1}
              value={params.segments}
              onChange={(v) => onParam('segments', v)}
              format={(x) => `${x} slices`}
            />
          </div>
        </Section>
      )}

      <Section title="Fine-tune" defaultOpen={false}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <Slider
              label="Brightness"
              min={-100}
              max={100}
              step={1}
              value={adjustments.brightness}
              onChange={(v) => onAdjust('brightness', v)}
              format={(x) => `${x > 0 ? '+' : ''}${x}`}
            />
            <Slider
              label="Contrast"
              min={-100}
              max={100}
              step={1}
              value={adjustments.contrast}
              onChange={(v) => onAdjust('contrast', v)}
              format={(x) => `${x > 0 ? '+' : ''}${x}`}
            />
            <Slider
              label="Hue rotation"
              min={0}
              max={360}
              step={1}
              value={adjustments.hue}
              onChange={(v) => onAdjust('hue', v)}
              format={(x) => `${x}°`}
            />
            <Slider
              label="Saturation"
              min={0}
              max={200}
              step={1}
              value={adjustments.saturate}
              onChange={(v) => onAdjust('saturate', v)}
              format={(x) => `${x}%`}
            />
          </div>
          <div className="space-y-4">
            <Slider
              label="Blur"
              min={0}
              max={10}
              step={0.1}
              value={adjustments.blur}
              onChange={(v) => onAdjust('blur', v)}
              format={(x) => `${x.toFixed(1)}px`}
            />
            <Slider
              label="Opacity"
              min={0}
              max={100}
              step={1}
              value={adjustments.opacity ?? 100}
              onChange={(v) => onAdjust('opacity', v)}
              format={(x) => `${x}%`}
            />
            <Slider
              label="Pattern scale"
              min={0.5}
              max={1.8}
              step={0.01}
              value={adjustments.scale}
              onChange={(v) => onAdjust('scale', v)}
              format={(x) => `${x.toFixed(2)}×`}
            />
          </div>
        </div>
      </Section>

      <Section title="Output">
        <div className="space-y-3">
          <SegmentedControl
            options={SHAPE_OPTIONS}
            value={params.shape}
            onChange={(v) => onParam('shape', v)}
          />
          <p className="text-[11.5px] leading-relaxed text-ink-soft">{SHAPE_BLURBS[params.shape]}</p>
          <SegmentedControl options={BACKGROUND_OPTIONS} value={background} onChange={onBackground} />
          <SegmentedControl
            options={DISPLAY_OPTIONS}
            value={display.layout}
            onChange={(v) => onDisplay({ ...display, layout: v })}
          />
          {display.layout === 'tiled' && (
            <div className="space-y-4">
              <Slider
                label="Tile grid"
                min={2}
                max={6}
                step={1}
                value={display.tiles}
                onChange={(v) => onDisplay({ ...display, tiles: v })}
                format={(x) => `${x}×${x}`}
              />
              <Slider
                label="Tile gap"
                min={0}
                max={12}
                step={0.5}
                value={display.gap}
                onChange={(v) => onDisplay({ ...display, gap: v })}
                format={(x) => `${x.toFixed(1)}%`}
              />
            </div>
          )}
        </div>
      </Section>
    </div>
  )
}
