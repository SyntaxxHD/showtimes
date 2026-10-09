const outer = document.querySelector('.day-strip-outer')
const offset = outer?.dataset.offset ?? '0'
const storageKey = 'day-strip-scroll-' + offset

const el = document.querySelector('.day-strip')
if (el) {
  const saved = sessionStorage.getItem(storageKey)
  if (saved) el.scrollLeft = +saved

  el.addEventListener('scroll', () => sessionStorage.setItem(storageKey, el.scrollLeft), { passive: true })
}
