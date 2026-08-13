/** Browser-local pattern library. Shared by the app and the gallery page
 *  (same origin → same localStorage). Not synced across devices. */

const KEY = 'kaleida.patternLibrary'
export const PATTERN_LIMIT = 25

export function listPatterns() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function save(patterns) {
  try {
    localStorage.setItem(KEY, JSON.stringify(patterns))
    return true
  } catch {
    return false
  }
}

export function addPattern(entry) {
  const patterns = listPatterns()
  if (patterns.length >= PATTERN_LIMIT) return 'limit'
  patterns.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : `p-${Date.now()}`,
    createdAt: Date.now(),
    ...entry,
  })
  return save(patterns) ? true : 'storage'
}

export function removePattern(id) {
  save(listPatterns().filter((p) => p.id !== id))
}

export function clearPatterns() {
  localStorage.removeItem(KEY)
}

/** Keep a `fn(list)` in sync across windows (the gallery live-updates when a
 *  pattern is added in the app). Returns an unsubscribe function. */
export function subscribe(fn) {
  fn(listPatterns())
  const onStorage = () => fn(listPatterns())
  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}

/** Compact stored entries so the 25-pattern budget isn't swallowed by large
 *  thumbnails. Downscales any stored image (PNG or WebP) to a smaller size on
 *  load, freeing localStorage quota. Run once on app load. */
export async function compactStoredPatterns(target = 448) {
  const patterns = listPatterns()
  if (!patterns.length) return

  const { dataURLToBlob, resizeBlobToDataURL } = await import('./utils.js')
  let changed = false
  const compacted = []
  for (const p of patterns) {
    let url = p.full || p.thumb || ''
    // Re-encode oversized or PNG images to keep entries compact.
    if (url.startsWith('data:image/png') || estimatedBytes(url) > 120_000) {
      try {
        const blob = await dataURLToBlob(url)
        url = await resizeBlobToDataURL(blob, target)
        changed = true
      } catch {
        // keep the original if re-encoding fails
      }
    }
    compacted.push({ ...p, thumb: url, full: p.full ? url : undefined })
  }
  if (changed) save(compacted)
}

/** Rough byte estimate of a data URL string (UTF-16 chars → bytes). */
function estimatedBytes(dataUrl) {
  return dataUrl.length * 2
}
