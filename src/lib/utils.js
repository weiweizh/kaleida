export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export function dataURLToBlob(url) {
  return fetch(url).then((r) => r.blob())
}

// Cache whether the browser can encode WebP on a canvas. Safari (pre-17) can
// decode WebP but not encode it, so toBlob('image/webp') returns null there.
let webpEncodable = null
function canEncodeWebP() {
  if (webpEncodable !== null) return webpEncodable
  try {
    const canvas = document.createElement('canvas')
    webpEncodable = canvas.toDataURL('image/webp').startsWith('data:image/webp')
  } catch {
    webpEncodable = false
  }
  return webpEncodable
}

/** Downscale a square image blob to a compact data URL. Keeps gallery
 *  entries small so ~25 patterns fit comfortably in localStorage.
 *  Uses WebP when the browser supports encoding it, otherwise falls back to
 *  JPEG (much smaller than PNG) so the library works in every browser. */
export function resizeBlobToDataURL(blob, size) {
  const type = canEncodeWebP() ? 'image/webp' : 'image/jpeg'
  const quality = 0.75
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      // JPEG has no alpha — composite over paper so transparent edges stay light.
      ctx.fillStyle = '#f7f3eb'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
      URL.revokeObjectURL(url)
      const done = (out) => {
        if (out) blobToDataURL(out).then(resolve, reject)
        else reject(new Error('Image encoding failed'))
      }
      try {
        canvas.toBlob(done, type, quality)
      } catch {
        // If toBlob throws for this mime, try the other encoder as a fallback.
        if (type !== 'image/jpeg') {
          try {
            canvas.toBlob(done, 'image/jpeg', quality)
          } catch {
            reject(new Error('Image encoding failed'))
          }
        } else {
          reject(new Error('Image encoding failed'))
        }
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image decode failed'))
    }
    img.src = url
  })
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function stampFilename(mode) {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  return `kaleidoscope-${mode}-${stamp}.png`
}

export function isImageFile(file) {
  return /^image\/(png|jpe?g|webp)$/.test(file.type)
}
