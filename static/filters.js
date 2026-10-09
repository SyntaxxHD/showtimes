document.querySelector('.filter-bar')?.addEventListener('click', e => {
  const a = e.target.closest('a[href]')
  if (!a) return

  let url
  try {
    url = new URL(a.href)
  } catch {
    return
  }

  const KEYS = ['lang', 'format', 'time', 'view']

  let prefs
  try {
    prefs = JSON.parse(localStorage.getItem('filterPrefs') || '{}')
  } catch {
    prefs = {}
  }

  for (const k of KEYS) {
    const val = url.searchParams.get(k)
    if (val) prefs[k] = val
    else delete prefs[k]
  }

  localStorage.setItem('filterPrefs', JSON.stringify(prefs))
})
