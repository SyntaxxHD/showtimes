document.querySelectorAll('.code-wrap').forEach(function(wrap) {
  var btn = wrap.querySelector('.copy-btn')
  var pre = wrap.querySelector('pre')
  btn.addEventListener('click', function() {
    navigator.clipboard.writeText(pre.textContent.trim())
    btn.textContent = 'Kopiert!'
    setTimeout(function() { btn.textContent = 'Kopieren' }, 2000)
  })
})
