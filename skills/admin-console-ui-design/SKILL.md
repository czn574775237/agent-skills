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

### Beyond one column: multi-level navigation

Reach for this when the flat nav outgrows one scannable column — roughly **more than 12 items**, or two groups that are really separate jobs (management vs observability vs evaluation). Splitting the list by work domain beats adding a second scroll or shrinking labels. Keep at most **two levels**; a third level is a smell, fold it into the page.

- **Two columns, not two draws**: a narrow activity rail (`w-14`, 56px) carries the domains — icon only, `aria-label` + `title` for the name, active = `bg-primary-soft text-primary` with a 2px primary indicator on the rail's inner edge. The second column (`w-56`, 224px) lists the active domain's pages with the ordinary nav-item recipe above.
- **Domains group by job, not by noun.** Typical three: 管理 (accounts, identity, bots, settings, assets), 可观测 (sessions, sync logs, activity, devices, dispatch, approvals, channels), 评测 (runs, compare, metrics, cases). A domain holds 4–10 items; a domain with two items means the split is wrong — merge it.
- **Path ownership is explicit**: each domain declares the path prefixes it owns; the current path picks the domain (most specific first, unknown paths fall to the first domain). Clicking a domain icon lands on that domain's overview — never on a path that only redirects.
- **Breadcrumb becomes two-level**: `管理 / 总览`, `评测 / 概览`. Keep it in the sticky header; the page's own `pageHeader` still carries the full title.
- **Mobile (<1024px)**: hide both columns; put two chip rows under the header — row 1 switches domain, row 2 switches page inside the current domain. One flat row of every page is the failure this replaces.
- **Icons stay decorative**: rail icons are from `lucide-react`, one stroke weight; the label comes from `title`/`aria-label`, never a text label in the rail.

Done when: every page is reachable in ≤2 clicks from the rail, no column exceeds 10 items, switching domains updates both the second column and the breadcrumb, and at 390px no row scrolls the page horizontally.

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

### Table at scale (a list that can outgrow one screen)

Any list whose row count is **not bounded by the product** (accounts, sessions, dispatches, ops rows, skills, documents, approvals…) is a data grid, and every such page uses **the same grid contract**. A page must not invent its own paging idiom: a second idiom reads as a different product.

- **Toolbar lives inside the card**, above the table, `border-b border-border px-4 py-3`, `gap-2`: search input `w-56 h-9` whose placeholder names the field it searches (`搜账号名…`), filter chips `h-8 rounded-[6px]` inside a `bg-muted p-0.5` track with the count beside each label, and toggle pills `h-9 rounded-md border`. Never place the toolbar above the card — it filters this table only, and splitting them costs a section of vertical rhythm.
- **Chipped counts come from the unfiltered set**, so a filter can never hide its own escape hatch (`全部 12` stays 12 while `服务号 3` is active).
- **Header row stays put** when the body scrolls: `sticky top-0 z-10` on an **opaque** `bg-muted` — `bg-muted/50` lets rows show through.
- **Footer bar** closes the card: `flex items-center justify-between gap-4 border-t border-border px-4 py-3 text-xs text-muted-foreground`. Left = range and total (`第 1–25 / 共 137 个账号`); right = rows-per-page select, `上一页` / `下一页` icon buttons (`h-8 w-8 rounded-md border`), and `1 / 6` in `tabular-nums`. No page-number strip: admin lists run deep, and a numbered strip either lies or wraps.
- **Page size** defaults to 25; options `25 / 50 / 100`. Changing it, or any filter, search, sort, or account switch, returns to page 1.
- **Boundary states**: prev disabled on the first page, next on the last, both `disabled:opacity-40 disabled:pointer-events-none`; hide the footer when the result set is empty (the empty row already says what to do).
- **Cursor-paged endpoints keep their own verbs** in the same footer slot — `回到最新` / `加载更早` on the right, range on the left. Never render fake page numbers over a cursor that cannot jump.
- **Sortable columns**: clickable `<th>` content with a descending → ascending → unsorted cycle; the caret is a 12px `ChevronDown` that rotates, the active header takes `text-foreground`, and the button's `aria-label` states the current order so the state is not color-or-caret-only. Sorting is done on the **filtered full set before paging**, never on the visible page. Server-sorted endpoints skip this and say so in the column title.
- **Skeleton rows match the page size** (not a hardcoded 8) so the card does not resize when data lands.
- **Row identity survives paging**: selection, open drawers, and URL anchors reference row ids, not indexes; changing pages must not close an open detail panel.

### One dataset, one owner

Duplication across pages is the failure mode this system most often grows into, because every page starts from "this number would look good here too".

- **Exactly one page renders a dataset in full.** Its list page; that page's header carries the count.
- **The overview may summarize, never mirror**: at most 5 rows or 3 numbers per dataset, each with a link to the owning page (`查看全部 →`). A second full table of another page's data is a bug, not a convenience.
- **Drill-downs (a drawer or dialog opened from a row) may restate that one row's numbers** — but the moment they show a list or a trend, they link out to the owning page instead.
- **Configuration appears where it is enforced.** Upstream and model policy live on the page that reads them; the overview shows their state as a two-line summary and a single link, never a second editable copy.
- **A number appears once per screen.** Two KPIs that differ only by scope ("用量记录" vs "总调用次数") must say so in the label or merge.

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
9. Every unbounded list shows the grid footer: range + total on the left, rows-per-page and prev/next on the right; with 30+ rows the page does not grow past the viewport, and typing in the search box resets to page 1.
10. No page renders another page's dataset in full: the overview's summaries each link out, and a count appears on exactly one screen.
11. If the shell uses multi-level navigation: the activity rail carries ≤4 domains, the second column ≤10 items, breadcrumb is `域 / 页`, and at 390px two chip rows replace both columns with no horizontal page scroll.

## 12. Reference implementation

- `assets/tokens.css` — the token block + `.ac-*` component classes (plain CSS, works without Tailwind).
- `reference/admin-console-reference.html` — a full workbench page built only from those tokens: app shell, KPI row, task table, service card, page-state samples, new-project dialog, zh/en switch, mobile layout. Open it in a browser next to your implementation; the two should be hard to tell apart.
- `reference/shots/*.png` — desktop 1440 and mobile 390 renders of that page. Not committed; the check script writes them on every run.
- `scripts/reference-check.ts` — `bun run scripts/reference-check.ts` serves the reference page in a headless Chromium and asserts 30+ computed-style values (card/radius/shadow, badge tints, control heights, table header, mobile overflow, dialog focus, locale switch). Copy it into the project and point the selectors at the app's own classes to get the same guard there.
