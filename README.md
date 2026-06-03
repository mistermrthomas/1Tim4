# Path

A spiritual formation companion for walking with God over time — growth, direction, and daily faithfulness on a lifelong path.

Path documents your journey toward godliness — not a Bible app, devotional, curriculum, habit tracker, or scoring system.

*Train for Godliness*

## Run locally

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

## Features (Version 1)

### Trail (Home)
- Current training focus and training verse
- Today's reading progress
- Today's trail: Prepare → Live → Reflect
- Journey log preview, active prayers, lessons learned

### Prepare / Live / Reflect
- Daily journey stages with rotating reflection questions
- Scripture notes, key verses, and lessons captured during reflection
- Training verse visible on Live and Reflect screens

### Journal
- Chronological entry history with filters (date, focus, book, theme)

### Prayer
- Track active, partially answered, and answered prayers

### Archive
- Chapters read, books completed, lessons, answered prayers
- Training verse and focus history
- Growth themes (structured for future AI insights)

### Guide
- Set new training focus and training verse
- Initial spiritual assessment for new trails
- Reset to sample data

## Profiles

On first launch, enter your name to begin. Additional people on the same device can start under another name. Switch profiles from the header or **Guide → Switch profile**.

## Data

All data is stored in **localStorage** on your device, keyed per profile. Optional cloud sync (Apple / Google via Supabase) is documented in [docs/CLOUD_SYNC.md](docs/CLOUD_SYNC.md).

See [DEPLOYMENT.md](./DEPLOYMENT.md) for GitHub and Vercel deployment steps.

### Trail modes

- **New trail** — Empty path with onboarding (first visit default)
- **Demo expedition** — Realistic sample journal to explore the vision
- **Live** — Your personal journal (activates when you add your own entries)

Use **Guide → Explore demo expedition** or **Begin fresh trail** to switch modes.

## Tech stack

- React + TypeScript
- Vite
- React Router
- Local storage persistence

## Design

Vintage national-park inspiration — parchment tones, trail imagery, Fraunces + Source Sans 3 typography. Premium editorial journal feel.

The static design mockup from early exploration lives at `design/home-screen.html`.
