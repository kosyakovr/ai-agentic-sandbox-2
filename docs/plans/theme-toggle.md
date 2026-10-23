# Implementation Plan: Theme toggle
**Status:** approved
**Spec:** docs/specs/theme-toggle.md @ da39d9c
**Approved:** 2026-10-23 by the user — gates: none · execution mode: single-agent, then plan-verifier ∥ architecture-reviewer · accepted: REC-1
Areas: apps/web, README · Requirements: docs/specs/theme-toggle.md · Ticket: none

## Summary
This plan adds a "Theme" menu button (Light / Dark / System) to the site header of every page.
- The choice is kept in `localStorage` and applied by a small inline script in `<head>` before first paint.
- The colour tokens become single `light-dark()` values, switched by `color-scheme` on `<html>`. Each colour exists once, so Dark renders the same resolved colours as System on a dark OS (AC-10, A-17).
- There are 4 work packages: palette CSS, the theme module with the pre-paint script, the menu component with layout wiring, and a README styling rule (REC-1, accepted).
- There is no API, contract, DB or caching change.

**Gates:** none.

**User answers (2026-10-23):**
- REC-1 accepted (WP4); REC-2 rejected.
- Defaults R-3 and R-8 accepted. spec-creator has folded them into the spec as A-17 and A-18, with the new AC-44, AC-45 and AC-46 (S-9).

**Execution mode — your choice needed:** multi-agent or single-agent? Answered: **single-agent, then plan-verifier ∥ architecture-reviewer**, which is the mode I recommended. The deciding facts:
- 1 code area and 4 small work packages.
- No contract or schema change.
- No automated test can be written (spec A-12).
- The one security-group file (the `layout.tsx` inline script) is covered by the two reviewers.

## Requirements review
| ID | Requirement (short) | Source | Verdict | Note / default taken |
|---|---|---|---|---|
| R-1 | "Theme" button in the header of every page, at the end of the row; Tab order skip link → Blog → Theme → main; one row at 320 px | theme-toggle.md AC-1, NFR-8, NFR-9, A-9 | ok | — |
| R-2 | Menu offers Light, Dark, System in that order; items are `menuitemradio` with `aria-checked`; the button exposes a menu popup and `aria-expanded` | AC-2, NFR-13, NFR-14, NFR-15, A-16 | ok | — |
| R-3 | Light / Dark / System apply the matching palette without a reload; Dark ignores OS changes; Dark renders the same resolved colours as System on a dark OS | AC-3, AC-4, AC-5, AC-6, AC-7, AC-10, A-17, S-9 | ok | Default accepted by the user (2026-10-23) and folded into the spec as A-17. Palette identity is checked on resolved computed colours. The `html` background is `rgb(18, 20, 26)` in dark and `rgb(255, 255, 255)` in light. AC-10 compares computed `color`, `background-color` and `border-color` of `html`, a card and a pagination box. It is never checked on the text of a token property. |
| R-4 | Computed `color-scheme` and `theme-color` follow the active palette | AC-11, AC-12, A-11 | ok | Computed `color-scheme` is always a single `light` or `dark`, with JS off too (D-1). |
| R-5 | The button shows the current choice's icon and the name "Theme: <choice>" from the first frame; focus returns to the button after a selection | AC-8, AC-9, AC-20, NFR-1, A-13 | ok | The icon and a visually hidden ": <choice>" suffix are switched by CSS on `html[data-theme-choice]`, so they are correct before hydration (D-5). |
| R-6 | JS off: no button, the page follows the OS, posts are still in the HTML | AC-13, AC-28, AC-29, A-4 | ok | — |
| R-7 | Print uses the light tokens and shows no button or menu | AC-14, AC-15, A-8 | ok | — |
| R-8 | Menu-button keyboard and pointer model, including ArrowUp on the closed button and the focus targets after Tab / Shift+Tab | AC-32–AC-41, AC-44, AC-45, AC-46, NFR-2, A-14, A-18, S-9 | ok | Default accepted by the user (2026-10-23) and folded into the spec as A-18. ArrowUp on the closed button does nothing (AC-46; REC-2 rejected). Tab inside the open menu closes it and focus goes to the first focusable element after the "Theme" button (AC-44). Shift+Tab closes it and focus goes to "Blog" (AC-45). |
| R-9 | The menu overlays content without moving it and stays inside the viewport at 320 px | AC-43, NFR-16, A-9 | ok | — |
| R-10 | Other tabs follow a change without a reload; an open menu there stays open with the new item checked; a back/forward-cache restore shows the stored choice | AC-22, AC-23, AC-42, A-6, A-15 | ok | — |
| R-11 | The last choice persists in `localStorage`; nothing stored → System checked; unknown value → System; storage unavailable → the choice applies to the current page only | AC-16, AC-17, AC-21, AC-24, AC-25, A-5 | ok | Storage key `theme`, values `light` / `dark` / `system`. System is stored, not removed. |
| R-12 | No frame in the other palette on load or link navigation; no hydration mismatch in the 6 combinations; CLS ≤ 0.1 with Dark stored | AC-18, AC-19, NFR-11, NFR-12 | ok | Rests on 2 Assumptions (see Risks): the inline `<head>` script runs before first paint, and React 19 tolerates the meta tag the script inserts into `<head>`. |
| R-13 | Focus ≥ 3:1; targets 44×44; text ≥ 4.5:1; icon, menu boundary and checked indicator ≥ 3:1; the checked item is identifiable without colour | NFR-3, NFR-4, NFR-5, NFR-6 | ok | `--border` on `--surface` in light is about 2.97:1 (`globals.css:3,6`), so the menu border uses `--text-muted`, which is ≥ 7:1 in both palettes. The checked item shows a check-mark glyph. |
| R-14 | Cross-fade ≤ 200 ms when the palette changes on an open page; none under reduced motion; none on load, navigation or back/forward restore | NFR-7, NFR-17, NFR-18, A-7 | ok | Transitions last 150 ms (D-8). |
| R-15 | Making a choice sends no network request | NFR-10, A-3 | ok | — |
| R-16 | System keeps following the OS, live | AC-26, AC-27 | ok | While JS runs, a `matchMedia` listener does this (D-3); with JS off, CSS does. |
| R-17 | Skip link stays first; API calls are unchanged | AC-30, AC-31 | ok | No server code changes and no cookie, so rendering stays as it is (S-6). |
| R-18 | The README states that colours come only from the global tokens, never from `prefers-color-scheme` in a CSS module | user · 2026-10-23 (REC-1 accepted) | ok | Not a spec requirement: it protects AC-3 and AC-4 from future module CSS. WP4 implements it. |

