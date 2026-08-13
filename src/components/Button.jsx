import { forwardRef } from 'react'

/**
 * Unified pressable button. One definition per variant/size so a hover
 * colour change for a whole class of buttons is a one-line edit here.
 *
 * Variants:
 *  - primary   ink fill → ink-deep on hover (the single CTA style)
 *  - secondary paper chip → ink fill on hover (soft actions)
 *  - ghost     plain chip, ink-soft → ink on hover (quiet actions)
 *  - outline   paper chip with ink border → ink fill on hover (accent option)
 *  - accent    transient state used for momentary confirmation
 *
 * Polymorphic: pass `as="a"` (or `as="button"`) to render the right element;
 * anchors get target/rel defaults of `_blank` / `noopener` when `to`-style
 * props are given, but you can always pass your own.
 */
const VARIANTS = {
  primary: 'border-ink bg-ink text-paper hover:border-ink-deep hover:bg-ink-deep',
  secondary: 'border-line-strong bg-white text-ink hover:-translate-y-px hover:border-ink hover:bg-ink hover:text-paper',
  ghost: 'border-line-strong bg-white text-ink-soft hover:border-ink hover:bg-paper hover:text-ink',
  outline: 'border-ink bg-paper text-ink hover:-translate-y-px hover:bg-ink hover:text-paper',
  accent: 'border-accent bg-accent text-paper',
}

const SIZES = {
  md: 'px-3.5 py-2 text-[12.5px]',
  sm: 'px-3 py-2 text-[12.5px]',
  xs: 'px-2.5 py-1.5 text-[11px]',
  card: 'h-8 px-2.5 text-[11.5px]',
  'icon-sm': 'h-8 w-8',
  icon: 'h-10 w-10',
}

const DISABLED = 'cursor-not-allowed border-line bg-white text-ink-faint'

const Button = forwardRef(function Button(
  {
    as: Tag = 'button',
    variant = 'secondary',
    size = 'sm',
    className = '',
    disabled,
    ...props
  },
  ref,
) {
  return (
    <Tag
      ref={ref}
      disabled={Tag === 'button' ? disabled : undefined}
      aria-disabled={Tag !== 'button' && disabled ? true : undefined}
      className={`pressable inline-flex shrink-0 items-center justify-center gap-2 border font-semibold ${SIZES[size] || ''} ${disabled ? DISABLED : VARIANTS[variant] || ''} ${className}`}
      {...props}
    />
  )
})

export default Button