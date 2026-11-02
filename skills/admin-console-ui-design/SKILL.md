---
name: admin-console-ui-design
description: "Apply a calm, compact, low-noise admin console visual and interaction system (React + Tailwind-style design tokens). Ships normative hex/px token values, plain-CSS component classes, and a reference workbench page. Use when creating or updating admin pages, app shells, cards, tables, forms, dialogs, status states, login screens, or shared UI primitives."
---

# Admin Console UI Design Skill

Apply this system to the app's page layer and to the shared UI package. Goal: a calm, compact, multi-tenant admin console that stays readable in more than one language.

**This skill ships concrete values, not adjectives.** `assets/tokens.css` is the single source of truth for every color, radius, shadow, size and type step used below. Do not re-invent them per page.

## 0. First step: land the tokens, then write pages

Copy `assets/tokens.css` into the app's global stylesheet (`app/src/styles.css`).

- **Tailwind v4**: uncomment the `@theme { … }` block in that file. It defines `--color-card`, `--color-border`, `--color-muted-foreground`, `--color-primary`, `--radius-*`, `--shadow-*`.
- **No Tailwind / plain CSS**: keep the `:root` block and use the `.ac-*` component classes at the bottom of the file (`.ac-card`, `.ac-btn`, `.ac-badge`, `.ac-meta-row`).

**Why this is step zero — read before styling anything.** In Tailwind, `bg-card`, `bg-background`, `border-border`, `text-muted-foreground`, `bg-primary/10` and `shadow-sm` are *derived from theme variables*. If the project never defines `--color-card` / `--color-border` / `--color-primary`, those utilities compile to nothing: no error, no warning, no visual — the element just stays transparent with an inherited text color. The only classes that still work are the ones with built-in geometry values, i.e. `rounded-*`. That is exactly how an implementation ends up "calm console" in the spec and "grey boxes with rounded corners" on screen.

Silent-failure table — symptom → missing token:

| Symptom on screen | Missing token | Fix |
| --- | --- | --- |
| Cards transparent, page looks white-on-white | `--color-card` / `--color-background` | define both; card is `#ffffff`, page is `#f7f8fa` |
| No visible card outline, or a black 1px line | `--color-border` | `#e3e7ee` |
| Body text same weight/color everywhere, labels don't recede | `--color-muted-foreground` | `#64748b` |
| Active nav item has no tint | `--color-primary` (needed by `bg-primary/10`) | `#2563eb` |
| Cards look flat (border only) | `--shadow-sm` overridden or dropped | keep `0 1px 2px rgba(15,23,42,.05), 0 1px 3px rgba(15,23,42,.04)` |
| Text renders 16px in Microsoft YaHei, everything feels loose | no `--font-sans` and no base `font-size` | base 14px, font stack in tokens |
| Status pills are solid saturated blocks | badge written as `bg-red-500 text-white` | use the soft-tint badge recipe (§6) |
| Table forces a horizontal page scroll on mobile | grid/flex child defaults to `min-width:auto` | `min-w-0` on the grid child, `overflow-x-auto` on the table wrapper |

## 1. Design tokens (normative values)

Surfaces and text

| Token | Value | Used for |
| --- | --- | --- |
| `background` | `#f7f8fa` | page canvas (cool near-white, never pure white) |
| `card` | `#ffffff` | cards, sidebar, controls |
| `foreground` | `#0f172a` | headings, primary text |
| `muted` | `#f1f3f7` | hover fills, table head, meta blocks |
| `muted-foreground` | `#64748b` | descriptions, table headers, labels |
| `subtle-foreground` | `#94a3b8` | timestamps, row indices (tertiary) |
| `border` | `#e3e7ee` | default 1px card/table borders |
| `border-strong` | `#d3d9e3` | hover borders, dashed empty states |

Brand and status — every status has three values: `soft` (tinted surface), `base`, `ink` (text on soft)