## Goal
Readers pick Light, Dark or System from a "Theme" menu button in the header of every page. The choice is remembered in this browser, applied before first paint, synced across open tabs and cross-faded on open pages. With no choice stored, or with JS off, the site behaves as it does today.

## Non-goals
- No file changes under `apps/api/`, `packages/contracts/`, `apps/web/src/lib/api.ts`, `apps/web/src/lib/posts.ts` or `apps/web/src/proxy.ts`.
- No change to `package.json`, `pnpm-lock.yaml`, `next.config.ts` or `tsconfig*.json`. No test file or test script is added (P-2 deferred).
- No cookie is set or read. `cookies()` and `headers()` are not called anywhere.
- No new colour value: the 11 tokens keep their hex values (`globals.css:2-12,17-27`).
- No animation when the menu opens or closes, no type-ahead, no keyboard shortcut. ArrowUp on the closed button opens nothing (AC-46, A-18).
- No token or palette rule is added in any `*.module.css` file other than `ThemeMenu.module.css`, and that file uses tokens only.
- `README.md` changes only by the two lines of WP4.

## What already exists (do not rebuild)
- **Palette tokens:** light tokens on `:root`, dark overrides under `prefers-color-scheme: dark`: `apps/web/src/app/globals.css:1-29`.
- **Global styles:**
  - `:focus-visible` outline in `--focus`: `globals.css:53-56`
  - header link 2.75rem tall: `globals.css:69-76`
  - skip link with `z-index: 10`: `globals.css:78-91`
  - `.wrapper`: `globals.css:58-62`
- **Root layout:**
  - `viewport.colorScheme: 'light dark'`: `apps/web/src/app/layout.tsx:11-13`
  - `<html lang="en">`: `:17`
  - skip link first: `:19-21`
  - header with a plain `<a href="/posts">Blog</a>`: `:22-28`
- **Not-found pages** render inside the root layout: `apps/web/src/app/not-found.tsx:2`, `apps/web/src/app/posts/not-found.tsx`.
- **Pagination** uses `next/link`, so navigation is client-side and the layout persists: `apps/web/src/app/posts/_components/Pagination/Pagination.tsx:1,15`.
- **Component folder pattern:** `<Name>.tsx` + `<Name>.module.css` + `helpers.ts` + a one-line `index.ts` (`apps/web/src/app/posts/_components/PostCard/`, `.../Pagination/index.ts:1`).
- **README web tree:** `README.md:7-14`; the route-local UI rule is at `README.md:9`.
- **TypeScript setup:** `@/*` alias at `apps/web/tsconfig.json:12-14`. Strict TS (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) at `tsconfig.base.json:9,11`.
- **Installed versions:** React 19.3.1 and Next 16.4.2 (`node_modules/.pnpm/react@19.3.1`, `next@16.4.2_*`).
- **No CSP or security headers** on the web app (`apps/web/next.config.ts:9-15`).
- **Not present:**
  - in `apps/web/src` (grep): no `'use client'` file, no `localStorage` use, no `transition`, no `@media print`
  - no web test script (`apps/web/package.json:6-11`)
  - no CI workflow, linter, CLAUDE.md or AGENTS.md

## Contract
No route, API, shared-schema or DB change.

Internal seams fixed by this plan, for the implementer and reviewers:

**`<html>` attributes.** Only script sets them; with JS off none of the three exists.
- `data-theme-choice` = `light` | `dark` | `system`: the reader's choice.
- `data-theme` = `light` | `dark`: the resolved palette.
- `data-theme-fading`: present for about 250 ms after a change on an open page.

**Storage:** `localStorage["theme"]` = `light` | `dark` | `system`.

**`<meta name="theme-color">`:**
- Two media-specific tags from `viewport.themeColor`: `#ffffff` for `(prefers-color-scheme: light)` and `#12141a` for `(prefers-color-scheme: dark)`.
- With JS, the script inserts one more tag without `media` as the first child of `<head>`. Its `content` is the active palette's background.

**`apps/web/src/lib/theme.ts`.** No React import, no `server-only`, and no `window` or `document` access at module top level. It exports:
- `type ThemeChoice = 'light' | 'dark' | 'system'`
- `type Palette = 'light' | 'dark'`
- `THEME_CHOICES = ['light', 'dark', 'system'] as const`
- `THEME_STORAGE_KEY = 'theme'`
- `PALETTE_BACKGROUND = { light: '#ffffff', dark: '#12141a' } as const`
- `parseThemeChoice(value: unknown): ThemeChoice`
- `THEME_INIT_SCRIPT: string`
- `getThemeChoice(): ThemeChoice`
- `setThemeChoice(choice: ThemeChoice): void`
- `restoreThemeChoice(): void`
- `subscribeThemeChoice(onChange: () => void): () => void`

