;(function () {
  if (location.pathname !== '/program') return

  const p = new URLSearchParams(location.search)
  const KEYS = ['lang', 'format', 'time', 'view']

  if (KEYS.some(k => p.has(k))) return

  let prefs
  try {
    prefs = JSON.parse(localStorage.getItem('filterPrefs') || '{}')
  } catch {
    return
  }

  let changed = false

  for (const k of KEYS) {
    if (prefs[k]) {
      p.set(k, prefs[k])
      changed = true
    }
  }

  if (changed) location.replace('/program?' + p.toString())
})()