| Tone | soft | base | ink |
| --- | --- | --- | --- |
| primary | `#eff4ff` (= `bg-primary/10`) | `#2563eb` (hover `#1d4ed8`) | `#ffffff` on base |
| success | `#ecfdf5` | `#059669` | `#047857` |
| warning | `#fffaeb` | `#d97706` | `#b45309` |
| info | `#f0f9ff` | `#0ea5e9` | `#0369a1` |
| destructive | `#fef2f2` | `#dc2626` | `#b91c1c` |

Icon tiles (identity marks only, pastel pairing — never a saturated fill)

| Tile | bg | ink |
| --- | --- | --- |
| sky | `#e0f2fe` | `#0369a1` |
| violet | `#ede9fe` | `#6d28d9` |
| amber | `#fef3c7` | `#b45309` |
| emerald | `#d1fae5` | `#047857` |
| slate | `#eef1f5` | `#475569` |

Geometry, density and type

| Token | Value | Note |
| --- | --- | --- |
| radius `sm` / `md` / `lg` / `xl` / `2xl` | `6` / `8` / `10` / `12` / `16` px | cards `xl`; controls `md`; inner blocks `lg`; dialogs & login card `2xl`; badges `999px` |
| control height | `36px` (`h-9`) | inputs, selects, buttons — no exceptions |
| sidebar width | `256px` (`w-64`) | fixed on desktop |
| header height | `64px` (`h-16`) | sticky |
| content max width | `1280px` (`max-w-7xl`) | centered |
| page padding | `24px` / `32px` from `md` | |
| section rhythm | `24px` (`space-y-6`) | |
| card gap | `16px` (`gap-4`) | |
| shadow `xs` / `sm` / `md` | `0 1px 2px rgba(15,23,42,.06)` / `0 1px 2px rgba(15,23,42,.05), 0 1px 3px rgba(15,23,42,.04)` / `0 4px 12px -2px rgba(15,23,42,.09), 0 2px 4px -2px rgba(15,23,42,.05)` | `sm` on cards, `xs` on controls, `md` only on hover-lift and dialogs |
| type scale | 12 / 13 / 14 / 16 / 20 / 24 / 30 px | 14 is the body baseline (not 16) |
| font stack | `"Inter", "Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif` | CJK fallbacks are mandatory |
| mono | `"JetBrains Mono", ui-monospace, SFMono-Regular, Consolas, monospace` | IDs, hashes, job codes |
| motion | `180ms cubic-bezier(.2,.8,.2,1)` (fast: `120ms`) | color, row hover, `-2px` card lift only |

Text roles: page title 24/600 `-0.015em`; card title 16/600; body 14; table cell 13; table header 11/600 `uppercase` `+0.06em` `muted-foreground`; KPI value 30/600 `tabular-nums`; badge 12/500.

## 2. Stack and source of truth

- React 19 function components, a file-based or config-driven router, a data-fetching/caching layer for server state, Tailwind CSS v4.
- Import shared primitives from the shared UI package (e.g. `@app/ui`); app-specific wrappers live in the app's components directory (e.g. `app/src/components`).
- Icons from `lucide-react`; toasts from `sonner`.
- Do not introduce another modal, table, button, form-field, or status component — extend the shared one instead.

## 3. Visual language

- Light, low-noise surface: `bg-background` canvas, white cards, muted blue-gray text.
- One strong blue (`primary`) per page section; success/warning/info/destructive appear **only** as soft-tint badges and small state surfaces.
- Cards: `rounded-xl border border-border bg-card shadow-sm`.
- Controls: `h-9 rounded-md shadow-xs`; labels short, above the field.
- Density: generous section rhythm (`space-y-6`) but compact rows and controls.
- Use semantic tokens (`background`, `card`, `muted`, `border`, `primary`, `destructive`) instead of hardcoded colors. The login hero is the only dark marketing surface.

## 4. App shell

