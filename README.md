# devlife

[![devlife](docs/banner_1280x640.png)](https://deflife.vercel.app)

Cuộc sống từ sinh viên IT đến khi trở thành super senior siêu cấp vip pro plus promax ultra fullhd limited

A cozy isometric 3D developer life-sim for the web: decorate your room as you grow from **student → junior → senior** developer. Play at [deflife.vercel.app](https://deflife.vercel.app).

## Run locally

```bash
pnpm install
pnpm assets          # cut character sprites + build texture atlas (committed outputs included)
pnpm dev             # http://localhost:4317
```

Other commands:

| Command | Purpose |
|---------|---------|
| `pnpm typecheck` | TypeScript |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest unit tests |
| `pnpm test:e2e` | Playwright (starts dev server) |
| `pnpm assets:check` | Regenerate atlas + validate content |
| `pnpm build && pnpm start` | Production build |

## Milestone 1

- **Rendering:** React Three Fiber — isometric orthographic room in a fixed 4:3 well, data-driven GLB manifest (`src/game3d`).
- **State:** Zustand + `localStorage` (`devlife:v1`), per-stage loadouts.
- **UI:** Customize panel in the sidebar block (docked ≥1280px, stacked below on mobile).

### Debug overlay

Add `?debug=1` to the URL (or press **D**) for the debug shell: orbit camera controls, the room label, the skills card, and the time debug panel.

Dev-only button specimen route: `/debug/buttons`.

### Asset pipeline

```
public/assets/          Source art (rooms, furniture v2, character sheet)
public/atlas/           Generated sprite atlas (devlife.png + devlife.json)
public/assets/character/derived/   Chroma-cut poses (pnpm assets:cut)
scripts/assets/         cut-character.ts, build-atlas.ts, validate.ts
```

Reference renders: `docs/art/expected_*.png` (from `docs/tools/render_preview.py`).

Planning doc: [`docs/PLAN.md`](docs/PLAN.md). Art backlog: [`docs/ART_TODO.md`](docs/ART_TODO.md).

## Folder map

```
src/game/           config, content JSON, life logic, state store
src/game3d/         R3F room (Scene3D, RoomShell, Furniture, Player, manifest)
src/components/     GameShell, SceneCard, CustomizePanel, shadcn/ui
app/                Next.js App Router pages
tests/              unit + e2e
```

Deploys on Vercel with no extra config (static assets + client bundle).
