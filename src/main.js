import '@fontsource/big-shoulders-stencil-display/700'
import '@fontsource/big-shoulders-stencil-display/800'
import '@fontsource/barlow/400.css'
import '@fontsource/barlow/500.css'
import '@fontsource/barlow/600.css'
import '@fontsource/barlow/700.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'
import '@fontsource/barlow-condensed/700.css'
import './style.css'

import { pads } from './data/pads.js'
import { createToastRegion, showToast } from './ui/toast.js'
import { SoundEngine } from './audio/engine.js'
import { MasterMeter } from './ui/meter.js'
import { startClock } from './ui/clock.js'
import {
  CANVAS,
  STAGE_BG_SIZE,
  MASTER_METER,
  STOP_ALL,
  LOGO,
  FULLSCREEN_PLATE,
  slotFor,
  hitRectFor,
  numberRectFor,
  nameRectFor,
  ledRectFor,
  clockRect,
  captionRectFor,
  playerCardImageRect,
  playerCardCloseRect,
  rectStyle,
} from './ui/coordinates.js'

const ART_PRIMARY = '/art/panel-primary.png'
const HOLD_THRESHOLD_MS = 550

const engine = new SoundEngine()
const toastRegion = createToastRegion()
document.body.appendChild(toastRegion)

const padRefs = new Map()
let detailPad = null

function el(tag, className, styleText) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (styleText) node.style.cssText = styleText
  return node
}

const TRIGGER_FAILURE_MESSAGES = {
  'coming-soon': "This cue isn't loaded yet.",
  loading: 'Still loading — try again in a second.',
  unavailable: 'Audio file missing for this cue.',
}

function handlePadActivate(pad) {
  const result = engine.trigger(pad)
  if (result.ok) return
  showToast(toastRegion, TRIGGER_FAILURE_MESSAGES[result.reason])
}

// --- Stage: fixed 2048x1536 canvas, scaled as a single unit to fit the
// viewport. Every dynamic element is positioned from the coordinate table,
// never from ad hoc CSS breakpoints. ---
const app = document.getElementById('app')
const stage = el('div', 'stage')

// Sits behind the canvas, scaled/centered identically — its center
// 2048x1536 is covered exactly by the canvas above it, so the only part
// that's ever visible is the extra grass bled onto its sides, filling in
// what would otherwise be flat letterbox bars on a non-4:3 screen.
const stageBg = el(
  'img',
  'stage-bg',
  `width:${STAGE_BG_SIZE.w}px; height:${STAGE_BG_SIZE.h}px;`
)
stageBg.src = '/art/panel-bg.png'
stageBg.alt = ''
stageBg.draggable = false

const canvas = el('div', 'canvas', `width:${CANVAS.w}px; height:${CANVAS.h}px;`)
const photoLayer = el('div', 'layer photo-layer')
const artImg = el('img', 'layer art-layer')
artImg.src = ART_PRIMARY
artImg.alt = ''
artImg.draggable = false
const overlayLayer = el('div', 'layer overlay-layer')
const hitLayer = el('div', 'layer hit-layer')

canvas.append(photoLayer, artImg, overlayLayer, hitLayer)
stage.append(stageBg, canvas)
app.append(stage)

function applyScale() {
  const scale = Math.min(stage.clientWidth / CANVAS.w, stage.clientHeight / CANVAS.h)
  canvas.style.transform = `scale(${scale})`
  stageBg.style.transform = `translate(-50%, -50%) scale(${scale})`
}
new ResizeObserver(applyScale).observe(stage)
applyScale()

// --- Logo easter egg ---
const LOGO_SOUND_ID = 'logo-bat'
const logoHit = el('button', 'hit-target', rectStyle(LOGO))
logoHit.type = 'button'
logoHit.setAttribute('aria-label', 'Redding Lugnuts')
logoHit.addEventListener('click', () => engine.playOneShot(LOGO_SOUND_ID))
hitLayer.appendChild(logoHit)

// --- Top row: Pre-Game + Ballpark FX ---
const topRowPads = pads.filter((p) => p.category !== 'walkup')

topRowPads.forEach((pad) => {
  const slot = slotFor(pad)

  if (pad.image) {
    const img = el('img', 'toprow-photo', rectStyle(slot.art))
    img.src = pad.image
    img.alt = ''
    photoLayer.appendChild(img)
  }

  const captionEl = el('div', 'toprow-caption', rectStyle(captionRectFor(pad)))
  captionEl.textContent = pad.label
  overlayLayer.appendChild(captionEl)

  const ledEl = el('div', 'led led--round', rectStyle(ledRectFor(pad)))
  overlayLayer.appendChild(ledEl)

  const hitEl = el('button', 'hit-target', rectStyle(hitRectFor(pad)))
  hitEl.type = 'button'
  hitEl.setAttribute('aria-label', pad.label)
  hitEl.addEventListener('click', () => handlePadActivate(pad))
  hitLayer.appendChild(hitEl)

  padRefs.set(pad.id, { pad, ledEl, hitEl })
})