- Desktop: fixed left sidebar, `w-64`, white, right border; `main` offset by the sidebar width, centered `max-w-7xl`, `py-6`/`py-8`.
- Sidebar brand row: 34px `rounded-md bg-primary` logo tile, product name (`text-base font-semibold`), short muted tagline (`text-xs`).
- Nav items: icon + label, `h-9 rounded-md text-sm`, muted by default; hover `bg-muted text-foreground`; active `bg-primary/10 text-primary` + `aria-current="page"`.
- Sidebar footer: workspace block (`rounded-lg bg-muted/60 px-3 py-2`) with tenant name and signed-in identifier, then a ghost logout row.
- Header: sticky `h-16`, `bg-background/90 backdrop-blur`, tenant context on the left, locale switch and role pill (`rounded-full border`, 6px green dot with a soft halo) on the right.
- Mobile (`<1024px`): hide the sidebar, show the logo in the header, put the nav in a horizontally scrollable chip row under the header (`h-7 rounded-full border` chips).

## 5. Page recipe

1. One page header: `text-2xl font-semibold tracking-tight` title, one-line muted description, right-aligned actions.
2. Wrap the page in `space-y-6`.
3. Prefer:
   - KPI row: `grid gap-4 sm:grid-cols-2 xl:grid-cols-4`.
   - List row: cards in `md:grid-cols-2 xl:grid-cols-3`.
   - Data/detail row: `lg:grid-cols-[1.5fr_1fr]` or another intentional ratio — and put `min-w-0` on those grid children.
4. Exactly one primary action per page section. Secondary `outline`; tertiary row actions `ghost`.

## 6. Core patterns

### Stat card

`flex items-start justify-between p-5` in a card; left: `text-sm text-muted-foreground` label + `text-3xl font-semibold tracking-tight tabular-nums` value; right: 44px `rounded-lg` tile with a pastel pairing from §1. Categorical KPIs cycle sky / violet / amber / emerald — consistent across the app.

### Object card

Rounded icon tile as identity mark (no decorative emoji) · outline badge for category · `text-base font-semibold` title · muted description clamped to two lines · small muted metadata (counts, owner, locale pair, timestamps) · footer separated by `border-t` with the timestamp and an explicit affordance. Hover: `-translate-y-0.5 shadow-md`.

### Table

Wrap in a card; the scroll container is `overflow-x-auto`, the table `min-w-[520px] w-full`. Header cells: `text-[11px] font-semibold uppercase tracking-[.06em] text-muted-foreground`, `bg-muted/50`, top and bottom border. Body cells `text-[13px] px-5 py-3`, row separators `border-border/65`, row hover `bg-muted/50`. IDs and hashes `font-mono text-xs`. Primary row link `font-medium hover:underline`.

### Forms and dialogs

- Vertical `space-y-4`; related fields in 2/3-column grids; labels `text-sm font-medium` above the field.
- Inputs/selects `h-9 rounded-md border-input bg-card shadow-xs`, focus `border-primary ring-3 ring-primary/30`; icons inside inputs absolutely positioned with matching left padding.
- Shared dialog: `rounded-2xl`, title + muted description, body, right-aligned footer (`outline` cancel → `primary` submit), close button top-right.
- Disable submit while pending or while required fields are empty; show pending text inside the button. Escape closes, focus returns to the trigger, focus is trapped inside.
- File upload = `outline` button label wrapping a hidden `<input type="file">`.

### Status and metadata

One shared `StatusBadge` with a semantic tone map (below). Badges are `h-[22px] rounded-full text-xs font-medium` with **soft background + ink text** — never a solid saturated fill. Keep the map stable app-wide:

| Tone | Domain statuses |
| --- | --- |
| `muted` | `idle` `draft` `queued` `disabled` `unassigned` `cancelled` `archived` |
| `info` | `submitted` `assigned` `claimed` |
| `warning` | `running` `partial` `in_progress` |
| `success` | `done` `active` `complete` `published` |
| `destructive` | `failed` `rejected` `forbidden` |
| `outline` | anything unmapped |

Extending the map is a shared-package change: add the domain status there, never inline a class in a page.

Small metadata rows: `rounded-lg bg-muted/60 px-4 py-2.5 text-sm`, label left (`text-muted-foreground`), badge or value right.

