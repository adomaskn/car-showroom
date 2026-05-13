# Car Showroom

A game-inspired 3D car showroom built with `Three.js` and `Vite`, now with authenticated cloud model storage via Supabase.

## Highlights

- Upload `.glb` files from the web UI.
- Persist model metadata + files in Supabase (`Auth` + `Postgres` + `Storage`).
- Toggle, rename, and delete uploaded models from the same in-page panel.
- Show origin for the selected model (default database model or uploader identity).
- Keep the default model at `/models/cars/car.glb`.

## Modes

This app supports two runtime modes:

1. Supabase cloud mode (recommended):
   - Multi-user authenticated model library.
   - Works on static hosting after build.
2. Local API fallback mode:
   - Uses `server/server.js` with local JSON + filesystem storage.
   - Useful for local development without Supabase config.

Mode selection is automatic:
- If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set -> Supabase mode.
- Otherwise -> local API mode.

## Supabase Setup (Recommended)

### 1) Create project

Create a Supabase project and copy:
- Project URL
- `anon` public key

### 2) Run SQL setup

In Supabase SQL Editor, run:

- `supabase/setup.sql`

This creates:
- `public.car_models` table
- RLS policies (`select/insert/update/delete` per authenticated user)
- Private storage bucket `car-models`
- Storage policies scoped to each user folder (`<user_id>/...`)
- Optional uploader metadata column (`uploaded_by_email`) for origin display

### 3) Add environment variables

Copy `.env.example` to `.env.local` and fill values:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_SUPABASE_STORAGE_BUCKET=car-models
VITE_SUPABASE_MODELS_TABLE=car_models
```

### 4) Auth settings

Enable Email auth in Supabase Authentication settings.
For first-time signup confirmation and normal password logins afterwards:
- Keep `Confirm email` enabled in `Authentication -> Providers -> Email`.
- Keep your allowed redirect URLs configured for your app.

The app uses email + password authentication:
- Sign up: confirm email once from inbox.
- Log in later: email + password directly (no one-time codes).

For local dev URL, include:
- `http://localhost:5173/car-showroom/`

For production, include your deployed app URL.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Start app:

```bash
npm run dev
```

3. Open:

- `http://localhost:5173/car-showroom/`

## Deployment

### Static hosting with Supabase mode

1. Configure `VITE_SUPABASE_*` vars in your host.
2. Run `npm run build`.
3. Deploy `dist/`.

No Node API server is required in this mode.

### Node hosting with local API mode

1. Run `npm run build`.
2. Run `npm run start`.
3. Open `http://localhost:8787/car-showroom/`.

## Available Scripts

- `npm run dev`: API server + Vite dev server
- `npm run dev:server`: local API server only
- `npm run dev:client`: Vite dev server only
- `npm run build`: production build
- `npm run start`: serve built app + local API mode
- `npm run preview`: Vite preview (no local API)

## Language Support

Language is controlled by URL query param `?lang=en|lt` and toggle button.

- Supported: `en`, `lt`
- Unknown values fall back to `en`
- Home button preserves current language via `?lang=...`

## Model Library Behavior

- Default model cannot be renamed or deleted.
- Upload limit is 40MB per `.glb`.
- In Supabase mode, users must sign in before cloud model management.
- In local API mode, model management requires local server availability.
- Selected model shows its origin in the panel.

## Project Structure

```text
car-showroom/
  public/
    models/
      cars/
        car.glb
      uploads/
  server/
    data/
    server.js
  scripts/
    dev.mjs
  src/
    main.js
    style.css
  supabase/
    setup.sql
  .env.example
  index.html
  vite.config.js
```

## Validation Checklist

1. Scene renders without console errors.
2. Default model loads and appears centered.
3. Platform rotation works.
4. Orbit camera + zoom works.
5. Home button is visible and keeps `?lang=...`.
6. Language toggle updates UI text and URL query param.
7. Uploading a `.glb` adds it to selector and loads it.
8. Renaming updates selector label.
9. Deleting removes model and falls back safely when active.
