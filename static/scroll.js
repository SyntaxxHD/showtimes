const el = document.querySelector('.day-strip')
if (el) {
  const saved = sessionStorage.getItem('day-strip-scroll')
  if (saved) el.scrollLeft = +saved
  el.addEventListener('scroll', () => sessionStorage.setItem('day-strip-scroll', el.scrollLeft), { passive: true })
}