**`apps/web/src/app/_components/ThemeMenu/index.ts`** exports `ThemeMenu`, a Client Component with no props.

## Decisions taken
| Decision | Why | Rejected alternative |
|---|---|---|
| D-1 Each token is one `light-dark(<light>, <dark>)` value on `:root`. The palette is picked by `color-scheme`: `light` by default; `dark` under `:root[data-theme='dark']`; `dark` under `@media (prefers-color-scheme: dark) { :root:not([data-theme]) }` (JS off); forced to `light` in `@media print` | Every colour exists once, so AC-10 holds by construction. Computed `color-scheme` is always a single value (AC-11). JS off follows the OS (AC-28). Checks use resolved colours (A-17). | Duplicating the dark block under both `[data-theme='dark']` and the media query: two copies that can drift |
| D-2 A raw inline `<script>` in the root layout's `<head>`, built only from constants in `lib/theme.ts` | `next-best-practices` `hydration-error.md` › Correcting before paint with an inline script: it runs during HTML parse, before first paint (AC-18) | `next/script` `beforeInteractive` (`scripts.md` › Strategies: Next's loader injects it, and pre-paint execution of inline content is not stated). A cookie with `cookies()` (makes every route request-time per `hydration-error.md`; the spec rules out cookies). |
| D-3 With JS, `data-theme` always holds the resolved palette, System included, and a `matchMedia` listener keeps it current | An OS-driven change can then set `data-theme-fading` before the change, so it cross-fades (A-7). A pure CSS media flip cannot be faded. | CSS-only System while JS runs |
| D-4 `data-theme-choice` on `<html>` is the in-page source of truth. React reads it with `useSyncExternalStore(subscribeThemeChoice, getThemeChoice, () => 'system')` | No hydration mismatch (NFR-11): React uses the server snapshot during hydration, then re-renders. Works with storage off (AC-25). `react-best-practices` §2, §4. | `useState` + `useEffect` copying storage (the §2/§4 anti-pattern); a lazy initializer reading storage (hydration mismatch) |
| D-5 The button renders all three icons and three visually hidden name suffixes (": Light", ": Dark", ": System"). CSS shows only the ones matching `html[data-theme-choice]` | Correct icon and accessible name from the first frame, before hydration (AC-20, NFR-1). The name "Theme: Dark" contains the visible label "Theme" (A-13). | Icon and `aria-label` from React state (System shows until hydration) |
| D-6 The `ThemeMenu` root is `display: none` unless `html[data-theme-choice]` exists | Meets AC-13 without `<noscript>`. With JS the attribute exists before first paint, so nothing shifts (NFR-12). | Rendering only on the client after mount (layout shift) |
| D-7 `theme-color` uses the media-specific tags from `viewport.themeColor`, plus a script-inserted tag without `media` placed first in `<head>` | `metadata.md` › Core rules puts theme colour in `viewport`. The first matching tag in tree order wins, so the script's tag overrides with JS on. JS off follows the OS (A-11). | Hand-written meta tags in the layout (`metadata.md` › Avoid) |
| D-8 Cross-fade: `data-theme-fading` turns on 150 ms transitions of `background-color`, `color`, `border-color`, `outline-color`, `fill` and `stroke` on `:root` and its descendants, only inside `@media (prefers-reduced-motion: no-preference)`. It is set only on an open-page change, and only when the resolved palette changes | Stays within 200 ms with margin (NFR-7). Reduced motion is handled in CSS (NFR-17). Load and restore never set it (NFR-18). | View Transitions API (a snapshot cross-fade that also captures the closing menu; more moving parts) |
| D-9 The component lives at `apps/web/src/app/_components/ThemeMenu/` | Its only importer is the root layout, so it is route-local to the root segment (`frontend-ui-architecture` §1, §2; `README.md:9`) | `src/components/site-header/` (promotion needs a second consumer, §2) |
| D-10 Labels "Light", "Dark" and "System" are inline in `ThemeMenu/constants.ts` | English only and no message catalogue exists (posts-list A-6). Existing UI strings are inline (`layout.tsx:20,25`). | Adding an i18n catalogue |

## Gates — need user approval before implementation
- none

## Work packages
### WP1 — Palette tokens, print and fade CSS   [apps/web · group C, F]
- **Implements:** R-3, R-4 (`color-scheme`), R-6 (AC-28), R-7 (AC-14), R-14 (CSS part), R-16, R-1 (header row)
- **Files:** modify `apps/web/src/app/globals.css`
- **Skills to apply:** engineering-paved-path:frontend-ui-architecture §5 (values in one place), §13; engineering-paved-path:next-best-practices `hydration-error.md` › Correcting before paint with an inline script (the CSS keys off the attributes the script sets)
- **Constraints:**
  - Keep every existing hex value (spec Non-goals, S-3).
  - Keep the existing rules at `globals.css:31-91` unchanged, apart from the header row addition.
  - No new token names.
- **Steps:**
  1. Replace `globals.css:1-29` with one `:root` block. It holds `color-scheme: light` and each of the 11 tokens as `light-dark(<value from :2-12>, <value from :17-27>)`.
  2. Add `:root[data-theme='dark'] { color-scheme: dark; }`.
  3. Add `@media (prefers-color-scheme: dark) { :root:not([data-theme]) { color-scheme: dark; } }`.
  4. Add the fade rule:
     ```css
     @media (prefers-reduced-motion: no-preference) {
       :root[data-theme-fading],
       :root[data-theme-fading] *,
       :root[data-theme-fading] *::before,
       :root[data-theme-fading] *::after {
         transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease,
           outline-color 150ms ease, fill 150ms ease, stroke 150ms ease;
       }
     }
     ```
  5. Add `.site-header-row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }`.
  6. As the last rule of the file, add `@media print { :root, :root[data-theme] { color-scheme: light; } }`. It must come after steps 2 and 3 so it wins at equal specificity.
