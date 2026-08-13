# Redding Lugnuts Soundboard — Claude Code Build Brief

## Project overview

A standalone, installable web app that acts as a game-day soundboard for the **Redding Lugnuts** (independent baseball team, Shasta Baseball League). Used trackside/in the dugout on a mix of phones, tablets, and laptops — often one-handed, often fast. After the first visit, every sound should be cached and fire with zero buffering or load delay.

## Reference material provided alongside this brief

- **AI Studio export** — treat as loose reference only (rough shape of a pad grid). It does not reflect the direction below and should be substantially overhauled, not preserved.
- **Team brand sheet** — uniform/colorway reference and the lugnut mascot mark.
- **Logo/lettering files** — the custom "Lugnuts" script wordmark and mascot mark, provided separately. These are locked as-is — do not redraw, reinterpret, or substitute a font for them.

---

## Tech stack

- Static site, no backend, no AI/API dependencies of any kind.
- Hosted on static hosting (Netlify/Vercel/Cloudflare Pages).
- PWA: service worker + Cache API precache all audio assets on first visit, so it plays offline-fast regardless of stadium wifi after that.
- Web Audio API for playback — not `<audio>` tags. Every clip is pre-decoded into memory on load so pads fire with zero per-tap latency.
- A `DynamicsCompressorNode` sits in the live playback chain as a limiter/safety net (see Volume Consistency below).

---

## Audio engine — three-lane playback model

| Lane | Behavior |
|---|---|
| **Pre-Game** | Exclusive — a new cue immediately cuts off whatever's currently playing in this lane. While active, **Walk-Up pads lock** (dimmed, non-interactive look). |
| **Walk-Up** | Exclusive — a new song immediately cuts off whatever's currently playing in this lane. While active, **Pre-Game pads lock** the same way. |
| **FX** | Always live, always layerable. Never cuts anything, never gets cut, never locks and is never locked by the other two lanes. Multiple FX (e.g. repeated air horn taps) stack freely. |

Tapping a locked pad should still fire a stub/toast callback rather than doing nothing — see toast copy below.

**Toast / alert copy** (style per the design direction, not a generic modal):
- "Walk-up songs are locked until the pregame track finishes."
- "Pregame is locked until the current walk-up song finishes."

---

## Volume consistency

1. **Offline loudness normalization** — every audio clip gets normalized to a consistent integrated loudness target (e.g. -16 LUFS) before it's added to the project. This happens at file-prep time, not at runtime.
2. **Runtime limiter** — the `DynamicsCompressorNode` mentioned above catches any peaks beyond that, so nothing distorts or blasts louder than the set ceiling even if a clip slips through step 1 un-normalized.

---

## Pad data model

Config-driven — one JSON/data file, not hardcoded markup, so adding or swapping a player's song later is a one-line edit:

```js
{
  id: 'walkup-07',
  label: 'Player Name',
  category: 'walkup', // 'pregame' | 'fx' | 'walkup'
  image: '/pads/walkup-07.jpg', // custom photo/graphic, optional
  audioFile: '/audio/walkup-07.mp3',
  hasAudio: true
}
```

Roughly: 4 Pre-Game pads, 10–12 FX pads, 18–20 Walk-Up pads. Pads with `hasAudio: false` render as a visibly distinct "coming soon" placeholder — not a dead or broken-looking button — since some walk-up songs aren't finalized yet.

---

## Player Detail Card (tap & hold on a Walk-Up pad)

A tap on a Walk-Up pad plays that player's song, as already specified. A **press-and-hold** (roughly 500-600ms) on the same pad instead opens a full detail card for that player — a separate gesture from tap, not an addition to it. Holding past the threshold should suppress the tap/play action entirely; this is "learn about the player," not "play their song AND show their card." A reference layout for this card has been provided alongside this brief — build to it as a real template, not a one-off static image, since every player gets their own instance of it populated with their own data.

**Content:**
- Player name, large, engraved-caps style matching the rest of the site's type treatment (wraps to two lines if needed)
- `#NN • POSITION` line (e.g. "#22 • 3RD BASE / SHORTSTOP")
- Four stat bars — Hitting, Baserunning, Defense, Arm Strength — each a horizontal gradient fill (cool-to-warm, blue through amber to cardinal) scaled to that stat's value
- Player photo: a large stylized portrait faded/blended into the panel's own grass-and-dirt texture on one side, paired with a sharper cutout photo (player in uniform) on the other
- A close control (X) in the corner

