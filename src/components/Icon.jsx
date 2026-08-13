/** Minimal inline SVG icon set — stroke-based, inherits currentColor. */

const base = (children) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  ...children,
})

export const DiamondIcon = (p) => (
  <svg {...base()} className={p.className} width={p.size ?? 18} height={p.size ?? 18}>
    <path d="M12 2.5 21.5 12 12 21.5 2.5 12z" />
    <path d="M2.5 12h19" strokeWidth="1.2" />
    <path d="M12 2.5 8 12l4 9.5L16 12z" fill="currentColor" stroke="none" opacity="0.25" />
  </svg>
)

export const MirrorIcon = (p) => (
  <svg {...base()} className={p.className} width={p.size ?? 18} height={p.size ?? 18}>
    <path d="M12 2v20" />
    <path d="M12 2 4 10h16z" />
    <path d="M12 22l-8-8h16z" />
    <path d="M12 2l4 8-4 12" strokeWidth="1.1" opacity="0.6" />
  </svg>
)

export const MandalaIcon = (p) => (
  <svg {...base()} className={p.className} width={p.size ?? 18} height={p.size ?? 18}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3.4" />
    <path d="M12 3v4.6M12 16.4V21M3 12h4.6M16.4 12H21" />
    <path d="M5.6 5.6l3.3 3.3M15.1 15.1l3.3 3.3M18.4 5.6l-3.3 3.3M8.9 15.1l-3.3 3.3" />
  </svg>
)

export const FlowIcon = (p) => (
  <svg {...base()} className={p.className} width={p.size ?? 18} height={p.size ?? 18}>
    <path d="M2.5 12c2-6 5-6 7 0s5 6 7 0 4-4.5 5-2.5" />
    <path d="M18.5 5.5h3v3" />
  </svg>
)

export const PlayIcon = (p) => (
  <svg {...base()} className={p.className} width={p.size ?? 16} height={p.size ?? 16} fill="currentColor" stroke="none">
    <path d="M8 5.14v13.72c0 .83.9 1.34 1.61.9l10.9-6.86a1.05 1.05 0 0 0 0-1.8L9.61 4.24A1.05 1.05 0 0 0 8 5.14Z" />
  </svg>
)

export const PauseIcon = (p) => (
  <svg {...base()} className={p.className} width={p.size ?? 16} height={p.size ?? 16} fill="currentColor" stroke="none">
    <rect x="6" y="4" width="4" height="16" rx="1.2" />
    <rect x="14" y="4" width="4" height="16" rx="1.2" />
  </svg>
)

export const DownloadIcon = (p) => (
  <svg {...base()} className={p.className} width={p.size ?? 18} height={p.size ?? 18}>
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M4 19h16" />
  </svg>
)

export const PlusIcon = (p) => (
  <svg {...base()} className={p.className} width={p.size ?? 18} height={p.size ?? 18}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const LibraryIcon = (p) => (
  <svg {...base()} className={p.className} width={p.size ?? 18} height={p.size ?? 18}>
    <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z" />
    <path d="M19 19v2H5a1 1 0 0 1-1-1" />
    <path d="M8 7h7M8 11h7" />
  </svg>
)

export const ExternalIcon = (p) => (
  <svg {...base()} className={p.className} width={p.size ?? 14} height={p.size ?? 14}>
    <path d="M14 3h7v7" />
    <path d="M21 3 10.5 13.5" />
    <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
  </svg>
)

export const TrashIcon = (p) => (
  <svg {...base()} className={p.className} width={p.size ?? 15} height={p.size ?? 15}>
    <path d="M4 7h16" />
    <path d="M9 7V4h6v3" />
    <path d="M6 7l1 13h10l1-13" />
    <path d="M10 11v5M14 11v5" />
  </svg>
)

export const CloseIcon = (p) => (
  <svg {...base()} className={p.className} width={p.size ?? 16} height={p.size ?? 16}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export const UploadIcon = (p) => (
  <svg {...base()} className={p.className} width={p.size ?? 18} height={p.size ?? 18}>
    <path d="M12 15V4" />
    <path d="m7 9 5-5 5 5" />
    <path d="M4 19h16" />
  </svg>
)

export const ResetIcon = (p) => (
  <svg {...base()} className={p.className} width={p.size ?? 16} height={p.size ?? 16}>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6L3.5 8.5" />
    <path d="M3.5 3v5.5H9" />
  </svg>
)

export const CheckIcon = (p) => (
  <svg {...base()} className={p.className} width={p.size ?? 14} height={p.size ?? 14}>
    <path d="M4.5 12.5l5 5 10-11" />
  </svg>
)

export const CrosshairIcon = (p) => (
  <svg {...base()} className={p.className} width={p.size ?? 14} height={p.size ?? 14}>
    <circle cx="12" cy="12" r="7.5" />
    <path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" />
  </svg>
)

export const SparkleIcon = (p) => (
  <svg {...base()} className={p.className} width={p.size ?? 16} height={p.size ?? 16} fill="currentColor" stroke="none">
    <path d="M12 2c.5 4.5 2.5 6.5 7 7-4.5.5-6.5 2.5-7 7-.5-4.5-2.5-6.5-7-7 4.5-.5 6.5-2.5 7-7Z" />
  </svg>
)

export const TiledIcon = (p) => (
  <svg {...base()} className={p.className} width={p.size ?? 16} height={p.size ?? 16}>
    <rect x="3" y="3" width="8" height="8" rx="1" />
    <rect x="13" y="3" width="8" height="8" rx="1" />
    <rect x="3" y="13" width="8" height="8" rx="1" />
    <rect x="13" y="13" width="8" height="8" rx="1" />
  </svg>
)

export const GeometricIcon = (p) => (
  <svg {...base()} className={p.className} width={p.size ?? 18} height={p.size ?? 18}>
    <rect x="5.5" y="5.5" width="13" height="13" rx="1.5" />
    <rect x="5.5" y="5.5" width="13" height="13" rx="1.5" transform="rotate(45 12 12)" opacity="0.7" />
    <circle cx="12" cy="12" r="2.6" />
  </svg>
)

export const ShuffleIcon = (p) => (
  <svg {...base()} className={p.className} width={p.size ?? 16} height={p.size ?? 16}>
    <path d="M4 7h3l10 10h3" />
    <path d="M4 17h3l2.5-2.5" />
    <path d="M14.5 9.5 17 7h3" />
    <path d="M4 7v0M20 7l-2.5 2.5" />
  </svg>
)

export const ChevronIcon = (p) => (
  <svg {...base()} className={p.className} width={p.size ?? 14} height={p.size ?? 14}>
    <path d="m6 9 6 6 6-6" />
  </svg>
)
