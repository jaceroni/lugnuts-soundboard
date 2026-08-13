// Config-driven pad roster, derived from the coordinate table
// (coordinates.json) that is the source of truth for both the art and the
// roster. Playback-specific fields (audio path, stats, bio) live here;
// position-on-the-panel fields live in the coordinate table — see
// src/ui/coordinates.js for how the two get joined at render time.
//
// Shape:
// {
//   id: string
//   label: string
//   category: 'pregame' | 'fx' | 'walkup'
//   audioFile: string | null
//   hasAudio: boolean        — false renders the "coming soon" placeholder state
//   layered: boolean         — true means it never cuts and is never cut by
//                              anything else, including retriggering itself
//                              (restarts, doesn't stack). The whole top row
//                              (pregame + fx) is layered against everything;
//                              only walkup songs are mutually exclusive.
//   image: string | null     — pregame/fx only: optional photo/graphic for the ID window
//   fadeInMs: number         — pregame/fx only: ramps in from silence over this
//                              many ms instead of starting instantly; 0 = no fade
//   jerseyNumber: string | null   — walkup only
//   cardImage: string | null      — walkup only, the Player Detail Card's pre-designed
//                                    flattened graphic (own close X baked in); holding a
//                                    pad with no cardImage just shows a "not ready" toast
// }

import coordinates from './coordinates.json'

function categoryFor(id) {
  if (id.startsWith('pregame')) return 'pregame'
  if (id.startsWith('fx')) return 'fx'
  return 'walkup'
}

// Delivered audio keeps its own descriptive filename rather than being
// renamed to match the pad id, so this is a one-line edit per delivered
// clip. Anything not listed here falls back to the `${id}.mp3` placeholder
// path until its real file shows up.
const AUDIO_FILENAMES = {
  'pregame-01': 'lugnuts-intro-take-the-field.mp3',
  'pregame-02': 'lugnuts-organ-change-sides.mp3',
  'fx-01': 'lugnuts-organ-lets-go.mp3',
  'fx-02': 'lugnuts-organ-charge.mp3',
  'fx-03': 'lugnuts-crowd-cheer.mp3',
  'fx-04': 'lugnuts-crowd-upset.mp3',
  'walkup-02': 'lugnuts-walkups-jace.mp3',
  'walkup-08': 'lugnuts-walkups-patrick.mp3',
}

function audioFileFor(id) {
  return `/audio/${AUDIO_FILENAMES[id] ?? `${id}.mp3`}`
}

// Crowd cheer/upset start abruptly otherwise — a short fade-in softens the
// hit. Every other top-row pad still starts instantly.
const FADE_IN_MS = {
  'fx-03': 500,
  'fx-04': 500,
}

// One-line-per-player as real card art gets delivered.
const CARD_IMAGES = {
  'walkup-02': '/players/walkup-02-card.png',
  'walkup-08': '/players/walkup-08-card.png',
}

const topRowPads = coordinates.topRow.map((slot) => ({
  id: slot.id,
  label: slot.label,
  category: categoryFor(slot.id),
  image: `/pads/${slot.id}.png`,
  audioFile: audioFileFor(slot.id),
  hasAudio: true,
  layered: true,
  fadeInMs: FADE_IN_MS[slot.id] ?? 0,
}))

const walkupPads = coordinates.walkups.map((slot) => ({
  id: slot.id,
  label: slot.label,
  category: 'walkup',
  audioFile: slot.hasAudio ? audioFileFor(slot.id) : null,
  hasAudio: slot.hasAudio,
  layered: false,
  jerseyNumber: slot.jerseyNumber,
  cardImage: CARD_IMAGES[slot.id] ?? null,
}))

export const pads = [...topRowPads, ...walkupPads]