**Where it lives:** the card takes over the Walk-Up section's own footprint in place — the LED meter, clock, Pre-Game, and Ballpark FX rows stay visible and functional above it, per the reference layout. This is not a full-screen modal.

**Data model additions** — each Walk-Up pad's config needs a few new fields beyond what's already defined:
```js
{
  id: 'walkup-07',
  // ...existing fields...
  position: '3RD BASE / SHORTSTOP',
  stats: { hitting: 72, baserunning: 58, defense: 81, armStrength: 65 }, // 0-100 scale
  detailPhoto: '/players/walkup-07-detail.jpg' // separate, higher-res than the small pad ID-window photo
}
```

---

## Visual design direction — "PA Control Panel"

The interface should read as an actual stadium PA operator's control board, not a webpage with a baseball theme layered on. This is the single aesthetic thesis — every choice below should serve it.

**Color** (brand-locked colors flagged; don't drift from the hex values):
- `#0D0D0D` Panel Black — base
- `#BB0004` Cardinal — *brand-locked*, primary accent
- `#AFAFAF` Iron Grey — *brand-locked*, structural/brushed-metal surfaces
- `#F2A93B` Warning Amber — playing/alert states
- `#4CAF7D` Indicator Green — used sparingly, subtle "ready" state only
- `#EDEAE1` Bone White — text/labels (softer than pure white against the black panel)

**Type:**
- Display — a heavy, industrial stencil-adjacent condensed face for panel labels and section headers. Used with restraint (headers/category labels), not for everything.
- Body — a clean, highly legible grotesque for pad labels/player names. This needs to read instantly at a glance mid-game — not the place for character-heavy type.
- Utility — small stencil caps or a monospace for meta text (pad counts, "LOCKED", category eyebrows).

**Layout:**
- Category selector styled as physical toggle switches or channel selectors — not generic tabs.
- Pads are chunky buttons with riveted/metal-edge framing, arranged in a grid.
- Each pad has a small "ID window" cutout for the custom photo/graphic (like a label window on real AV gear), with the label reading like an engraved caption beneath it.
- Each pad carries an LED-style state indicator: dim when idle, amber pulse when locked, lit solid/animated when playing.

**Signature element (spend the boldness here, keep everything else disciplined around it):**
- A small analog VU-meter needle (SVG, animated swing) pinned to the corner of whichever pad is currently playing. A canned swing loop is the expected default — doesn't need to be truly audio-reactive.
- Pressing a pad plays a real toggle-switch "click" — a snappy depress animation, not a generic button-press fade.

**Pad states to design explicitly:** Idle · Hover/focus (desktop) · Pressed · Now Playing (VU needle active) · Locked/disabled (dimmed + toast on tap) · Coming soon (no audio assigned yet).

**Responsive:** Handled by the fixed-canvas + scale-transform system below, not by reflowing or stacking sections — see "Visual architecture — knockout art + scaled scene." The panel is designed once at a fixed resolution and scales as a single proportional unit to whatever screen it's on, phone through laptop.

**Explicitly avoid the generic AI-design defaults:** no cream-background/serif/terracotta-accent look, no near-black-with-single-neon-accent tech look, no hairline-rule broadsheet layout. The palette and type roles above are specified — follow them, don't drift toward a default template.

Respect basic quality floor regardless of how playful this gets: responsive down to mobile, visible keyboard focus states, reduced-motion preference respected (VU needle/click animations should degrade gracefully, not vanish entirely, when reduced motion is set).

---

## Visual architecture — knockout art + scaled scene

This is how the PA Control Panel actually gets built. It's not a theoretical pattern — it's proven out in production on a working reference (a vintage radio receiver player at radio.jacewonmusic.com/player/), which this section is based directly on.

**1. Fixed design canvas.** The whole panel is designed and built against one fixed resolution: **2048×1536px, landscape.** Every coordinate — every pad's position, every cutout, every hit target — is measured in that fixed canvas's own pixel space, never against the runtime viewport.

**2. Scale-transform for responsiveness.** A single function computes `scale = Math.min(viewportWidth / canvasWidth, viewportHeight / canvasHeight)` and applies `transform: scale(scale)` to the canvas wrapper, recalculated on resize. This is the entire responsive strategy for the panel — one composition, scaled as a unit to fit phone through laptop. No separate art, no separate layout, no breakpoints for the panel itself.

**3. Knockout faceplate art.** The static illustrated panel — bezel, rivets, LED strip, category dividers, mascot badge, clock housing, every pad's frame — is a single PNG with true alpha-transparent cutouts everywhere dynamic content needs to show through: each pad's photo window, each pad's label area (if styled as engraved-through-the-metal rather than printed on top), the clock digits, each LED dot. Export at 2x–3x the canvas's design resolution for sharpness on high-density screens. Keep cutout edges hard, not feathered — clean edges keep pixel alignment simple and avoid halo artifacts from anti-aliasing at scale.

**4. Z-index stack, back to front:**
- **Dynamic layer** — pad photos, live text (jersey number/name/custom title), the animated clock, animated LED dots, VU-style meters. Positioned absolutely using the fixed-canvas coordinates.
- **Knockout faceplate PNG** — sits on top, `pointer-events: none` so clicks pass through to whatever's beneath it. Visually this layer covers everything except its cutouts, so the dynamic layer only ever shows through those holes.
- **Invisible hit-target layer** — transparent, absolutely-positioned click targets on top of everything, matched to each pad/control's real clickable area. What's visually rendered there is the layers underneath; this layer only handles input.

**5. One coordinate table drives all three layers.** Every dynamic element gets an entry — `id, x, y, w, h` in the fixed canvas's pixel space — used to position its live content on the dynamic layer, its cutout on the art, and its hit target on the click layer. This extends the pad config schema already defined above: each pad gains an `art: {x, y, w, h}` field, plus separate entries for label/LED position if those aren't simply centered within the pad's own box. **The current coordinate table for the first delivered art pass (`lugnuts-soundboard-coordinates.json`) is provided alongside this brief** — 6 top slots (2 Pre-Game: "Take the Field," "Change Sides"; 4 Ballpark FX: "Let's Go Organ," "Charge Organ," "Crowd Cheer," "Crowd Upset") plus the 18-slot Walk-Up grid, now populated with the real roster (15 players filled, 3 trailing slots marked `hasAudio: false` as open roster spots). Treat it as the current source of truth for both the art file and the roster; regenerate it if either changes.

**LED indicators are painted, not cutout.** Every pad/card has a small bezel painted into the art (pill-shaped on Walk-Up pads, circular on Pre-Game/FX cards) in its unlit state — there's no alpha window for these. The "lit" state is a CSS glow effect (same duotone/glow technique from the state-overlay work above) drawn on top at the `led` coordinates in the coordinate file, not content shown through a hole. Those LED coordinates are measured/approximate rather than alpha-verified — good enough to build against, but re-measure if the art's LED bezels get more sharply defined later.

**Why this replaces per-device art or breakpoints:** the fixed-canvas + scale-transform approach scales the whole composition proportionally to any screen, so there's no need to design separately for a specific iPad, phone, or laptop — one canvas, one coordinate table, scaled as a unit everywhere it runs.

**Where the earlier state-overlay techniques fit in:** the duotone color reveal, amber glow, and burst-pulse effects already prototyped still apply exactly as described — they're CSS/JS effects living on the dynamic and hit-target layers, layered on top of the real illustrated art. What changes is only the base panel texture itself: real illustration instead of CSS-simulated metal.

---

## Suggested build order

1. **Knockout faceplate art + coordinate table** — produce the static illustrated panel with every cutout in place, and the coordinate table mapping each cutout to its dynamic element (see "Visual architecture" above).
2. **Scene scaffold + static pad layer** — wire up the fixed-canvas/scale-transform system, the dynamic layer, and the hit-target layer, positioned from the coordinate table, using dummy data and stubbed click handlers. Get this right before wiring real behavior.
3. **Audio engine** — Web Audio playback, the three-lane lock logic, real pad config wired to actual files as they're delivered.
4. **PWA layer** — service worker, Cache API precaching, offline behavior.
5. **Normalization pass** — as real audio clips come in, run the loudness-normalization step before they're added to the project.

---

## What NOT to do

- Don't invent different lane/lock rules than the ones specified above.
- No backend, no API calls, no AI/Gemini features — pure static frontend.
- Don't reinterpret or redraw the Lugnuts wordmark/mascot — use the supplied files as-is.
- Don't let the "PA control panel" concept stay vague/moodboard-y — anchor every element (toggle switches, ID windows, VU needle, click sound-alike animation) to the actual physical object it's referencing.
- Don't hardcode any dynamic element's position in component code — every number/label/photo/LED/clock position comes from the coordinate table, so the art can be revised later without hunting through code for magic-number offsets.

---

## Assets to be supplied separately

- Logo/lettering files (script wordmark + mascot mark)
- Knockout faceplate PNG(s) (2x–3x resolution, true alpha transparency in every cutout) plus the coordinate table for every cutout
- Full roster + walk-up song audio files (as they're finalized)
- Pre-Game and Ballpark FX audio clips
