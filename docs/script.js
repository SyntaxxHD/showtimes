document.querySelectorAll('.code-wrap').forEach(function(wrap) {
  var btn = wrap.querySelector('.copy-btn')
  var pre = wrap.querySelector('pre')
  btn.addEventListener('click', function() {
    navigator.clipboard.writeText(pre.textContent.trim())
    btn.textContent = 'Kopiert!'
    setTimeout(function() { btn.textContent = 'Kopieren' }, 2000)
  })
})

// Cinema checker
;(function() {
  var input = document.getElementById('cinema-input')
  var statusEl = document.getElementById('cinema-status')
  var resultsEl = document.getElementById('cinema-results')
  var successEl = document.getElementById('cinema-success')
  var successText = document.getElementById('cinema-success-text')
  if (!input) { return }

  var debounceTimer = null

  function getCinemas(cb) {
    if (window.CINEMAS_DATA) { cb(window.CINEMAS_DATA); return }
    cb(null)
  }

  function clearResults() {
    resultsEl.hidden = true
    resultsEl.innerHTML = ''
    successEl.hidden = true
  }

  function showSuccess(cinema) {
    clearResults()
    successText.textContent = '✓ ' + cinema.name + ' in ' + cinema.city + ' wird unterstützt.'
    successEl.hidden = false
  }

  function showResults(matches) {
    if (matches.length === 0) {
      statusEl.textContent = 'Kein Cineamo-Kino mit diesem Namen gefunden.'
      resultsEl.hidden = true
      return
    }
    statusEl.textContent = ''
    resultsEl.innerHTML = ''
    matches.slice(0, 5).forEach(function(c) {
      var row = document.createElement('div')
      row.className = 'cinema-result-row'
      row.innerHTML =
        '<span class="cinema-result-name">' + escapeHtml(c.name) + '</span>' +
        '<span class="cinema-result-city">' + escapeHtml(c.city) + '</span>'
      row.addEventListener('click', function() { showSuccess(c) })
      resultsEl.appendChild(row)
    })
    resultsEl.hidden = false
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  input.addEventListener('input', function() {
    clearTimeout(debounceTimer)
    var q = input.value.trim().toLowerCase()
    clearResults()
    if (q.length < 2) { statusEl.textContent = ''; return }
    debounceTimer = setTimeout(function() {
      statusEl.textContent = 'Suche...'
      getCinemas(function(cinemas) {
        if (!cinemas) { statusEl.textContent = 'Suche gerade nicht verfügbar.'; return }
        var matches = cinemas.filter(function(c) {
          return (c.name || '').toLowerCase().includes(q) || (c.city || '').toLowerCase().includes(q)
        })
        showResults(matches)
      })
    }, 300)
  })
})()