- **Done when:**
  - `grep -c 'light-dark(' apps/web/src/app/globals.css` prints 11.
  - `prefers-color-scheme` appears in exactly one rule, the `:root:not([data-theme])` one.
  - `@media print` is the last block in the file.
  - `pnpm --filter @blog/web build` succeeds.
- **Tests:** see Test brief WP1.tests

### WP2 — Theme module and pre-paint script   [apps/web · group C, E, F]
- **Implements:** R-4 (`theme-color`), R-10, R-11, R-12, R-14 (fade trigger), R-15, R-16
- **Files:** create `apps/web/src/lib/theme.ts`
- **Skills to apply:**
  - engineering-paved-path:frontend-ui-architecture §1 (React-free theme infrastructure in `lib/` with a narrow name), §5 (`as const`, not `enum`), §6 (no `utils.ts`)
  - engineering-paved-path:next-best-practices `hydration-error.md` › Correcting before paint with an inline script and › suppressHydrationWarning semantics; `rsc-boundaries.md` › Choosing the environment
  - engineering-paved-path:security §7 (A05 XSS: the script string is built only from module constants; a stored value never reaches markup or the script), §16 JavaScript/Node.js (stored values are untrusted, so parse them against an allowlist)
  - engineering-paved-path:typescript-expert › Strict by Default
- **Constraints:**
  - Security-group file: it produces the string the layout injects with `dangerouslySetInnerHTML`.
  - No `import 'server-only'`, because a client component imports this module.
  - No access to `window`, `document`, `localStorage` or `matchMedia` at module top level, because the server layout imports this module (`hydration-error.md` › Common causes).
  - Every `localStorage` access sits in `try/catch` (AC-25).
  - The script string references nothing outside itself except `document`, `localStorage` and `matchMedia`.
- **Steps:**
  1. Write the types and constants from § Contract. `parseThemeChoice` returns the value when it is exactly `light`, `dark` or `system`, and `'system'` for anything else (AC-24).
  2. Build `THEME_INIT_SCRIPT` as the source of a self-invoking function, using `JSON.stringify` of `THEME_STORAGE_KEY` and `PALETTE_BACKGROUND`. The function:
     - reads storage in `try/catch` and parses it as in step 1;
     - resolves `system` with `matchMedia('(prefers-color-scheme: dark)').matches`;
     - sets `documentElement.dataset.themeChoice` and `documentElement.dataset.theme`;
     - creates `<meta name="theme-color">` with the palette background and inserts it as the first child of `document.head`;
     - never sets `data-theme-fading`.
  3. Write the internal `applyTheme(choice, { fade })`:
     1. Resolve the palette.
     2. If `fade` is set and the palette differs from the current `data-theme`, set `data-theme-fading` and (re)start one module-level timer that removes it after 250 ms.
     3. Set both attributes.
     4. Update the first `meta[name="theme-color"]:not([media])`, or create it as in step 2.
  4. `getThemeChoice()` returns `parseThemeChoice(document.documentElement.dataset.themeChoice)`.
  5. `setThemeChoice(choice)`:
     1. Write the choice to storage in `try/catch`; on failure, keep it in a module-level variable.
     2. Call `applyTheme(choice, { fade: true })`.
     3. Notify the subscribers.
     It sends no request (NFR-10).
  6. `restoreThemeChoice()`:
     1. Read storage. On failure, use the module-level choice, or else the current attribute.
     2. Call `applyTheme(…, { fade: false })`.
     This re-applies the attributes if a dev Strict Mode remount cleared them (`hydration-error.md` › Correcting before paint).
  7. `subscribeThemeChoice(onChange)` adds three listeners and returns one cleanup that removes them:
     - `storage` on `window`, when `key === THEME_STORAGE_KEY` or `key === null`: `applyTheme(parseThemeChoice(newValue), { fade: true })`, then `onChange` (AC-22, AC-42).
     - `pageshow` with `persisted`: `restoreThemeChoice()`, then `onChange` (AC-23, NFR-18).
     - `change` on the `matchMedia('(prefers-color-scheme: dark)')` list, when the choice is `system`: `applyTheme('system', { fade: true })`, then `onChange` (AC-27).
- **Done when:**
  - `apps/web/src/lib/theme.ts` exists with the § Contract exports.
  - `grep -nE "server-only|from 'react'" apps/web/src/lib/theme.ts` prints nothing.
  - `pnpm --filter @blog/web typecheck` passes.
- **Tests:** see Test brief WP2.tests

### WP3 — "Theme" menu button and layout wiring   [apps/web · group C, D, E, F]
- **Implements:** R-1, R-2, R-5, R-6 (AC-13), R-7 (AC-15), R-8, R-9, R-10 (AC-42), R-12, R-13, R-4 (`viewport.themeColor`)
- **Files:**
  - create, under `apps/web/src/app/_components/ThemeMenu/`:
    - `ThemeMenu.tsx`
    - `ThemeMenu.module.css`
    - `constants.ts`
    - `helpers.ts`
    - `index.ts`
    - `_components/ThemeIcon/ThemeIcon.tsx`
    - `_components/ThemeIcon/index.ts`
  - modify `apps/web/src/app/layout.tsx`