### Page states

Every fetched screen handles all four states:

- Loading: centered muted text or skeleton bars (`h-2.5 rounded-full bg-muted`).
- Error: `bg-destructive/5` block with `text-destructive` text and an `outline` retry action.
- Empty: dashed border (`border-dashed border-border-strong`), `bg-card/40`, centered icon + title + one line + action.
- Success: normal layout.

On mutations: toast success/error, invalidate every affected query, close the dialog only after success.

## 7. Login screen

Split layout: left is the only dark surface (`bg-slate-950`, radial blue/green gradients, bold product claim, small `white/5` feature cards); right is a centered `max-w-sm` card with identifier/password fields (icons inside inputs), full-width primary submit, inline destructive error text, dashed demo-account hint. Keep marketing copy on the hero side only.

## 8. Content rules

- Every user-visible string comes from the app's i18n hook; never hardcode a label in one language only (a static proof page may carry a `{zh, en}` dictionary, but the app must not).
- Dates go through the shared date formatter with the active locale.
- `→` for flows (source → target, before → after); `—` for absent values.
- Sentence case; no exclamation marks; no decorative copy.
- Icons are decorative unless paired with text or given an `aria-label`.

## 9. Accessibility and interaction

- Focus stays visible on every interactive element (`outline: 2px solid ring`, offset 2) — never remove focus rings.
- Dialog: Escape and the close button work; focus trapped and returned to the trigger.
- Nav and row actions reachable by keyboard in DOM order; status never conveyed by color alone (the badge carries text).
- Contrast: `muted-foreground` on `card` ≈ 4.8:1 — do not go lighter for body-adjacent text; `subtle-foreground` only for tertiary metadata.

## 10. Portability

Placeholders that follow the project, not this skill: shared package name, directory layout, global stylesheet path, router/query/i18n/date-formatter choices, status vocabulary, brand name, tagline, role labels. Everything else — token values, spacing, card/table/form recipes, tone map, motion — is normative.

## 11. Definition of done

Run these checks against the rendered page (DevTools → Computed), not against the source:

1. Card: `background-color` `#fff`, `border-radius` `12px`, `border` `1px #e3e7ee`, `box-shadow` not `none`.
2. Canvas `background-color` `#f7f8fa`; body `font-size` `14px` and the font stack resolves to Inter/Segoe UI, not Times/YaHei-by-default.
3. A status badge: `height` `22px`, `border-radius` `999px`, background is one of the soft tints (`#fef2f2`, `#fffaeb`, `#ecfdf5`, `#f0f9ff`), **not** a solid `#dc2626`.
4. Controls `height` `36px`, `border-radius` `8px`; sidebar `256px`; header `64px`; content `max-width` `1280px`.
5. Table header `text-transform: uppercase`, `font-size` `11px`; IDs `font-family` mono.
6. Desktop 1440 and mobile 390: no horizontal page scroll (`document.scrollWidth <= innerWidth + 2`); the table scrolls inside its card.
7. Loading / error / empty / success all reachable; dialog Escape + focus return; language switch changes every label including table headers.
8. Format, lint and type-check pass; no page defines its own status colors.

## 12. Reference implementation

- `assets/tokens.css` — the token block + `.ac-*` component classes (plain CSS, works without Tailwind).
- `reference/admin-console-reference.html` — a full workbench page built only from those tokens: app shell, KPI row, task table, service card, page-state samples, new-project dialog, zh/en switch, mobile layout. Open it in a browser next to your implementation; the two should be hard to tell apart.
- `reference/shots/*.png` — desktop 1440 and mobile 390 renders of that page. Not committed; the check script writes them on every run.
- `scripts/reference-check.ts` — `bun run scripts/reference-check.ts` serves the reference page in a headless Chromium and asserts 30+ computed-style values (card/radius/shadow, badge tints, control heights, table header, mobile overflow, dialog focus, locale switch). Copy it into the project and point the selectors at the app's own classes to get the same guard there.
