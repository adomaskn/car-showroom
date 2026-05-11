# AGENTS.md

Guidance for coding agents working in this repository.

## Mission

Maintain and improve the 3D car showroom with stable behavior, clean visuals, and fast iteration.

## Current Stack

- Vite + Three.js
- Vanilla JS modules
- Single-page app rendered into `index.html`

## Core Files

- `src/main.js`: 3D scene setup, loading, lighting, animation, controls
- `src/style.css`: UI overlays and page-level styling
- `index.html`: canvas and overlay DOM
- `public/models/cars/car.glb`: default car asset path

## Development Rules

1. Keep the app runnable with:
   - `npm run dev`
   - `npm run build`
2. Preserve model loading from `/models/cars/car.glb` unless explicitly changing requirements.
3. Avoid breaking OrbitControls interactions.
4. Prefer incremental visual changes over large rewrites.
5. Keep runtime dependencies minimal.

## Editing Expectations

1. Before major refactors, document intent in PR/commit notes.
2. If changing model path conventions, update README in same change.
3. When adding new overlays/UI, keep canvas unobstructed on mobile.
4. Preserve accessibility basics for interactive UI (visible labels, focusable controls where relevant).

## Validation Checklist

After code changes, run:

```bash
npm run build
```

Manual checks:
1. Scene renders without console errors.
2. Car model loads and appears centered.
3. Platform rotation works.
4. Camera orbit/zoom works.
5. Home button is visible and link works.

## Performance Notes

- Three.js bundle size warning is acceptable for now.
- Prefer texture optimization and asset-size reductions before code-splitting complexity.

## Safe Change Areas

- Lighting and material tuning in `src/main.js`
- UI polish in `src/style.css`
- Additional static assets under `public/`

## Risky Change Areas

- Render loop structure
- Camera/control constraints
- GLTF loading and transform normalization logic

## If You Add Features

When adding features (paint selector, car switching, environment controls), include:
1. A minimal default state that does not break current flow.
2. README updates for usage.
3. Build verification results in change notes.