import { forwardRef } from 'react'
import { CheckIcon } from './Icon.jsx'

/**
 * Minimal, clean grid card — the single visual language for every selectable
 * tile in the app (gallery patterns, source presets, palettes).
 *
 * Base: white chip with a hairline border. Hover: the border drifts to ink
 * (colour only — no lift, no scale, no zoom). Active: ink border + a single
 * ink check tick in the corner. Everything rides transform/opacity-free
 * transitions so a grid sweep never zigzags.
 *
 * Polymorphic — pass `as` to render `button`, `figure`, `a`, etc.
 * `media`/`children` fills the body; `tick` controls the corner check.
 */
const GridCard = forwardRef(function GridCard(
  {
    as: Tag = 'button',
    active = false,
    className = '',
    children,
    onClick,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <Tag
      ref={ref}
      type={Tag === 'button' ? type : undefined}
      onClick={onClick}
      aria-pressed={active || undefined}
      className={`group relative flex flex-col border bg-white transition-colors duration-150 ease-[var(--ease-snappy)] ${
        active ? 'border-ink' : 'border-line hover:border-ink'
      } ${className}`}
      {...props}
    >
      {children}
      {active && (
        <span className="check-pop absolute top-2 right-2 z-20 flex h-4 w-4 items-center justify-center bg-ink text-paper">
          <CheckIcon size={11} />
        </span>
      )}
    </Tag>
  )
})

export default GridCard