/**
 * Segmented control with a flat print treatment. The active option inverts to
 * ink and carries a small registration tick — no sliding gradient.
 * Options: { value, label, icon? }.
 */
export default function SegmentedControl({ options, value, onChange, className = '' }) {
  return (
    <div className={`flex border border-line-strong bg-paper ${className}`}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={`pressable relative z-10 flex min-w-0 flex-1 items-center justify-center gap-1.5 px-2 py-2 text-[12.5px] font-semibold ${
              active ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-ink/[0.06] hover:text-ink'
            }`}
          >
            <span className="shrink-0">{o.icon}</span>
            <span className="truncate">{o.label}</span>
            {active && <span className="absolute right-1 top-1 h-1.5 w-1.5 bg-reg-yellow check-pop" />}
          </button>
        )
      })}
    </div>
  )
}