// --- Master L/R VU meter ---
const meterGroup = el('div', 'master-meter')
overlayLayer.appendChild(meterGroup)

function meterTier(i) {
  if (i < 5) return 'meter-dot--green'
  if (i < 10) return 'meter-dot--yellow'
  return 'meter-dot--red'
}

function buildMeterDots(rects) {
  // The first dot sits right on top of the L/R label, so it's dropped —
  // green/yellow/red then splits 5/5/4 across the remaining 14.
  return rects.slice(1).map((rect, i) => {
    const dot = el('div', `meter-dot ${meterTier(i)}`, rectStyle(rect))
    meterGroup.appendChild(dot)
    return dot
  })
}
const masterMeter = new MasterMeter(buildMeterDots(MASTER_METER.left), buildMeterDots(MASTER_METER.right), engine)

// --- Clock ---
const clockEl = el('div', 'clock', rectStyle(clockRect()))
overlayLayer.appendChild(clockEl)
startClock(clockEl)

// --- STOP ALL ---
const stopAllGlow = el('div', 'stopall-glow', rectStyle(STOP_ALL))
overlayLayer.appendChild(stopAllGlow)

const stopAllHit = el('button', 'hit-target', rectStyle(STOP_ALL))
stopAllHit.type = 'button'
stopAllHit.setAttribute('aria-label', 'Stop all sounds')
stopAllHit.addEventListener('click', () => {
  engine.stopAll()
  stopAllGlow.classList.add('is-active')
  setTimeout(() => stopAllGlow.classList.remove('is-active'), 220)
})
hitLayer.appendChild(stopAllHit)

// --- Fullscreen toggle (repurposes the blank plate next to STOP ALL) ---
// iPhone Safari has never supported the Fullscreen API for regular pages;
// iPadOS Safari gained it in 16.4. Feature-detected so the plate just stays
// blank/inert on anything that can't do it, rather than showing a dead button.
function fullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null
}

// Launched from the home screen (Safari's "Add to Home Screen") runs with
// no browser chrome at all — no Fullscreen API involved, so nothing to
// toggle and, more importantly, none of WebKit's fullscreen-session heuristics
// (the ones that can interrupt a rapid volley of taps with an exit warning)
// apply either. The plate just stays blank/inert here, same as on iPhone.
const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

const canFullscreen =
  !isStandalone &&
  Boolean(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen)

if (canFullscreen) {
  const fullscreenGlow = el('div', 'stopall-glow', rectStyle(FULLSCREEN_PLATE))
  overlayLayer.appendChild(fullscreenGlow)

  const fullscreenLabel = el('div', 'fullscreen-label', rectStyle(FULLSCREEN_PLATE))
  fullscreenLabel.textContent = 'FULLSCREEN'
  overlayLayer.appendChild(fullscreenLabel)

  // Only ever shown/clickable when NOT already fullscreen — it sitting over
  // the clock is fine as a one-time prompt, but once fullscreen is engaged
  // the control disappears entirely so the clock reads clearly; exiting
  // relies on the browser's own fullscreen-exit affordance instead.
  const fullscreenHit = el('button', 'hit-target', rectStyle(FULLSCREEN_PLATE))
  fullscreenHit.type = 'button'
  fullscreenHit.setAttribute('aria-label', 'Enter fullscreen')
  fullscreenHit.addEventListener('click', () => {
    const target = document.documentElement
    ;(target.requestFullscreen || target.webkitRequestFullscreen)?.call(target)
    fullscreenGlow.classList.add('is-active')
    setTimeout(() => fullscreenGlow.classList.remove('is-active'), 220)
  })
  hitLayer.appendChild(fullscreenHit)

  const updateFullscreenControl = () => {
    const active = Boolean(fullscreenElement())
    fullscreenLabel.style.display = active ? 'none' : 'flex'
    fullscreenHit.style.display = active ? 'none' : 'block'
  }
  document.addEventListener('fullscreenchange', updateFullscreenControl)
  document.addEventListener('webkitfullscreenchange', updateFullscreenControl)
}

