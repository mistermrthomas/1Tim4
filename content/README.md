# Content packs

Authoring source of truth for formation content. The app loads a **bundled foundation pack** at build time and may install **remote expansion packs** atomically later.

## Season packs (staging seed)

Path example: `content/packs/seasons/patience-under-pressure/`

Validated by:

```bash
npm run staging:validate
```

Season packs include season metadata, weeks, representative days, morning variants (full/short/two_minute), Jesus-primary teachings, scripture refs/texts, assignments, prompts, coach intents, workouts, and recovery days.

## Foundation pack

Path: `content/packs/foundation/`

Must remain sufficient for:

- Onboarding seed
- First season materials
- Core teachings of Jesus
- Essential prompts
- Three workout templates
- Offline Morning / Midday / Evening fallbacks
- Public-domain (or explicitly permitted) scripture text only

## Commands

```bash
npm run content:checksum   # recompute manifest checksum
npm run content:validate   # schema + referential integrity + checksum
```

## Scripture licensing

- `scripture_references.json` — canonical locators (always)
- `scripture_texts.<translation>.json` — licensed/permitted wording only
- Do not add copyrighted text without confirmed digital/offline/AI/commercial rights

Development default translation id: `web` (World English Bible, public domain).

## Adding content

1. Edit JSON files under the pack
2. Run `npm run content:checksum`
3. Run `npm run content:validate`
4. Commit manifest + entries together (atomic unit)
