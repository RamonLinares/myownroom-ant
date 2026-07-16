# My Own Room (Ant edition)

A cozy 3D room-decoration game for the browser, built from scratch with Three.js + TypeScript + Vite.
It is an independent reimplementation inspired by the original `MyOwnRoom` project.

## Play

```bash
npm install
npm run dev      # http://127.0.0.1:5190
```

`npm run build` produces a static production bundle in `dist/` (relative base path, host anywhere).

## Features

- **Catalog** of 71 procedurally modeled pieces across 11 categories (seating, beds, tables, storage, workspace, decor, toys, lighting, plants, rugs, wall art), each with live-rendered 3D thumbnails, plus live search across all categories.
- **Arrange**: drag furniture on the floor, drag wall art along the walls, rotate (buttons or `Q`/`E`), flip/mirror (button or `F` — swap a door's handle side or a corner sofa's chaise), resize (slider or `[`/`]`), recolor with per-item swatch palettes, re-dress with **material finishes** (fabric / leather / wood / plain / metal, per item), duplicate (`D`), remove (`Del`).
- **Stacking**: small items (lamps, plants, books, vases) drop onto tabletops, shelves and dressers exactly where you point; moving a table carries everything on it.
- **Room size & shape**: the 🏠 panel offers rectangle, L, T, and U floor plans plus width/depth sliders (6–14 m × 5–12 m), **wall finishes** (paint, stripes, polka dots, sprig wallpaper) and **floor finishes** (planks, chevron parquet, tiles, carpet) — each tintable with palette swatches or a free color picker. Walls are rebuilt from the floor plan and rendered single-sided, so the camera can orbit the room fully — near walls vanish, dollhouse style. Furniture re-fits itself and wall decor re-snaps to the nearest wall when the plan changes.
- **Lighting moods**: day / sunset / night presets; lamps cast real warm light pools at night.
- **Walk mode**: first-person stroll through your room at eye height — WASD/arrows + drag-to-look on desktop, dual-thumb controls (left joystick, right look) on touch, with furniture collision and a subtle head bob. `Esc` or the door button exits.
- **Lock mode**: the 🔓/🔒 button freezes the room — nothing can be selected, moved, added, or deleted (walking, interactions, moods, and photos still work). The lock persists with the save, so a finished room stays finished.
- **Go there**: double-click (or double-tap) any open patch of floor — in edit mode the camera pans to center on it; in walk mode you glide over to stand there.
- **Walk interactions**: tap furniture within reach — lamps, fairy lights, screens, and appliances toggle on/off; radios and record players play a tune; clocks chime; the music box twinkles; plants rustle; toys squeak; rocking chairs rock; doors answer with a knock. Everything else gives a friendly poke.
- **Photography**: the camera button (or `P` while walking) captures a framed photo with a flash and shutter sound; save it as a timestamped PNG from the polaroid preview.
- **Persistence**: the room auto-saves to `localStorage` and restores on reload; a starter room greets first-time visitors. The 🏠 panel also offers **Save room / Load room** — export the whole room (layout, finishes, mood) as a JSON file and import it on any device or browser.
- **Feedback**: procedural WebAudio chirps for select/place/remove (mutable), pop-in tweens, pulsing selection ring.
- **Mobile**: pointer-event input, bottom-sheet catalog, safe-area-aware HUD.

## Architecture

```
src/
  main.ts            bootstrap
  core/audio.ts      tiny WebAudio synth for UI/gameplay feedback
  assets/materials.ts procedural canvas textures + shared material helpers
  assets/catalog.ts  item definitions + procedural model factories
  game/room.ts       room shell (floor, walls, window, baseboards)
  game/state.ts      save/load schema (localStorage, versioned)
  game/game.ts       scene, camera, selection, drag/stack/wall placement, moods, tweens
  ui/thumbs.ts       offscreen renderer for catalog thumbnails
  ui/ui.ts           catalog panel, inspector, top bar, hints, toasts, shortcuts
```

Diagnostics are exposed at `window.__THREE_GAME_DIAGNOSTICS__` (item count, selection, mood, renderer counters); the game instance is exposed as `window.__game` in dev builds only.
