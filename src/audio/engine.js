// Walkup songs share one exclusive group; every top-row pad (pregame + fx)
// is layered and independent of everything.
//
// - Walkup: exclusive — starting one cuts off whatever other walkup song is
//   currently playing, full stop, no locking. Retriggering the same song
//   restarts it rather than stopping it, like a typical soundboard trigger.
// - Top row (pad.layered === true): each pad is its own independent
//   trigger — it never cuts, and is never cut by, anything else, including
//   other top-row pads or a playing walkup song. Charge Organ and Crowd
//   Upset can run at the same time; so can a walkup song and any number of
//   top-row pads. Retriggering the same top-row pad restarts just that one
//   (same soundboard-trigger rule) rather than stacking multiple copies.
//
// Clips are fetched once and decoded to an AudioBuffer so every trigger
// after that is a zero-latency BufferSource start. A DynamicsCompressorNode
// sits after every source as a safety-net limiter on top of the offline
// loudness normalization pass.

function rms(byteTimeDomainData) {
  let sum = 0
  for (let i = 0; i < byteTimeDomainData.length; i++) {
    const v = (byteTimeDomainData[i] - 128) / 128
    sum += v * v
  }
  return Math.sqrt(sum / byteTimeDomainData.length)
}

export class SoundEngine {
  #ctx = null
  #compressor = null
  #analyserL = null
  #analyserR = null
  #meterDataL = null
  #meterDataR = null
  #buffers = new Map()
  #oneShotBuffers = new Map()
  #loadStatus = new Map()
  #exclusive = { padId: null, source: null, token: 0 }
  #layeredLanes = new Map()
  #allSources = new Set()
  #listeners = new Set()

  onChange(fn) {
    this.#listeners.add(fn)
    return () => this.#listeners.delete(fn)
  }