// --- Walk-Ups ---
const walkupPads = pads.filter((p) => p.category === 'walkup')
const walkupOverlayGroup = el('div', 'walkup-overlay-group')
const walkupHitGroup = el('div', 'walkup-hit-group')
overlayLayer.appendChild(walkupOverlayGroup)
hitLayer.appendChild(walkupHitGroup)

function wireWalkupGestures(hitEl, pad) {
  let holdTimer = null
  let holdFired = false

  hitEl.style.touchAction = 'manipulation'
  hitEl.addEventListener('contextmenu', (e) => e.preventDefault())

  hitEl.addEventListener('pointerdown', () => {
    holdFired = false
    holdTimer = setTimeout(() => {
      holdFired = true
      if (pad.cardImage) {
        openDetailCard(pad)
      } else {
        showToast(toastRegion, "This player's card isn't ready yet.")
      }
    }, HOLD_THRESHOLD_MS)
  })

  const cancelHold = () => {
    clearTimeout(holdTimer)
  }

  hitEl.addEventListener('pointerup', () => {
    cancelHold()
    if (!holdFired) handlePadActivate(pad)
  })
  hitEl.addEventListener('pointerleave', cancelHold)
  hitEl.addEventListener('pointercancel', cancelHold)
}

walkupPads.forEach((pad) => {
  // Open roster slots stay completely blank and inert — no number, no
  // label, no hit target — until a real song gets assigned to them
  // (eventually via a roster dashboard, for now via pads.js).
  if (!pad.hasAudio) return

  const numberEl = el('div', 'walkup-number', rectStyle(numberRectFor(pad)))
  numberEl.textContent = pad.jerseyNumber ?? ''
  walkupOverlayGroup.appendChild(numberEl)

  const nameEl = el('div', 'walkup-name', rectStyle(nameRectFor(pad)))
  nameEl.textContent = pad.label
  walkupOverlayGroup.appendChild(nameEl)

  const ledEl = el('div', 'led led--pill', rectStyle(ledRectFor(pad)))
  walkupOverlayGroup.appendChild(ledEl)

  const hitEl = el('button', 'hit-target', rectStyle(hitRectFor(pad)))
  hitEl.type = 'button'
  hitEl.setAttribute('aria-label', `${pad.label} — tap to play, hold for player info`)
  wireWalkupGestures(hitEl, pad)
  walkupHitGroup.appendChild(hitEl)

  padRefs.set(pad.id, { pad, ledEl, hitEl })
})

// --- Player Detail Card ---
// A pre-designed flattened PNG (pad.cardImage) — full width, anchored to
// the bottom of the canvas, its own close X baked into the art. Only
// wired up for players who actually have one (see wireWalkupGestures);
// everyone else gets a "not ready yet" toast on hold instead.
const cardImageEl = el('img', 'player-card-image', rectStyle(playerCardImageRect()))
cardImageEl.alt = ''
cardImageEl.style.display = 'none'
overlayLayer.appendChild(cardImageEl)

const closeHit = el('button', 'hit-target', rectStyle(playerCardCloseRect()))
closeHit.type = 'button'
closeHit.style.display = 'none'
closeHit.setAttribute('aria-label', 'Close player card')
closeHit.addEventListener('click', closeDetailCard)
hitLayer.appendChild(closeHit)

function openDetailCard(pad) {
  detailPad = pad
  walkupOverlayGroup.style.visibility = 'hidden'
  walkupHitGroup.style.visibility = 'hidden'
  cardImageEl.src = pad.cardImage
  cardImageEl.style.display = 'block'
  closeHit.style.display = 'block'
}

function closeDetailCard() {
  detailPad = null
  walkupOverlayGroup.style.visibility = ''
  walkupHitGroup.style.visibility = ''
  cardImageEl.style.display = 'none'
  closeHit.style.display = 'none'
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && detailPad) closeDetailCard()
})

// --- Audio state -> visuals ---
// padRefs only ever holds pads with a real audio file — coming-soon pads
// never get wired up in the first place, so there's no hasAudio branching
// needed here.
function updatePadStates() {
  padRefs.forEach(({ pad, ledEl, hitEl }) => {
    const playing = engine.isPlaying(pad)

    ledEl.classList.toggle('led--playing', playing)
    hitEl.setAttribute('aria-pressed', String(playing))
  })
  masterMeter.setActive(engine.isAnythingPlaying())
}

engine.onChange(updatePadStates)
engine.preloadAll(pads)
engine.preloadOneShot(LOGO_SOUND_ID, '/audio/lugnuts-logo-bat-sound.mp3')
updatePadStates()