- **Skills to apply:**
  - engineering-paved-path:frontend-ui-architecture §1, §2, §3 (folder anatomy, one-line `index.ts`), §4 (icons and pure key helpers split out; no render functions), §7 (tier 1 `helpers.ts`, tier 2 hook), §10 (`@/` alias), §12 (`'use client'` on the leaf only; the layout stays a Server Component)
  - engineering-paved-path:react-best-practices §1, §2 (choice derived from the store, not copied), §4 (effects only for document listeners, with cleanup), §5, §11, §12, §13
  - engineering-paved-path:next-best-practices `SKILL.md` rules 2 and 11; `rsc-boundaries.md` › Choosing the environment; `hydration-error.md` › Correcting before paint and › suppressHydrationWarning semantics; `metadata.md` › Core rules (`themeColor` in `viewport`)
  - engineering-paved-path:security §7 (`dangerouslySetInnerHTML` only with the constant `THEME_INIT_SCRIPT`)
- **Constraints:**
  - Security-group file: `layout.tsx` (inline script).
  - `'use client'` appears only in `ThemeMenu.tsx`; `ThemeIcon` is imported by it.
  - `helpers.ts` is pure (`frontend-ui-architecture` §6).
  - No `localStorage` access in this WP: everything goes through `@/lib/theme`.
  - Colours only through the existing tokens. The menu border uses `var(--text-muted)`, not `--border` (R-13).
  - `ThemeMenu.tsx` is at most 200 lines (`react-best-practices` §1).
- **Steps:**
  1. In `constants.ts`, define `CHOICE_LABELS = { light: 'Light', dark: 'Dark', system: 'System' } as const` and `BUTTON_LABEL = 'Theme'`.
  2. In `helpers.ts`, write `nextFocusIndex(current: number, key: string, count: number): number | null`:
     - ArrowDown → `(current + 1) % count`
     - ArrowUp → `(current - 1 + count) % count`
     - Home → `0`
     - End → `count - 1`
     - any other key → `null`
  3. `ThemeIcon({ choice })` returns an inline SVG with `aria-hidden="true"` and `focusable="false"`, drawn in `currentColor`: sun for light, moon for dark, monitor for system. `ThemeIcon({ choice: 'checked' })` returns a check mark for menu items.
  4. `ThemeMenu.tsx` starts with `'use client'`.
     - State: `const choice = useSyncExternalStore(subscribeThemeChoice, getThemeChoice, () => 'system')` and `useLayoutEffect(() => restoreThemeChoice(), [])`. Also state `open`, refs for the button and the 3 items, and ids from `useId()`.
     - Markup: `<div className={styles.root}>` holding `<button type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId}>`, with no `aria-label`. Inside the button:
       - the 3 `ThemeIcon`s, each with a class that shows it only for its choice;
       - the visible text "Theme";
       - 3 visually hidden spans ": Light", ": Dark" and ": System", each `display: none` unless its choice matches (D-5).
  5. When `open`, render `<ul role="menu" id={menuId} aria-label="Theme">` with 3 `<li role="menuitemradio" tabIndex={-1} aria-checked={c === choice}>`. Each item shows its label, plus the check-mark `ThemeIcon` when checked (NFR-6).
  6. Opening:
     - The button's `onClick` toggles `open` (click, tap, Enter, Space; AC-32, AC-41).
     - The button's `onKeyDown` handles ArrowDown only: `preventDefault`, then open. ArrowUp is not handled, so the menu stays closed (AC-46, A-18).
     - When `open` turns true, focus the checked item (AC-33). This effect depends on `open` only, so a choice changed from another tab while the menu is open moves no focus (AC-42).
  7. Item keys:
     - Arrow keys, Home and End move focus using `nextFocusIndex` (AC-34, AC-35).
     - Enter or Space (with `preventDefault`) and click select the item (AC-36).
     - Escape closes the menu and focuses the button (AC-37, AC-38).
     - Tab or Shift+Tab, without `preventDefault`: focus the button synchronously, then close. The browser's default Tab move then starts from the button. Tab reaches the first focusable element after the button (AC-44), and Shift+Tab reaches "Blog" (AC-45). The choice does not change (AC-39).
  8. On select: if the item differs from `choice`, call `setThemeChoice(item)`. Then close the menu and focus the button (AC-9, AC-36). Choosing the checked item only closes the menu (A-14).
  9. While `open`, a `pointerdown` listener on `document` closes the menu when the target is outside `.root`. Add it in an effect and remove it in the effect's cleanup. It does not move focus (AC-40).
  10. `ThemeMenu.module.css`:
      - Root and print:
        - `.root { display: none; position: relative; }`
        - `:global(html[data-theme-choice]) .root { display: block; }` (D-6, AC-13)
        - `@media print { .root { display: none !important; } }` (AC-15)
      - Button: `min-width` and `min-height` 2.75rem, `inline-flex` with a gap, `color: var(--text)`, `background: var(--bg)`, `border: 1px solid var(--border)`.
      - Items: `min-height` 2.75rem, full width (NFR-4). Focus uses the global `:focus-visible`; items get a negative `outline-offset` so the outline stays inside the menu (NFR-3).
      - Menu (no `overflow: hidden`; AC-43, NFR-5, NFR-16):
        ```css
        .menu {
          position: absolute;
          top: calc(100% + 0.25rem);
          inset-inline-end: 0;
          z-index: 20;
          min-inline-size: 10rem;
          max-inline-size: calc(100vw - 2rem);
          margin: 0;
          padding: 0.25rem 0;
          list-style: none;
          background: var(--bg);
          color: var(--text);
          border: 1px solid var(--text-muted);
          border-radius: 0.375rem;
        }
        ```
      - A visually hidden class for the name suffixes.
      - Attribute-driven show and hide rules for icons and suffixes, for example `:global(html[data-theme-choice='dark']) .iconDark { display: inline-block; }`.
  11. `index.ts`: `export { ThemeMenu } from './ThemeMenu';`
  12. `layout.tsx`:
      - Use `<html lang="en" suppressHydrationWarning>`, then `<head><script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} /></head>` before `<body>`.
      - In the header, use `<div className="wrapper site-header-row">` holding the existing "Blog" link, then `<ThemeMenu />` (A-9, NFR-9). The skip link stays first (AC-30).
      - `viewport` keeps `colorScheme: 'light dark'` and gains `themeColor: [{ media: '(prefers-color-scheme: light)', color: PALETTE_BACKGROUND.light }, { media: '(prefers-color-scheme: dark)', color: PALETTE_BACKGROUND.dark }]`.
