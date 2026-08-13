const DISMISS_AFTER_MS = 2800

export function createToastRegion() {
  const region = document.createElement('div')
  region.className = 'toast-region'
  region.setAttribute('aria-live', 'polite')
  region.setAttribute('aria-atomic', 'true')
  return region
}

export function showToast(region, message) {
  const toast = document.createElement('div')
  toast.className = 'toast'
  toast.textContent = message
  region.appendChild(toast)

  requestAnimationFrame(() => toast.classList.add('is-visible'))

  setTimeout(() => {
    toast.classList.remove('is-visible')
    toast.addEventListener('transitionend', () => toast.remove(), { once: true })
  }, DISMISS_AFTER_MS)
}