  #emit() {
    this.#listeners.forEach((fn) => fn())
  }

  #getContext() {
    if (!this.#ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      this.#ctx = new Ctx()
      this.#compressor = this.#ctx.createDynamicsCompressor()
      this.#compressor.threshold.value = -6
      this.#compressor.knee.value = 6
      this.#compressor.ratio.value = 12
      this.#compressor.attack.value = 0.003
      this.#compressor.release.value = 0.25
      this.#compressor.connect(this.#ctx.destination)

      // Tapped post-compressor so the master meter reflects the actual
      // limited output, split to stereo so the L/R rows can genuinely
      // differ instead of mirroring each other.
      const splitter = this.#ctx.createChannelSplitter(2)
      this.#analyserL = this.#ctx.createAnalyser()
      this.#analyserR = this.#ctx.createAnalyser()
      this.#analyserL.fftSize = 256
      this.#analyserR.fftSize = 256
      this.#analyserL.smoothingTimeConstant = 0.6
      this.#analyserR.smoothingTimeConstant = 0.6
      this.#compressor.connect(splitter)
      splitter.connect(this.#analyserL, 0)
      splitter.connect(this.#analyserR, 1)
      this.#meterDataL = new Uint8Array(this.#analyserL.fftSize)
      this.#meterDataR = new Uint8Array(this.#analyserR.fftSize)
    }
    // Browsers start contexts suspended until a user gesture. preloadAll()
    // creates the context before any gesture, so this is what actually
    // unlocks it — called synchronously from within trigger()'s call
    // stack, still inside the click/tap event that invoked it.
    if (this.#ctx.state === 'suspended') this.#ctx.resume()
    return this.#ctx
  }

  // RMS level of the actual output signal, 0-1, read fresh each call —
  // cheap enough to poll every animation frame from the meter.
  getLevels() {
    if (!this.#analyserL) return { left: 0, right: 0 }
    this.#analyserL.getByteTimeDomainData(this.#meterDataL)
    this.#analyserR.getByteTimeDomainData(this.#meterDataR)
    return { left: rms(this.#meterDataL), right: rms(this.#meterDataR) }
  }

  async preloadAll(pads) {
    const ctx = this.#getContext()
    const targets = pads.filter((p) => p.hasAudio)
    targets.forEach((p) => this.#loadStatus.set(p.id, 'pending'))

    await Promise.allSettled(
      targets.map(async (pad) => {
        try {
          const res = await fetch(pad.audioFile)
          if (!res.ok) throw new Error(`${pad.audioFile}: ${res.status}`)
          const arrayBuffer = await res.arrayBuffer()
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
          this.#buffers.set(pad.id, audioBuffer)
          this.#loadStatus.set(pad.id, 'ready')
        } catch {
          this.#loadStatus.set(pad.id, 'error')
        }
        this.#emit()
      })
    )
  }

  loadStatus(padId) {
    return this.#loadStatus.get(padId) ?? 'pending'
  }

  // Decorative sounds outside the pad/lane system entirely (e.g. the logo
  // easter egg) — pre-decoded like everything else for zero-latency
  // playback, but never cuts and is never cut by anything.
  async preloadOneShot(id, url) {
    const ctx = this.#getContext()
    try {
      const res = await fetch(url)
      if (!res.ok) return
      const arrayBuffer = await res.arrayBuffer()
      const buffer = await ctx.decodeAudioData(arrayBuffer)
      this.#oneShotBuffers.set(id, buffer)
    } catch {
      /* decorative sound — nothing to surface if it fails to load */
    }
  }

  playOneShot(id) {
    const buffer = this.#oneShotBuffers.get(id)
    if (!buffer) return
    const source = this.#makeSource(buffer)
    this.#allSources.add(source)
    source.onended = () => {
      this.#allSources.delete(source)
      this.#emit()
    }
    source.start()
    this.#emit()
  }

  isPlaying(pad) {
    if (pad.layered) return this.#layeredLanes.has(pad.id)
    return this.#exclusive.padId === pad.id
  }

  isAnythingPlaying() {
    return this.#allSources.size > 0
  }

  stopAll() {
    // Snapshot first — each source's own onended handler removes itself
    // from #allSources as it fires, which would mutate the set mid-iteration.
    ;[...this.#allSources].forEach((source) => {
      try {
        source.stop()
      } catch {
        /* already stopped */
      }
    })
  }

  // Returns { ok: true } or { ok: false, reason } — the caller decides how
  // to surface each reason (toast copy, etc).
  trigger(pad) {
    if (!pad.hasAudio) return { ok: false, reason: 'coming-soon' }

    const status = this.#loadStatus.get(pad.id)
    if (status === 'error') return { ok: false, reason: 'unavailable' }
    if (status !== 'ready') return { ok: false, reason: 'loading' }

    if (pad.layered) {
      this.#playLayered(pad)
    } else {
      this.#playExclusive(pad)
    }
    return { ok: true }
  }

  #makeSource(buffer, fadeInMs = 0) {
    const ctx = this.#getContext()
    const source = ctx.createBufferSource()
    source.buffer = buffer

    if (fadeInMs > 0) {
      const gain = ctx.createGain()
      const now = ctx.currentTime
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(1, now + fadeInMs / 1000)
      source.connect(gain).connect(this.#compressor)
    } else {
      source.connect(this.#compressor)
    }
    return source
  }

  #stopExclusiveSource() {
    if (this.#exclusive.source) {
      this.#exclusive.token++ // invalidates the outgoing source's onended before we stop() it
      try {
        this.#exclusive.source.stop()
      } catch {
        /* already stopped */
      }
      this.#exclusive.source = null
    }
    this.#exclusive.padId = null
  }

  #playExclusive(pad) {
    // Always cuts and restarts — including re-tapping the same pad — like a
    // typical soundboard trigger rather than a play/stop toggle.
    this.#stopExclusiveSource()

    const buffer = this.#buffers.get(pad.id)
    const token = ++this.#exclusive.token
    const source = this.#makeSource(buffer, pad.fadeInMs)
    this.#allSources.add(source)
    source.onended = () => {
      this.#allSources.delete(source)
      if (this.#exclusive.token !== token) return
      this.#exclusive.padId = null
      this.#exclusive.source = null
      this.#emit()
    }

    this.#exclusive.padId = pad.id
    this.#exclusive.source = source
    source.start()
    this.#emit()
  }

  #playLayered(pad) {
    // Each layered pad is its own single-slot lane, keyed by id — retapping
    // the same one cuts and restarts it (like the shared exclusive group
    // does), but a different layered pad is a different lane entirely, so
    // crowd cheer and crowd upset can still run at the same time.
    const existing = this.#layeredLanes.get(pad.id)
    const token = (existing?.token ?? 0) + 1
    if (existing) {
      try {
        existing.source.stop()
      } catch {
        /* already stopped */
      }
    }

    const buffer = this.#buffers.get(pad.id)
    const source = this.#makeSource(buffer, pad.fadeInMs)
    this.#allSources.add(source)
    this.#layeredLanes.set(pad.id, { source, token })

    source.onended = () => {
      this.#allSources.delete(source)
      if (this.#layeredLanes.get(pad.id)?.token !== token) return
      this.#layeredLanes.delete(pad.id)
      this.#emit()
    }
    source.start()
    this.#emit()
  }
}
