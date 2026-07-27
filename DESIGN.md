# 4WDScout — design system

**Register:** product (app UI). **Reference DNA:** Strava — athletic, data-forward, social — adapted for Australian 4WD touring.

## Tokens (assets/css/app.css `:root`)
- Canvas `--bone #F7F7F9` (cool off-white) · surface `--paper #FFF` · recessed `--paper-2 #F0F0F5`
- Ink `#242428` / secondary `#666` / muted `#8F8F94` · hairlines `--line #E6E6EB`
- **Accent `--clay #FC4C02`** (Strava orange) — used for: route lines, kudos-on, primary CTAs, active tab tint, difficulty=hard. One accent; green `#1B753A` strictly semantic (easy grade, start dots, fitment-ok).
- Difficulty ramp: easy `#1B753A` · medium `#F68B29` · hard `#FC4C02` · extreme `#242428`.
- Radii 4/8/12 (sharp, athletic). Shadows minimal (`0 1px 3px .04`), hover `0 8px 24px .08`.
- Type: system sans everywhere; **numbers always `--mono` + `tabular-nums`** (stat DNA). Wordmark only: Space Grotesk.

## Signature components
- **`statRow([[label, value, unit]])`** — Strava stat band: 10.5px uppercase label over 19px mono number, hairline top border, vertical hairline dividers. Used on track rows, track detail, feed/scout attachments.
- **`miniMap(track, w, h)`** — deterministic SVG route widget: sage `#EEF0EA` canvas, white street grid, `#E4EAE0` park blobs, orange route (3.5px on 7px white casing, round caps), green start / ink end dots. Seeded by track id, shaped by terrain type. *Decorative preview geometry until GPX uploads land.*
- **`elevSpark(id)`** — elevation profile: 2px orange line, 10% orange area fill.
- **`avatar(name, px)`** — initials chip, hue rotated per-name from 4 wash/ink pairs.
- **Feed card `.fcard`** — Strava anatomy: avatar+name+meta header w/ type chip → body → route attachment (`.fmap` w/ caption bar) → statRow → social bar (kudos + comments, hairline top) → comments → inline composer.
- **`.dblock`** — scout date block (mono day over uppercase month, clay wash).

## Interaction rules
- Kudos flips **optimistically** (no re-render, keeps scroll); server write follows.
- Press feedback on `:active` (scale .94–.98), instant.
- Enter posts a comment; comment icon focuses the composer.
- All motion `transform`/`opacity` only, ease-out-quints; `prefers-reduced-motion` collapses to instant.

## Bans (project-specific)
- No side-stripe accent borders; no gradient text; no emoji in UI; no serif in app UI; numbers never proportional-figures.