- **Done when:**
  - `pnpm --filter @blog/web typecheck` and `pnpm --filter @blog/web build` pass.
  - With web and API running, `curl -s localhost:3000/posts` contains, in this order: `<head>`, a `<script>` containing `localStorage`, `</head>`, then `aria-haspopup="menu"` inside `<header`. It also contains 2 `<meta name="theme-color"` tags with `media`.
  - `grep -rn "use client" apps/web/src` lists only `ThemeMenu.tsx`.
- **Tests:** see Test brief WP3.tests

### WP4 — README styling rule   [repo root · group F]
- **Implements:** R-18
- **Files:** modify `README.md`
- **Skills to apply:** none. This is a group F Markdown prose edit with no diagram, so neither `typescript-expert` nor `mermaid-diagram` applies.
- **Constraints:**
  - Insert only; no existing line of `README.md` changes (REC-1 accepted, user · 2026-10-23).
  - Keep the tree's column alignment: the description starts at column 27, as in `README.md:8-14`.
- **Steps:**
  1. After `README.md:9` (the "route-local UI" line), insert these two lines:
     ```
         src/app/globals.css   colour tokens; colours only through these tokens, never
                               prefers-color-scheme in a CSS module (the theme sets color-scheme on <html>)
     ```
- **Done when:**
  - `grep -n 'globals.css' README.md` prints one line inside the tree block.
  - `grep -c 'prefers-color-scheme' README.md` prints 1.
  - `git diff --stat README.md` shows 2 insertions and 0 deletions.
- **Tests:** see Test brief WP4.tests

## Implementation order
WP1 → WP2 → WP3 → WP4.
- WP3 imports WP2 and relies on the WP1 attribute rules.
- WP4 documents the WP1 rule and shares no file with WP1–WP3. It runs last only for review order.
- No gate exists, so nothing is skipped.

## Acceptance criteria
**Choosing**
- [ ] `/posts`, `/posts?page=2` and `/nope` (404) each show a "Theme" button in `header`, after "Blog", at the end of the row (R-1; AC-1)
- [ ] The open menu lists "Light", "Dark", "System" in that order. The accessibility tree shows 3 `menuitemradio` items with `aria-checked="true"` only on the current one. The button has a menu popup, and `aria-expanded` is false or true to match the menu (R-2; AC-2, NFR-13, NFR-14, NFR-15)
- [ ] Choosing a palette (R-3; AC-3, AC-4, AC-5, AC-7, A-17):
  - OS light, choose Dark: `getComputedStyle(document.documentElement).backgroundColor` = `rgb(18, 20, 26)`, with no document request in the network panel.
  - OS dark, choose Light: `rgb(255, 255, 255)`.
  - Choose System: the background follows the emulated OS.
- [ ] Dark chosen, flip the emulated OS to light: the `html` background stays `rgb(18, 20, 26)` (R-3; AC-6)
- [ ] The computed `color`, `background-color` and `border-color` of `html`, a post card and a pagination box are the same resolved colours under Dark on a light OS and under System on a dark OS (R-3; AC-10, A-17)
- [ ] The computed `color-scheme` of `html` is `dark` under Dark and `light` under Light. The effective `theme-color` is `#12141a` and `#ffffff` respectively (R-4; AC-11, AC-12)
- [ ] After choosing Dark, the button shows the moon icon and its accessible name is "Theme: Dark". With nothing stored, the name is "Theme: System" (R-5; AC-8, NFR-1)
- [ ] After a keyboard selection, `document.activeElement` is the "Theme" button (R-5; AC-9)
- [ ] With JS off: no "Theme" button is visible, the page follows the emulated OS, and the `/posts` HTML holds 12 `article` elements (R-6; AC-13, AC-28, AC-29)
- [ ] Dark chosen, print preview: light background, no button and no menu (R-7; AC-14, AC-15)

**Menu**
- [ ] Each of click, Enter, Space and ArrowDown on the button opens the menu, and focus lands on the checked item (R-8; AC-32, AC-33)
- [ ] With focus on the closed button, ArrowUp shows no menu and `aria-expanded` stays `"false"` (R-8; AC-46)
- [ ] In the open menu, ArrowDown on "System" focuses "Light" and ArrowUp on "Light" focuses "System". Home focuses "Light" and End focuses "System" (R-8; AC-34, AC-35)
- [ ] Selecting by click, Enter or Space closes the menu (`aria-expanded="false"`) (R-8; AC-36)
- [ ] Arrow to another item, then Escape: the menu closes, the palette is unchanged and focus is on the button (R-8; AC-37, AC-38)
- [ ] Arrow to another item, then Tab: the menu closes with `aria-expanded="false"` and the choice and palette are unchanged. The same holds with Shift+Tab (R-8; AC-39)
- [ ] After Tab in the open menu, `document.activeElement` is the next stop after the "Theme" button in the closed-menu Tab walk (R-8; AC-44)
- [ ] After Shift+Tab in the open menu, `document.activeElement` is the "Blog" link (R-8; AC-45)
- [ ] Clicking the page body closes the menu with the choice unchanged. Clicking the button twice opens the menu, then closes it (R-8; AC-40, AC-41)
- [ ] Every choice can be selected with the keyboard alone (R-8; NFR-2)
- [ ] Opening the menu leaves the bounding boxes of elements in `main` unchanged, and the menu is drawn over the cards. At 320 px the open menu box is inside the viewport with no horizontal scrollbar (R-9; AC-43, NFR-16)

