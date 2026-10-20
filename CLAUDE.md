# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**devlife** is a cozy 2D pixel-art developer life simulator built for the web. Players progress from student → junior → senior developer while decorating their room and managing their career, skills, and daily life.

- **Tech Stack**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, Zustand (state), Canvas2D (rendering)
- **UI Components**: shadcn/ui with Radix UI primitives
- **Testing**: Vitest (unit), Playwright (e2e)
- **Asset Pipeline**: Custom sprite atlas generation with texture packing
- **Port**: Development runs on `:4317` (both dev and production modes)

## Development Commands

```bash
# Core development
pnpm dev              # Start dev server at http://localhost:4317
pnpm build            # Production build
pnpm start            # Run production server at http://localhost:4317

# Quality checks
pnpm typecheck        # Run TypeScript compiler checks
pnpm lint             # Run ESLint
pnpm test             # Run Vitest unit tests
pnpm test:e2e         # Run Playwright e2e tests (starts dev server automatically)

# Asset pipeline
pnpm assets:cut       # Cut character sprites from sheet (chroma-key)
pnpm assets:atlas     # Build texture atlas from sprites
pnpm assets           # Run both cut + atlas
pnpm assets:check     # Regenerate atlas + validate content
pnpm audio:sprite     # Build audio sprite from sound effects

# Single test execution
pnpm test <filename>              # Run specific test file
pnpm test -t "test name pattern"  # Run tests matching pattern
```

## Architecture

### Core Game Systems

The game is built around several interconnected systems in `src/game/`:

- **state/** - Zustand store (`useGameStore`) managing all game state, persisted to localStorage as `devlife:v1`
- **time/** - Day/night cycle, clock, phase management (morning/work/evening/night), time advancement
- **career/** - Career progression, study actions, skill development
- **knowledge/** - Skill/knowledge system with XP, ranks, and level brackets
- **jobs/** - Job board, offers, eligibility, acceptance, and management
- **life/** - Life simulation: traits, furniture, placement, hunger, events, store purchases
- **events/** - Game event system and event handlers
- **task-run/** - Task execution and application layer
- **audio/** - Audio engine with sprite support, cues, and ambience
- **vitals/** - Character vitals (health, energy, etc.)

### Rendering Pipeline

- **Native resolution**: 427×240 pixels (logical canvas size defined in `src/game/config.ts`)
- **Upscaling**: Integer device-pixel upscale with nearest-neighbor sampling for crisp pixel art
- **Canvas2D rendering**: `src/game/render/canvasRenderer.ts` implements the renderer
- **Scene resolution**: `src/game/layout/resolveScene.ts` converts game state to drawable entries
- **Atlas system**: `src/game/render/atlas.ts` manages the sprite atlas
- **View computation**: `src/game/view/computeView.ts` calculates viewport and scaling
- **Debug overlay**: Add `?debug=1` to URL or press **D** to show anchors, baselines, and room bounds

### State Management Pattern

All game state lives in a single Zustand store (`src/game/state/store.ts`):

- State is normalized (IDs reference entities)
- Actions are defined as store methods
- State persists to localStorage
- Migration system in `src/game/storage/migrate.ts` handles version upgrades

### Component Structure

```
src/components/
  game/              Game-specific UI components
    GameShell.tsx    Main game layout container
    SceneCanvas.tsx  Canvas renderer component
    PlayerHudCard.tsx, PlayerInfoPanel.tsx  Player stats display
    CustomizePanel.tsx  Furniture customization
    NotificationsPanel.tsx  Game notifications
    career/          Career-related panels (Study, SkillRank, JobBoard, JobManage)
  ui/                shadcn/ui components (Button, Dialog, Tabs, etc.)
  terminal/          Terminal UI components
```

### Content & Configuration

- **src/game/config.ts** - Single source of truth for world dimensions, stages, and core constants
- **src/game/content/** - Game content data (items, rooms, layouts) loaded from JSON
- **src/game/content/schema.ts** - Zod schemas for content validation
- **Asset locations**: `public/assets/` (source art), `public/atlas/` (generated sprite atlas)

### Storage & Migration

- **Key**: `devlife:v1` in localStorage
- **Migration**: `migrateSave()` in `src/game/storage/migrate.ts` handles backward compatibility
- **Save structure**: Per-stage loadouts, career state, life state, time state

## Important Patterns

### When Working with Game State

Always use the Zustand store methods rather than direct state mutation:

```typescript
const { advanceTime, applyStudy, buyFurniture } = useGameStore();
```

### When Adding New Game Systems

1. Define types in `src/game/<system>/types.ts`
2. Implement logic in `src/game/<system>/logic.ts` or `actions.ts`
3. Add state slice to `src/game/state/store.ts`
4. Wire up to UI components in `src/components/game/`
5. Add tests in `tests/unit/<system>.test.ts`

### When Modifying Rendering

- Native coordinates are in the 427×240 grid
- All placement uses integer pixel coordinates
- Floor items use bottom-center anchor and are z-sorted by baseline y
- Wall items and rugs sit on fixed layers below floor objects
- Reference renderer: `docs/tools/render_preview.py` (Python) produces expected outputs in `docs/art/expected_*.png`

### Asset Pipeline Details

Character sprites are chroma-keyed from `public/assets/character/character_sheet.jpg` (magenta #D1115A background) and downscaled by factor 3.5 to produce 40×72 seated sprites.

Furniture sprites are packed into a texture atlas using `maxrects-packer`. The atlas build script is at `scripts/assets/build-atlas.ts`.

Source art lives in `public/assets/`, generated atlas outputs in `public/atlas/`. Committed outputs are included in the repo.

## Design System

- **UI Chrome**: Governed by `docs/design/DESIGN_SYSTEM.md` (Galmuri fonts, soft gradients)
- **Terminal UI**: Scoped exception documented in `docs/design/TERMINAL.md` (CRT aesthetic)
- **Fonts**: Galmuri 7, 9, and 11 loaded in `src/app/layout.tsx`
- **Theming**: Light/dark mode support with CSS custom properties

## Testing Strategy

- **Unit tests**: Game logic, state management, calculations (Vitest + jsdom)
- **E2E tests**: User flows, rendering validation (Playwright)
- **Test location**: `tests/unit/` and `tests/e2e/`
- **Coverage**: Run `pnpm test -- --coverage` for coverage report

## Key Documentation

- **docs/PLAN.md** - Milestone 1 implementation plan with detailed rendering specs
- **docs/systems/** - Individual game system documentation (buttons, jobs, knowledge)
- **docs/design/** - Design system and terminal UI specifications
- **docs/specs/** - Feature specifications and milestone plans

## Knowledge Graph Integration

This project uses graphify for codebase navigation. The knowledge graph is at `graphify-out/graph.json`.

Before searching raw files, query the graph:

```bash
graphify query "your question about the codebase"
graphify path "ComponentA" "ComponentB"    # Find relationships
graphify explain "concept"                  # Focused explanation
```

After code changes, update the graph:

```bash
graphify update .    # AST-only update, no API cost
```

## Common Tasks

### Adding a New Furniture Item

1. Add sprite PNG to `public/assets/furniture/<stage>/`
2. Define item in content JSON
3. Run `pnpm assets:atlas` to rebuild atlas
4. Add to furniture catalog in `src/game/life/content.ts`

### Adding a New Job

1. Define job data in `src/game/career/content.ts` (SIM_CATALOG)
2. Implement eligibility logic in `src/game/jobs/logic.ts`
3. Add offer generation logic in `src/game/jobs/offers.ts`
4. Wire up UI in `src/components/game/career/JobBoardPanel.tsx`

### Modifying Time System

- Clock logic: `src/game/time/clock.ts`
- Phase configuration: `src/game/time/config.ts`
- Event loop: `src/game/time/loop.ts`
- UI: `src/components/game/TimeDebugPanel.tsx`

### Adding Audio

1. Add sound file to `public/audio/`
2. Update `public/audio/manifest.json`
3. Run `pnpm audio:sprite` to rebuild sprite
4. Add cue definition in `src/game/audio/cues.ts`
5. Use via `useGameAudio()` hook

### Build check

Always run build command to check code build, then fix if error
