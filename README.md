# Lugnuts Soundboard

A game-day soundboard PWA for the Redding Lugnuts (Shasta Baseball League). Built as a fixed-canvas illustrated control panel — pregame cues, ballpark FX, and walk-up songs — that scales as a single unit from phone to laptop, with everything pre-decoded through the Web Audio API for zero-latency taps and cached offline after first visit.

## How it plays

- **Walk-up songs** are mutually exclusive — starting one cuts off whatever other walk-up song is playing. Retriggering the same one restarts it (a soundboard trigger, not a play/stop toggle).
- **The whole top row** (pregame cues + ballpark FX) is independent of everything — each pad is its own trigger that never cuts, and is never cut by, anything else, including a playing walk-up song. Any number of top-row pads can run at once.
- **Crowd Cheer / Crowd Upset** fade in over 500ms instead of starting abruptly; every other pad starts instantly.
- **Hold** a walk-up pad (~550ms) to open that player's detail card, if one's been delivered — otherwise a toast lets you know it's not ready yet.
- **STOP ALL** kills every currently playing sound. **Fullscreen** (top right, iPadOS Safari 16.4+) hides itself once engaged, relying on the browser's own exit control from there.

## Stack

- Vite, vanilla JS (no framework) — `src/main.js` builds the DOM directly from the coordinate table.
- Web Audio API — every clip is fetched once and decoded to an `AudioBuffer` on load (`src/audio/engine.js`), so playback is always a zero-latency `BufferSource` start. A `DynamicsCompressorNode` sits after every source as a runtime limiter.
- `vite-plugin-pwa` — precaches the full app shell plus every audio/art asset for offline play after first visit.

## Architecture: fixed canvas + coordinate table

The whole panel is one illustrated 2048×1536 PNG (`public/art/panel-primary.png`) with real alpha-transparent cutouts only where dynamic content (top-row pad photos) shows through. Everything else — walk-up numbers/names, LEDs, the clock, the master meter — renders as live text/elements positioned on top, using pixel coordinates from `src/data/coordinates.json`.

A single `scale = min(viewportW / 2048, viewportH / 1536)` transform scales the whole composition as one unit to fit any screen — no responsive breakpoints. `public/art/panel-bg.png` is a wider version of the same art (extra grass bled onto the sides) that sits behind the canvas at the same scale, so any leftover space on a non-4:3 screen fills with matching background instead of a flat bar.

Where the delivered coordinate table doesn't cover something (the mascot badge, STOP ALL, the fullscreen plate, the player card's close button), `src/ui/coordinates.js` derives or pixel-measures it directly off the art, with a comment noting how. Small per-element visual corrections (nudges) live there too as named constants layered on top of the table, rather than edits to the table itself.

## Content model

`src/data/pads.js` is the single source of truth for playback config — joins the coordinate table (art positions) with audio files, roster data, and behavior flags (`layered`, `fadeInMs`, `cardImage`). Adding or swapping a real asset is a one-line edit to one of the filename maps in that file:

- `AUDIO_FILENAMES` — maps a pad id to its delivered audio filename in `public/audio/`
- `CARD_IMAGES` — maps a walk-up pad id to its delivered Player Detail Card PNG in `public/players/`
- `FADE_IN_MS` — which top-row pads ramp in instead of starting instantly

Walk-up roster slots with no `hasAudio` yet render as fully blank, non-interactive art (no number, no name, no hit target) until a real song is assigned.

## Local development

```bash
npm install
npm run dev      # dev server
npm run build    # production build to dist/
npm run preview  # serve the production build locally
```

## Deployment

Pushes to `main` auto-deploy via Vercel (connected to this repo) — no custom domain needed, Vercel provides a live URL at the project's root.

## Repo layout

```
src/
  main.js              — builds the DOM, wires gestures/audio to the UI
  audio/engine.js       — Web Audio playback engine (lanes, fades, limiter, one-shots)
  data/pads.js           — pad config (source of truth for content)
  data/coordinates.json  — delivered art coordinate table
  ui/coordinates.js       — derives/measures rects not in the table, applies nudges
  ui/clock.js, meter.js, toast.js — small focused UI helpers
public/
  art/       — panel PNGs (primary, wide background)
  audio/     — delivered audio clips (normalized to -16 LUFS)
  pads/      — top-row pad photo/graphic overlays
  players/   — Player Detail Card PNGs
_resources/  — original delivered assets and the initial build brief (historical reference)
```