**Remembering and sync**
- [ ] Choose Light, Dark, System, Dark in a row and reload: the page is dark (R-11; AC-16)
- [ ] With Dark chosen, a reload and `/posts?page=2` in a new tab both render dark (R-11; AC-17)
- [ ] With site data cleared, "System" is checked. With `localStorage.theme = 'blue'` and a reload, the page follows the OS and "System" is checked (R-11; AC-21, AC-24)
- [ ] With storage blocked in devtools, choosing Dark turns the page dark, and a reload follows the OS (R-11; AC-25)
- [ ] Two tabs: choosing Dark in tab B turns tab A dark with no reload. If tab A's menu is open, it stays open with "Dark" checked and focus does not move (R-10; AC-22, AC-42)
- [ ] Change the choice in tab B, then go back in tab A from another site (bfcache): tab A shows the stored choice (R-10; AC-23)

**First paint, motion and non-functional**
- [ ] Performance filmstrips of a reload with Dark stored on a light OS, and of following "Next": no light frame, and the button never shows another choice's icon (R-12; AC-18, AC-19, AC-20)
- [ ] The dev build console shows no hydration error in any of the 6 stored-choice × OS combinations (R-12; NFR-11)
- [ ] Lighthouse mobile on `/posts` with Dark stored reports CLS ≤ 0.1 (R-12; NFR-12)
- [ ] In both palettes, a contrast checker gives ≥ 3:1 for the focus outline on the button and items, the button icon, the menu border against the page and cards, and the check mark, and ≥ 4.5:1 for text (R-13; NFR-3, NFR-5)
- [ ] The measured button and item boxes are ≥ 44×44 px. In grayscale emulation, the checked item is still identifiable by its check mark (R-13; NFR-4, NFR-6)
- [ ] At 320 px, "Blog" and "Theme" sit on one header row with no horizontal scrollbar. With the menu closed, the Tab walk is "Skip to content", "Blog", "Theme", then `main`, with no menu item as a stop (R-1, R-17; NFR-8, NFR-9, AC-30)
- [ ] A filmstrip of a choice shows intermediate colours and reaches the final palette within 200 ms. With reduced motion emulated, it shows no intermediate colours (R-14; NFR-7, NFR-17)
- [ ] Filmstrips of a reload, a "Next" click and a back/forward restore with Dark stored show no intermediate colours (R-14; NFR-18)
- [ ] The network panel shows no request while choosing (R-15; NFR-10)
- [ ] With no choice stored and the OS dark, the `html` background is `rgb(18, 20, 26)`. Under System, flipping the emulated OS switches the palette with no reload (R-16; AC-26, AC-27)
- [ ] The API request log shows 1 call for 5 reloads of `/posts` within 60 s, with readers on different palettes (R-17; AC-31)

**Docs**
- [ ] The `README.md` tree has a `src/app/globals.css` entry saying colours come only from its tokens, never from `prefers-color-scheme` in a CSS module. No other README line changed (R-18)

## Test plan
| Area | Command | Needs (service / Docker / browser / keys) | Covers |
|---|---|---|---|
| web typecheck | `pnpm --filter @blog/web typecheck` (`apps/web/package.json:10`) | none | WP2, WP3 |
| all typecheck | `pnpm -r typecheck` (`package.json:12`) | none | regression across packages |
| web build | `pnpm --filter @blog/web build` (`apps/web/package.json:8`) | `SITE_URL`, `API_BASE_URL` in the root `.env` | WP1–WP3 compile and prerender |
| lint | none: the repo has no linter or CI workflow | — | — |
| web tests | none: no web suite (spec A-12, P-2 deferred) | — | — |
| demo | TP-1 | Docker Postgres, the API, a browser with devtools, Lighthouse | every web acceptance criterion above |
| docs | the greps in WP4 "Done when" | none | WP4 |

No suite makes paid calls or uses real credentials.

## Docs to update
- `README.md`: two lines in the `apps/web` tree after line 9 stating the colour-token rule (REC-1 accepted, WP4).

## Recommendations (not in the plan until you accept them)
- **REC-1 Record the styling rule in `README.md`.** Accepted by the user on 2026-10-23; now WP4 / R-18.
  - Why: after D-1, a module rule under `@media (prefers-color-scheme: dark)` would ignore the reader's choice and break AC-3 and AC-4. Nothing in the repo says so today (`README.md:5-30`).
  - Cost: 2 lines.
- **REC-2 ArrowUp on the closed button opens the menu.** Rejected by the user on 2026-10-23. The spec now has AC-46 and A-18 (S-9): ArrowUp on the closed button does nothing.

## Execution mode
- **Chosen (user, 2026-10-23):** single-agent, followed by plan-verifier ∥ architecture-reviewer. This matches my recommendation. The deciding facts:
  - 1 code area and 4 small work packages.
  - No contract, schema, dependency or gate.
  - No automated test can be written (A-12), so test-writer's T1 and T2 passes would be empty.
  - The one security-group file (the `layout.tsx` inline script, built from constants) is covered by the two reviewers.
- **Single-agent steps (main session):**
  1. Implement WP1 → WP2 → WP3 → WP4.
  2. Run web typecheck, all typecheck, web build and the WP4 greps.
  3. Walk TP-1 for the criteria a browser session can check.
  4. Run plan-verifier ∥ architecture-reviewer on the result.
  5. Run at most 2 fix rounds.
  6. Run engineering-insights.

  What this gives up: the same model writes and checks the code, and every web criterion is checked by hand. The two reviewers are the independent check.
