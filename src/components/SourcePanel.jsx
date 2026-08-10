import { useRef, useState } from 'react'
import { UploadIcon } from './Icon.jsx'
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
      {/* Dropzone */}
      <div
        role="button"
        tabIndex={0}
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
        className={`group relative flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed px-4 py-6 text-center transition-colors duration-200 ${
          dragOver ? 'border-ink bg-paper' : 'border-line-strong bg-paper hover:border-ink'
        }`}
      >
        <div
          className={`flex h-11 w-11 items-center justify-center border ${
            dragOver ? 'border-ink bg-ink text-paper' : 'border-line-strong bg-white text-ink'
          }`}
        >
          <UploadIcon size={20} />
        </div>
        <div className="text-[13.5px] font-semibold text-ink">
          {dragOver ? 'Drop it.' : 'Drop an image or click to upload'}
        </div>
        <div className="spec">PNG · JPG · WEBP — busier sources make richer patterns</div>
        {error && <div className="text-[12px] font-semibold text-reg-magenta">{error}</div>}
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
      </div>

      {/* Current source meta */}
      {source && (
        <div className="flex items-center justify-between border border-line bg-paper px-3 py-2">
          <span className="flex min-w-0 items-center gap-2 text-[12.5px] text-ink">
            <span className="live-dot shrink-0" />
            <span className="truncate">{source.name}</span>
          </span>
          <span className="spec shrink-0 pl-3 tabular-nums">{source.width}×{source.height}{source.bytes > 0 ? ` · ${formatBytes(source.bytes)}` : ''}</span>
        </div>
      )}

      {/* Presets */}
      <div>
        <div className="spec mb-2 font-semibold text-ink">Built-in sources</div>
        <div className="grid grid-cols-4 gap-2">
          {presets.map((p) => {
            const active = p.id === activePresetId
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPreset(p)}
                title={`${p.name} — ${p.tag}`}
                className={`group relative overflow-hidden border transition-colors duration-200 ${
                  active ? 'border-ink' : 'border-line hover:border-line-strong'
                }`}
              >
                <img
                  src={p.url}
                  alt={p.name}
                  draggable={false}
                  className="aspect-square w-full object-cover opacity-90 grayscale-[0.15] transition-all duration-300 group-hover:grayscale-0"
                />
                <span
                  className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 to-transparent px-1.5 pt-5 pb-1 text-left text-[10.5px] font-semibold leading-tight text-paper ${
                    active ? '' : 'opacity-90'
                  }`}
                >
                  {p.name}
                </span>
                {active && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 bg-reg-magenta" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
