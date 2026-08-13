import coordinates from '../data/coordinates.json'

export const CANVAS = coordinates.canvas
export const MASTER_METER = coordinates.masterMeter
export const CLOCK = coordinates.clock
export const STOP_ALL = coordinates.controls.stopAll

// No coordinate table entry for the mascot badge either — measured
// directly off the art (it's the circular "REDDING LUGNUTS" badge, top
// left of the panel).
export const LOGO = { x: 18, y: 18, w: 260, h: 260 }

// The blank plate to the right of STOP ALL (screwed-down bezel, no baked
// label) — measured off the art the same way. Repurposed as the fullscreen
// toggle since it wasn't doing anything.
export const FULLSCREEN_PLATE = { x: 1622, y: 62, w: 376, h: 152 }

const topRowById = new Map(coordinates.topRow.map((slot) => [slot.id, slot]))
const walkupById = new Map(coordinates.walkups.map((slot) => [slot.id, slot]))

export function slotFor(pad) {
  return pad.category === 'walkup' ? walkupById.get(pad.id) : topRowById.get(pad.id)
}

// Walkup rows sit almost flush against each other (the nameBar of one row
// ends only ~1px above the next row's number), so the full number+nameBar
// height leaves the hit target's focus/hold outline bleeding into the row
// below. Trimmed off the bottom rather than shrinking from the top, so the
// number/name area itself stays fully covered.
const WALKUP_HIT_HEIGHT_TRIM = 20
const WALKUP_HIT_X_NUDGE = -2

// The click/tap surface for a pad — needs to cover the whole visual
// button, not just the photo window. topRow pads span from the art window
// down through the caption plate beneath it; walkup pads use the union of
// their number + nameBar rects (there's no single "whole base" rect in
// the coordinate table, so both are derived from the rects that are).
export function hitRectFor(pad) {
  const slot = slotFor(pad)
  if (pad.category === 'walkup') {
    const { number, nameBar } = slot
    const h = nameBar.y + nameBar.h - number.y - WALKUP_HIT_HEIGHT_TRIM
    return { x: number.x + WALKUP_HIT_X_NUDGE, y: number.y, w: number.w, h }
  }
  const { art } = slot
  const caption = captionRectFor(pad)
  return { x: art.x, y: art.y, w: art.w, h: caption.y + caption.h - art.y }
}

// Visual nudges called out after eyeballing the live render against the
// bases — corrections layered on top of the delivered coordinate table
// rather than edits to it, so the table stays a clean re-export target if
// the art/coordinates ever get regenerated.
const NUMBER_Y_NUDGE = 12
const NAME_Y_NUDGE = -23
const CLOCK_X_NUDGE = 10
const CLOCK_Y_NUDGE = 29
const LED_ROUND_NUDGE = { x: -2, y: -5 } // pregame/fx (circular LEDs)
const LED_PILL_NUDGE = { x: -3, y: 0 } // walkup (pill LEDs)

// Per-pad corrections on top of the round-LED base nudge above — some
// pads' painted bezels sit slightly off from the rest of the row.
const LED_ROUND_EXTRA_NUDGE = {
  'pregame-01': { x: 2, y: 0 }, // Take the Field
  'pregame-02': { x: 1, y: 0 }, // Change Sides
}

export function numberRectFor(pad) {
  const { number } = slotFor(pad)
  return { ...number, y: number.y + NUMBER_Y_NUDGE }
}

export function nameRectFor(pad) {
  const { nameBar } = slotFor(pad)
  return { ...nameBar, y: nameBar.y + NAME_Y_NUDGE }
}

export function ledRectFor(pad) {
  const { led } = slotFor(pad)
  const nudge = pad.category === 'walkup' ? LED_PILL_NUDGE : LED_ROUND_NUDGE
  const extra = LED_ROUND_EXTRA_NUDGE[pad.id] ?? { x: 0, y: 0 }
  return { ...led, x: led.x + nudge.x + extra.x, y: led.y + nudge.y + extra.y }
}

export function clockRect() {
  return { ...CLOCK.housing, x: CLOCK.housing.x + CLOCK_X_NUDGE, y: CLOCK.housing.y + CLOCK_Y_NUDGE }
}

// The topRow art pass didn't bake each pad's own caption ("TAKE THE FIELD",
// etc.) into the art like it did the PRE-GAME/BALLPARK FX section headers —
// only the plate is there, so the label renders as live text on top of it.
// No coordinate exists for that plate either; derived from the art rect's
// own position with a measured gap/height (see main.js call site).
const CAPTION_GAP = 20
const CAPTION_HEIGHT = 40

export function captionRectFor(pad) {
  const { art } = slotFor(pad)
  return { x: art.x, y: art.y + art.h + CAPTION_GAP, w: art.w, h: CAPTION_HEIGHT }
}

// Bounding box of the whole Walk-Up section, derived from every walkup
// slot's own rects (the table has no standalone "section frame" entry).
export function walkupSectionBounds() {
  const slots = coordinates.walkups
  const minX = Math.min(...slots.map((s) => s.number.x))
  const maxX = Math.max(...slots.map((s) => s.number.x + s.number.w))
  const minY = Math.min(...slots.map((s) => s.number.y))
  const maxY = Math.max(...slots.map((s) => s.nameBar.y + s.nameBar.h))
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

// No coordinate is supplied for the detail card's close control either, so
// it's pinned to the top-right corner of the derived Walk-Up section bounds
// with one shared inset constant, rather than a one-off magic number.
const CLOSE_BUTTON_SIZE = 56
const CLOSE_BUTTON_MARGIN = 24

export function closeButtonRect() {
  const bounds = walkupSectionBounds()
  return {
    x: bounds.x + bounds.w - CLOSE_BUTTON_MARGIN - CLOSE_BUTTON_SIZE,
    y: bounds.y + CLOSE_BUTTON_MARGIN,
    w: CLOSE_BUTTON_SIZE,
    h: CLOSE_BUTTON_SIZE,
  }
}

// Pre-designed player card graphics (pad.cardImage) are delivered as a
// single flattened, fully-opaque PNG — full canvas width, anchored to the
// bottom edge — with their own close X already drawn into the art rather
// than rendered as a separate element. The delivered size (2048x863) is
// the working assumption until a differently-sized one shows up.
const PLAYER_CARD_IMAGE_SIZE = { w: 2048, h: 863 }

// Measured directly off the delivered PNG (see _resources) — there's no
// coordinate table entry for it since it's baked into the per-player art,
// not a dynamic overlay. Local to the image's own top-left corner.
const PLAYER_CARD_CLOSE_LOCAL = { x: 1837, y: 48, w: 95, h: 92 }

export function playerCardImageRect() {
  return { x: 0, y: CANVAS.h - PLAYER_CARD_IMAGE_SIZE.h, w: PLAYER_CARD_IMAGE_SIZE.w, h: PLAYER_CARD_IMAGE_SIZE.h }
}

export function playerCardCloseRect() {
  const card = playerCardImageRect()
  return {
    x: card.x + PLAYER_CARD_CLOSE_LOCAL.x,
    y: card.y + PLAYER_CARD_CLOSE_LOCAL.y,
    w: PLAYER_CARD_CLOSE_LOCAL.w,
    h: PLAYER_CARD_CLOSE_LOCAL.h,
  }
}

export function rectStyle(rect) {
  return `left:${rect.x}px; top:${rect.y}px; width:${rect.w}px; height:${rect.h}px;`
}
