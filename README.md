# 清明河畔 · Qingming Riverside

A living 3D ancient Chinese riverside-city exploration game inspired by **《清明上河圖》**. This is an educational interpretation rather than an exact historical reconstruction.

## Features

- First-person exploration with an animated river, boats, market stalls, bridge, city gate, tea house, medicine shop, dock, residential alley, animals and ambient citizens
- Desktop controls: **WASD / arrow keys**, mouse look, **Shift** to run, **E** to interact, **I** inventory, **Q** quests, **Esc** pause
- Mobile and iPad controls: virtual joystick, swipe camera, run/interact buttons and landscape layout
- 10 named NPCs plus ambient walkers
- Main mission: **失蹤的商業帳簿 / The Missing Ledger**
- Three side missions: fisherman’s basket, medicine delivery and the lost child
- 11 bilingual historical information cards
- Inventory, quest tracker, dialogue, settings, accessibility options and localStorage save/continue
- Procedural textures and procedural WebAudio, so the game does not depend on external art or sound files

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite.

## Production check

```bash
npm ci
npm run build
npm run preview
```

## Technology

- Three.js
- TypeScript
- Vite

## Project structure

```text
src/
  audio/         Procedural ambience and sound effects
  core/          Game loop, input, settings, save system and runtime hardening
  data/          NPC, dialogue, item, quest and historical content
  interaction/   Doors, inspection points, pickups and raycast interaction
  inventory/     Inventory state
  npc/           NPC models, animation and dialogue logic
  player/        First-person controller
  quests/        Quest and history progression
  ui/            Desktop/mobile interface
  utils/         Event bus, maths and procedural textures
  world/         City, buildings, collision and water
```

## Notes

Progress is saved in the browser using `localStorage`. For the best experience, use a recent WebGL-capable browser and play on mobile in landscape orientation.