- **Multi-agent split (not chosen):**
  1. Skip test-writer T1 (no web suite).
  2. Implementer #1: WP1 → WP2 → WP3 → WP4.
  3. Skip test-writer T2.
  4. plan-verifier ∥ architecture-reviewer.
  5. At most 2 fix rounds.
  6. engineering-insights.

## Risks & open questions
- **Assumption: pre-paint script placement.** Next 16.4.2 emits the layout's raw `<head><script>` in the server HTML before `<body>`, and the script runs before first paint.
  - Settle with the WP3 "Done when" curl and the AC-18 filmstrip.
  - If it fails, move the script to the first child of `<body>` and re-run AC-18.
- **Assumption: React 19.3 hydration of `<head>`.** React skips unexpected `<head>` nodes, so it tolerates the `<meta name="theme-color">` the script inserts.
  - Settle with NFR-11.
  - If a mismatch appears, update the media tags' `content` instead of inserting a tag.
- **Assumption: possible dev warning about the `<script>` element.** A dev-mode React warning about it (not a hydration mismatch) may appear in the console. If it does, the implementer reports it as a deviation and does not suppress it.
- **Assumption: `light-dark()` browser support.** It has been Baseline since 2024 (Chrome 123, Safari 17.5, Firefox 120). Older browsers drop every token and render default black on white. `research-tools:researcher` can confirm current support if a support floor is needed.
- **Tab behaviour (AC-39, AC-44, AC-45).** It relies on focusing the button synchronously in `keydown`, before the menu unmounts. If React's flush moves focus to `body` first, Tab lands on "Skip to content" instead. Settle in the AC-44 and AC-45 demo.
- **CSP.** There is none today (`apps/web/next.config.ts:9-15`). A future CSP must allow this inline script by hash or nonce (`scripts.md` › CSP nonces), or AC-18 breaks.
- **Spec commit.** `docs/specs/theme-toggle.md` is modified and not committed (`git status`). It holds the `**Status:** approved` line and spec-creator's fold-in of A-17, A-18, AC-44–AC-46 and S-9. Commit it before writing `@ <sha>` in the header.
- **Demo hygiene.**
  - Stop dev or test servers by PID only (`INSIGHTS.md:18`).
  - Do not run `pnpm` or `next dev` inside a worktree copy (`INSIGHTS.md:19`).
  - If `apps/web/AGENTS.md` appears, it is a protected path: do not commit it.

<!-- test-brief -->
## Test brief
### TP-1 (demo, run in a browser; web rows are `demo` / `inspection` / `analysis` per spec A-12)
1. Run `pnpm db:up`, then `pnpm --filter @blog/api db:migrate` and `pnpm --filter @blog/api db:seed`.
2. Use `pnpm dev` for the AC and NFR walks. For NFR-12, run `pnpm --filter @blog/web build && pnpm --filter @blog/web start` and use Lighthouse mobile.
3. In devtools:
   - In the Rendering panel, emulate the OS colour scheme and `prefers-reduced-motion`.
   - In settings, toggle JavaScript and blocked storage.
   - Use Performance filmstrips for AC-18–AC-20, NFR-7, NFR-17 and NFR-18.
4. Walk § Acceptance criteria in order, including the menu checks AC-44, AC-45 and AC-46. Check palettes on resolved computed colours (A-17). For AC-31, count `GET /posts` lines in the API log.

### WP1.tests
- none: the web app has no test suite (spec A-12). Verified by TP-1 against AC-3–AC-6, AC-10, AC-11, AC-14, AC-26, AC-28, NFR-7, NFR-17 and NFR-18. plan-verifier checks the WP1 "Done when" greps.

### WP2.tests
- none: no web suite (A-12). Verified by TP-1 against AC-12, AC-16–AC-19, AC-21–AC-25, AC-27, NFR-10 and NFR-11.

### WP3.tests
- none: no web suite (A-12). Verified by TP-1 against AC-1, AC-2, AC-7–AC-9, AC-13, AC-15, AC-20, AC-29–AC-46, NFR-1–NFR-6, NFR-8, NFR-9 and NFR-12–NFR-16.

### WP4.tests
- none: a docs change. plan-verifier checks the WP4 "Done when" greps and `git diff --stat README.md` by inspection.

## Reference: tooling
Provenance only, not plan steps. Recorded 2026-10-23 from `~/.claude/plugins/installed_plugins.json`, `.claude/settings.json` and the agents' frontmatter.

| Tool | Version | Role in this plan |
|---|---|---|
| Claude Code main session | model Opus 5.5 (`claude-opus-5-5`) | brief, user questions, saved the plan verbatim, header and Approved line |
| `sdd-engineering:implementation-planner` agent | plugin `sdd-engineering` 1.3.0 (commit `3be07ae`); agent model `opus`, effort `high` | wrote this plan and its two revisions |
| `sdd-engineering:spec-creator` agent | plugin `sdd-engineering` 1.3.0 (commit `3be07ae`); agent model `opus`, effort `high` | plan-defaults round on the spec (A-17, A-18, AC-44–AC-46, S-9) |
| `spec-lint.sh` | plugin `sdd-engineering` 1.3.0 | spec check before planning and after the defaults round |
| `engineering-paved-path` skills cited in WP1–WP3 (`frontend-ui-architecture`, `next-best-practices`, `react-best-practices`, `security`, `typescript-expert`) | plugin `engineering-paved-path` 1.1.0 (commit `6e5c0c7`) | rules the work packages bind to |
| `research-tools`, `architecture-review` | 1.1.0 each (commit `6e5c0c7`) | enabled dependencies; `architecture-reviewer` is planned for review, not used yet |

Marketplace: `dev-digest-ai-latest` — `kosyakovr/dev-digest-ai-marketplace`, ref `latest`, auto-update on, so versions may differ when the plan is executed.
