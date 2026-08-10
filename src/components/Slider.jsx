import { useId } from 'react'

/**
 * A labelled range slider with a live readout. Flat single-accent fill, ink
 * square thumb; the track fill is driven by the --fill custom property.
 */
export default function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format = (v) => v,
  unit = '',
  disabled = false,
}) {
  const id = useId()
  const fill = ((value - min) / (max - min)) * 100

  return (
    <div className={disabled ? 'opacity-40' : ''}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-medium text-ink">
          {label}
        </label>
        <span className="spec tabular-nums font-medium text-accent">{format(value)}{unit}</span>
      </div>
      <input
        id={id}
        type="range"
        className="kaleid-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ['--fill' ]: `${fill}%` }}
      />
    </div>
  )
}
