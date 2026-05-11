# Car Showroom

A game-inspired 3D car showroom built with `Three.js` and `Vite`.

The app loads a car model (`.glb`) into a stylized garage scene with:
- A rotating platform
- Soft showroom lighting and shadows
- A curved backdrop for depth
- Orbit camera controls for inspection
- A Home button linking to the main portfolio site

## Demo Features

- Real-time 3D rendering in browser (`WebGL`)
- GLB model loading via `GLTFLoader`
- Auto-centering and auto-scaling for imported car models
- Responsive canvas that adapts to viewport size

## Tech Stack

- `Vite`
- `Three.js`
- Vanilla JavaScript (ES modules)
- CSS

## Project Structure

```text
car-showroom/
  public/
    models/
      cars/
        car.glb
  src/
    main.js
    style.css
  index.html
  package.json
  README.md
```

## Requirements

- `Node.js` 18+ (recommended latest LTS)
- `npm` 9+

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Open the local URL shown in terminal (usually `http://localhost:5173`).

## Car Model Setup

Place your model at:

`public/models/cars/car.glb`

Notes:
- `.glb` is preferred because it bundles mesh, materials, and textures into one file.
- The scene expects the filename `car.glb` by default.
- If your model uses very large scale, the loader normalizes size automatically.

## Available Scripts

- `npm run dev`: Start local dev server
- `npm run build`: Create production build in `dist/`
- `npm run preview`: Preview production build locally

## Showroom Controls

- Left mouse drag: Orbit camera
- Scroll wheel: Zoom in/out
- Right mouse drag (or equivalent): Pan

## Customization Guide

- Change model path: update `modelPath` in `src/main.js`
- Adjust platform rotation speed: edit `turntableGroup.rotation.y += ...` in `src/main.js`
- Tweak lighting mood: update light colors/intensities in `src/main.js`
- Update Home button URL/style: edit `index.html` and `src/style.css`

## Troubleshooting

- Model not visible:
  - Confirm file exists at `public/models/cars/car.glb`
  - Check browser console for loading errors
  - Verify model exports correctly from your DCC tool

- Scene is dark:
  - Increase key/fill light intensity in `src/main.js`

- Build warning about chunk size:
  - Current warning is expected for `three.js` in a small single-bundle app.

## Deployment

This project can be deployed to GitHub Pages or any static host.

Basic flow:
1. Run `npm run build`
2. Deploy the `dist/` directory as static assets

## Roadmap Ideas

- Garage environment presets (day/night/studio)
- Wheel and paint customization UI
- Multiple car selection
- Postprocessing effects (bloom, vignette, SSR alternatives)

## License

No license specified yet. Add one if you plan to distribute publicly.