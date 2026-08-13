const SMOOTHING = 0.35
// Normalized clip RMS sits well under 1.0 in practice, so raw levels barely
// light the bar — this brings a typical -16 LUFS clip up to a lively range
// without letting true peaks blow past full scale (still clamped to 1).
const LEVEL_GAIN = 4

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

export class MasterMeter {
  #leftDots
  #rightDots
  #engine
  #active = false
  #levelL = 0
  #levelR = 0
  #rafId = null

  constructor(leftDots, rightDots, engine) {
    this.#leftDots = leftDots
    this.#rightDots = rightDots
    this.#engine = engine
  }

  setActive(active) {
    if (this.#active === active) return
    this.#active = active

    if (prefersReducedMotion) {
      this.#levelL = this.#levelR = active ? 0.5 : 0
      this.#render()
      return
    }

    if (active && !this.#rafId) this.#tick()
  }

  #tick() {
    const { left, right } = this.#active ? this.#engine.getLevels() : { left: 0, right: 0 }
    const targetL = Math.min(1, left * LEVEL_GAIN)
    const targetR = Math.min(1, right * LEVEL_GAIN)
    this.#levelL += (targetL - this.#levelL) * SMOOTHING
    this.#levelR += (targetR - this.#levelR) * SMOOTHING
    this.#render()

    const settled = !this.#active && this.#levelL < 0.02 && this.#levelR < 0.02
    if (settled) {
      this.#levelL = this.#levelR = 0
      this.#render()
      this.#rafId = null
      return
    }
    this.#rafId = requestAnimationFrame(() => this.#tick())
  }

  #render() {
    const litL = Math.round(this.#levelL * this.#leftDots.length)
    const litR = Math.round(this.#levelR * this.#rightDots.length)
    this.#leftDots.forEach((dot, i) => dot.classList.toggle('is-lit', i < litL))
    this.#rightDots.forEach((dot, i) => dot.classList.toggle('is-lit', i < litR))
  }
}
