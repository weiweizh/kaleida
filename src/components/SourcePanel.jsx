import { useRef, useState } from 'react'
import { UploadIcon } from './Icon.jsx'
import GridCard from './GridCard.jsx'
import { PRESETS } from '../lib/presets.js'
import { isImageFile, formatBytes } from '../lib/utils.js'

/**
 * Image source management: drag-and-drop / click upload + built-in presets.
 */
export default function SourcePanel({ source, presets, activePresetId, onSelectPreset, onUpload }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')

  const handleFiles = (files) => {
    const file = files && files[0]
    if (!file) return
    if (!isImageFile(file)) {
      setError('Needs to be a PNG, JPG or WEBP.')
      return
    }
    setError('')
    onUpload(file)
  }

  return (
    <div className="space-y-4">
      {/* Sources: upload option + built-in presets */}
      <div>
        <div className="spec mb-2 font-semibold text-ink">Image source</div>
        <div className="grid grid-cols-4 gap-2">
          {/* Upload / drop target — first square, same visual weight as a preset */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                inputRef.current?.click()
              }
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              handleFiles(e.dataTransfer.files)
            }}
            title="Drop an image or click to upload"
            aria-label="Upload your own image"
            className={`group relative flex aspect-square w-full flex-col items-center justify-center gap-1.5 overflow-hidden border border-dashed ${
              dragOver
                ? 'border-ink bg-paper drop-pulse'
                : 'border-line-strong bg-paper hover:border-ink'
            }`}
          >
            <span
              className={`flex h-8 w-8 items-center justify-center border transition-colors duration-150 ease-[var(--ease-snappy)] ${
                dragOver ? 'border-ink bg-ink text-paper' : 'border-line-strong bg-white text-ink group-hover:border-ink'
              }`}
            >
              <UploadIcon size={15} className="transition-transform duration-150 ease-[var(--ease-snappy)] group-hover:-translate-y-px" />
            </span>
            <span className="px-1 text-center text-[10.5px] font-semibold leading-tight text-ink">
              {dragOver ? 'Drop it.' : 'Drop image'}
            </span>
            {error && <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-reg-magenta error-blink" title={error} />}
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </button>
          {presets.slice(0, 7).map((p) => {
            const active = p.id === activePresetId
            return (
              <GridCard
                key={p.id}
                active={active}
                onClick={() => onSelectPreset(p)}
                title={`${p.name} — ${p.tag}`}
                className="overflow-hidden"
              >
                <img
                  src={p.url}
                  alt={p.name}
                  draggable={false}
                  className="aspect-square w-full object-cover transition-transform duration-700 ease-[var(--ease-snappy)] group-hover:scale-[1.05]"
                />
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 px-1.5 pt-5 pb-1 text-left text-[10.5px] font-semibold leading-tight bg-gradient-to-t from-ink/90 to-transparent text-paper">
                  <span className="truncate">{p.name}</span>
                </span>
              </GridCard>
            )
          })}
        </div>
      </div>
    </div>
  )
}
