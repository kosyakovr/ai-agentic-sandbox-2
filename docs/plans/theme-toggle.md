# Implementation Plan: Theme toggle (light / dark)
**Status:** approved (user · 2026-10-23)
**Spec:** docs/specs/theme-toggle.md
Areas: apps/web · Requirements: docs/specs/theme-toggle.md · Ticket: none

## Summary
This adds a "Theme" control to the site header of every page, offering System, Light and Dark. The choice is saved in this browser's `localStorage`. A small inline script in `<head>` applies it before first paint by setting `data-theme` on `<html>`. The existing token values are reused unchanged.
- Nothing about the theme reaches the server. There are no new routes, contracts, dependencies or tests, and the API is untouched.
- Without JS the control is absent and the OS preference applies.

**Gates:** none. No dependency, schema, migration, protected path or public surface changes.

**Defaults you may want to overrule:**
- R-7: the control is not in the server HTML. It appears once the page has hydrated, already showing the stored option.
- R-14: the control uses native radio buttons, so the arrow keys also switch the theme, not just Space.
- R-2: the 11 dark colour values appear in two CSS blocks (see REC-1).

**Recommendations:** REC-1 (`light-dark()`) rejected; REC-2 (AC-27 reworded) accepted and folded into the spec (user · 2026-10-23).

**Execution mode — your choice needed:** multi-agent or single-agent? I recommend **single-agent**: one area, 2 work packages, no contract or schema change, and no test for test-writer to write (spec A-11, P-3 deferred). The layout's inline script is a security-group file, so ask for plan-verifier and architecture-reviewer once at the end.

## Requirements review
| ID | Requirement (short) | Source | Verdict | Note / default taken |
|---|---|---|---|---|
| R-1 | One control named "Theme" in every page header, with exactly the options System, Light and Dark, exposed as a group with exactly one checked option | theme-toggle.md AC-1, AC-2, AC-28 | ok | Default: a native `<fieldset>` with a visually hidden `<legend>Theme</legend>` and three radio inputs with visible text labels (no icons). |
| R-2 | Light and Dark force their token set and the computed `color-scheme`; System follows the OS | AC-3, AC-4, AC-5, AC-8 | ok | Default: an explicit choice is the attribute `data-theme="light\|dark"` on `<html>`, and CSS keeps the existing values (`apps/web/src/app/globals.css:2-12`, `:17-27`), so the dark values appear in two selector blocks (D-5, REC-1). |
| R-3 | A pick applies without a reload and with no transition | AC-6, AC-7, A-5 | ok | No `transition` or `animation` exists in `apps/web/src` today (git grep: no match), and none is added. |
| R-4 | The control is on both kinds of 404 | AC-9 | ok | Both render inside the root layout: unmatched URLs via `apps/web/src/app/not-found.tsx:2`, and out-of-range pages via the proxy rewrite at `apps/web/src/proxy.ts:22`. Nothing extra to build. |
| R-5 | Covers are unchanged in both themes | AC-10, A-9 | already built | There is no filter or overlay (`PostCard.module.css:12-20`), and the cover box background is `--placeholder` (`:15`), which follows the token set. No PostCard file changes. |
| R-6 | The choice survives a reload, a new tab and a new session, and the last pick wins | AC-11, AC-20, A-4 | ok | Default: `localStorage` key `theme` holds `light` or `dark`, and picking System removes the key. |
| R-7 | First paint uses the stored theme, the control is correct the first time it shows, and there is no hydration warning | AC-12, AC-13, AC-19, § Contract ("the plan decides") | ok | D-1: an inline script in `<head>` applies the theme. Default: the control is absent from the server HTML and appears after hydration already showing the stored option, so on slow JS the header briefly has no control. |
| R-8 | The theme is kept across in-site links and Back/Forward | AC-14, AC-15 | ok | Soft navigations keep the `<html>` attribute, and full loads run the script again. Default: a page restored from the back/forward cache (`pageshow` with `persisted`) re-reads storage. |
| R-9 | No theme leaks between visitors | AC-16 | ok | Nothing about the theme is read or rendered on the server, so the server HTML is the same for every visitor. |
| R-10 | If storage is blocked, the pick applies to the current page view with no error | AC-17, A-6 | ok | Default: every storage call is in a try/catch, and the pick is kept in memory for the current page view. |
| R-11 | An unknown or markup-shaped stored value means System, and no element is created from it | AC-18, NFR-6, A-7 | ok | Only the exact strings `light` and `dark` are acted on. The stored value is only compared, never written into the HTML or the DOM. |
| R-12 | System is the default and follows live OS changes; Light and Dark ignore OS changes | AC-21, AC-22, AC-23 | ok | The CSS `@media (prefers-color-scheme: dark)` block handles live OS changes without JS. |
| R-13 | Without JS: the OS theme applies and no control is shown | AC-24, AC-25 | ok | The script does not run, so there is no `data-theme`, and the control renders nothing on the server. A reader with Dark stored who turns JS off gets the OS theme, which is what AC-24 asks for. |
| R-14 | The control is the third Tab stop, Space applies an option, and focus stays on the control | AC-26, AC-27, AC-29 | ok | AC-27 now names Space or an arrow key (REC-2 accepted, spec S-10). Native radio behaviour: arrow keys select and apply, and Tab enters the group at the checked option. |
| R-15 | Option contrast, a selected state visible in greyscale, 24×24 targets and a visible focus ring | NFR-1, NFR-2, NFR-3, NFR-4 | ok | Default: reuse the Pagination pairs (`Pagination.module.css:19-36`). Unselected: `--text` on `--bg` with a `--border` outline. Selected: `--current-bg`/`--current-text`, bold. Boxes are at least 2.75rem tall and wide. The focus ring is 3px `--focus`, as in `globals.css:53-56`. |
| R-16 | A pick sends no request | NFR-5, A-10 | ok | No fetch, form, cookie or server action is used. |
| R-17 | Existing behaviour keeps working: dark first frame on a dark OS with nothing stored, contrast, CLS ≤ 0.1, 320 px reflow, `/posts` readable without JS, 404 with noindex | AC-30–AC-35 | ok | CLS default: the header row keeps a fixed 2.75rem height, so the control appearing after hydration moves nothing. |

`spec-lint.sh` printed nothing. Every § Self-check box is ticked, the spec has no `[NEEDS CLARIFICATION` marker, and its status is `approved`. P-1, P-2 and P-3 are deferred and not planned. § Reference: tooling was ignored.

## Goal
On any page, a reader can pick System, Light or Dark in the header. The choice is applied at once, kept in this browser and in place from the first painted frame. A reader who never uses the control, or has JS off, keeps the OS behaviour.

## Non-goals
- No listener for the `storage` event anywhere in `apps/web/src`, so there is no cross-tab live sync (P-1).
- No `theme-color` or `themeColor` in metadata or viewport (P-2).
- No test file, test runner or test dependency. No `package.json` changes and `pnpm-lock.yaml` is unchanged (P-3).
- No new route: no `page.tsx`, `route.ts` or `actions.ts` is added under `apps/web/src/app`.
- No change to `apps/api/**`, `packages/**`, `apps/web/src/proxy.ts`, `apps/web/next.config.ts`, `apps/web/src/app/posts/**` or `apps/web/public/**`.
- No `cookies()` or `headers()` call in `apps/web/src`.
- No colour value changes: the 11 light and 11 dark values in `globals.css` stay as they are at `globals.css:2-12` and `:17-27`.
- No `transition` or `animation` property in `apps/web/src`, and no print stylesheet.

## What already exists (do not rebuild)
- Light tokens on `:root` and dark tokens under `@media (prefers-color-scheme: dark)`: `apps/web/src/app/globals.css:1-29`. Components use only `var(--…)`.
- The global focus ring: `apps/web/src/app/globals.css:53-56`. Header styles: `:64-76`. Skip link: `:78-91`.
- Root layout: skip link → header with the "Blog" link to `/posts` → `main`, at `apps/web/src/app/layout.tsx:17-32`. Viewport `colorScheme: 'light dark'`: `:11-13`.
- One not-found UI for unmatched URLs and the proxy rewrite: `apps/web/src/app/not-found.tsx:2`, `apps/web/src/app/posts/not-found.tsx:9-17`, `apps/web/src/proxy.ts:21-25`.
- Selected and outlined box styles that already pass the posts-list contrast checks: `apps/web/src/app/posts/_components/Pagination/Pagination.module.css:19-36`.
- Component folder and barrel convention: `apps/web/src/app/posts/_components/Pagination/index.ts:1`, plus `README.md:8-13` for placement.
- The `@/*` alias (`apps/web/tsconfig.json:12-14`). Strict TS with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and `verbatimModuleSyntax` (`tsconfig.base.json:8-13`). DOM libs (`apps/web/tsconfig.json:4`).
- Web scripts: `build` (`apps/web/package.json:8`), `typecheck` = `next typegen && tsc --noEmit` (`:10`).
- Not present: any `'use client'` module (this is the first one), CSP or security headers (`apps/web/next.config.ts:9-15`), a linter, CI, CLAUDE.md or AGENTS.md, and any theme code on this branch (git grep and `git log --grep theme`: no match).

## Contract
No route, API, shared-schema or DB change.

**Browser storage:** `localStorage["theme"]` holds `"light"` or `"dark"`. "System" means the key is absent. Any other value is treated as System and left in place.

**DOM:** `<html data-theme="light">` or `<html data-theme="dark">`, and no attribute for System. Two things set it: the inline script on every full load, and `ThemeControl` on a pick, on hydration and on a back/forward-cache restore. `<html>` gets `suppressHydrationWarning`.

**CSS (`globals.css`):**
- `:root`: the light values plus `color-scheme: light dark`
- `:root[data-theme='light']`: `color-scheme: light`
- `:root[data-theme='dark']`: `color-scheme: dark` plus the 11 dark values
- `@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) { the 11 dark values } }`

**`apps/web/src/lib/theme.ts`** (no `'server-only'`, no `'use client'`) exports:
- `THEME_CHOICES = ['system', 'light', 'dark'] as const`
- `type ThemeChoice = (typeof THEME_CHOICES)[number]`
- `THEME_STORAGE_KEY = 'theme'`
- `THEME_ATTRIBUTE = 'data-theme'`
- `parseThemeChoice(value: unknown): ThemeChoice`: `'light'` or `'dark'` for exactly those strings, otherwise `'system'`
- `THEME_INIT_SCRIPT: string`: a constant IIFE equivalent to `(function(){try{var v=localStorage.getItem("theme");if(v==="light"||v==="dark")document.documentElement.setAttribute("data-theme",v)}catch(e){}})()`, built only from the two constants above with `JSON.stringify`

**`apps/web/src/app/_components/ThemeControl/`** exports `ThemeControl` (no props) through `index.ts`.
- **Server HTML:** nothing.
- **After hydration:** `<fieldset>` › visually hidden `<legend>Theme</legend>` and 3 × `<label><input type="radio" name="theme" value="system|light|dark"><span>System|Light|Dark</span></label>`, in that order. Exactly one is checked.

## Decisions taken
| Decision | Why | Rejected alternative |
|---|---|---|
| D-1 Apply the stored choice with a synchronous inline script in the root layout's `<head>`, reading `localStorage` | This is the documented pre-paint pattern (`next-best-practices` `hydration-error.md` › Correcting before paint with an inline script; Next 16 docs `01-app/02-guides/preventing-flash-before-hydration.md:244-294`). The server stays visitor-agnostic (AC-16). | Reading a cookie with `cookies()` in the layout makes every route request-time (`hydration-error.md:82-83`), and with JS off a stored cookie would still theme the page, which AC-24 forbids. |
| D-2 A raw `<script dangerouslySetInnerHTML>` | It runs during HTML parsing, before first paint. | `next/script` `beforeInteractive`, which the guide does not use for pre-paint DOM fixes. |
| D-3 `ThemeControl` reads its state with `useSyncExternalStore`, whose server snapshot is `null`, so it renders nothing on the server and during hydration | The first visible state is already correct (AC-13), there is no mismatch (AC-19), and no-JS gets no control (AC-25) for free (`hydration-error.md` › Two-pass rendering for client-only values). | Server-rendering "System" and fixing it on the client: that shows System while Dark is stored, and `suppressHydrationWarning` is one level deep only (`hydration-error.md:97`). |
| D-4 A native `fieldset` with radio inputs | One Tab stop, native group, name and checked semantics (AC-28), and Space checks a radio (AC-27). | A `div role="group"` with three `aria-pressed` buttons: three Tab stops and hand-built state. |
| D-5 The dark values appear in two selector blocks | No browser floor is stated in either spec. In a browser without `light-dark()`, every token would become invalid and all colours would be lost in both themes. | `light-dark()` (REC-1). |
| D-6 Placement: `ThemeControl` under `app/_components/` (its only consumer is the root layout), and the shared constants and script in `lib/theme.ts` | The layout and the control both need them, and the layout must not reach into the control's folder (`frontend-ui-architecture` §1, §2, §6, §10). | Putting `ThemeControl` in `src/components/` (no second consumer), or putting the script in the control's `constants.ts`. |
| D-7 The page-view choice is a module-level variable plus a listener set in `ThemeControl.tsx` | One consumer, and the state mirrors browser singletons (`document`, `localStorage`). A provider would have to wrap the whole document (`frontend-ui-architecture` §8, §12). | A React context provider in the layout. |

## Gates — need user approval before implementation
- none

## Work packages
### WP1 — Theme tokens, init script and root layout   [apps/web · group C, E, F]
- **Implements:** R-2, R-3, R-6 (read side), R-7 (first paint), R-9, R-11, R-12, R-13 (AC-24), R-17
- **Files:**
  - create `apps/web/src/lib/theme.ts`
  - modify `apps/web/src/app/globals.css`, `apps/web/src/app/layout.tsx`
- **Skills to apply:**
  - engineering-paved-path:frontend-ui-architecture §1, §5 (`as const`, no enum), §6 (narrow `lib/` name, no `utils`), §10 (`@/` alias), §12
  - engineering-paved-path:next-best-practices `SKILL.md` rule 11; `hydration-error.md` › Correcting before paint with an inline script, › suppressHydrationWarning semantics; `metadata.md` › Core rules (keep the `viewport` export)
  - engineering-paved-path:security §1 (a build-time constant is not attacker-controlled), §7 XSS (no stored value is ever put into HTML)
  - engineering-paved-path:typescript-expert › Code Review Checklist (Type Safety), Strict by Default
- **Constraints:**
  - Imports use `@/` (`apps/web/tsconfig.json:12-14`).
  - `lib/theme.ts` is imported by both a Server and a Client Component, so it has neither `'server-only'` nor `'use client'` and touches no browser global at module top level.
  - Only `lib/config.ts` reads `process.env` (`apps/web/src/lib/config.ts:13`). Nothing here reads env.
  - Keep the `metadata` and `viewport` exports unchanged (`layout.tsx:5-13`).
  - INSIGHTS.md:23: proxy and pages are separate bundles. The theme keeps no server state, so `proxy.ts` is not touched.
  - INSIGHTS.md:27: 404s stay on the proxy rewrite. Add no `notFound()` call.
  - Security-group files: `layout.tsx` (`dangerouslySetInnerHTML`) and `lib/theme.ts` (script text, untrusted stored value).
- **Steps:**
  1. **`lib/theme.ts`.** Write the exports exactly as in § Contract. `THEME_INIT_SCRIPT` reads storage inside try/catch and sets the attribute only when the value is strictly `"light"` or `"dark"`. It makes no other DOM write and uses no `innerHTML`, `document.write` or `eval`.
  2. **`globals.css`.** Restructure the token selectors per § Contract:
     - copy the 11 dark values character for character from `:17-27` into both dark blocks
     - add `color-scheme` to `:root` and to both `data-theme` rules
     - add `.site-header-row { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; min-height: 2.75rem; }`
     - leave the other rules unchanged
  3. **`layout.tsx`.**
     - `<html lang="en" suppressHydrationWarning>`
     - add `<head><script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} /></head>` as the first child of `<html>`
     - give the header's inner `div` the classes `wrapper site-header-row`
- **Done when:**
  - `pnpm --filter @blog/web typecheck` and `pnpm --filter @blog/web build` exit 0.
  - On a running server, `curl -s localhost:3100/nope` returns HTML whose `<head>` contains the inline script (it contains `localStorage.getItem`), and whose `<html` start tag has no `data-theme` attribute.
  - In a browser on an emulated light OS, `localStorage.setItem('theme','dark')` followed by a reload renders the dark tokens, and `getComputedStyle(document.documentElement).colorScheme` is `dark`.
  - With `'blue'` stored, the page follows the OS.
  - In `globals.css`, the two dark blocks hold the same 11 declarations as `:17-27` in the old file.
- **Tests:** see Test brief WP1.tests

### WP2 — `ThemeControl` in the header   [apps/web · group C, D, E, F]
- **Implements:** R-1, R-3 (AC-6), R-6 (write side), R-7 (AC-13, AC-19), R-8, R-10, R-13 (AC-25), R-14, R-15, R-16, R-17 (AC-32, AC-33)
- **Files:**
  - create `apps/web/src/app/_components/ThemeControl/ThemeControl.tsx`, `ThemeControl.module.css`, `constants.ts`, `index.ts`
  - modify `apps/web/src/app/layout.tsx`
- **Skills to apply:**
  - engineering-paved-path:frontend-ui-architecture §1, §2 (route-local first), §3 (folder anatomy, PascalCase, no empty files), §4 (module-level functions outside the component body), §5 (`constants.ts` next to the component), §7, §8, §11 (one-line barrel), §12 (`'use client'` on the leaf only)
  - engineering-paved-path:react-best-practices §1, §2, §4 (the effect syncs an external system, the `<html>` attribute, and cleans up its listeners), §11 (key = option value), §12, §13
  - engineering-paved-path:next-best-practices `rsc-boundaries.md` › Choosing the environment; `directives.md` › 'use client'; `hydration-error.md` › Two-pass rendering for client-only values, › Correcting before paint with an inline script (dev Strict Mode re-apply bullet, `:86-87`)
  - engineering-paved-path:security §1, §7 (the stored value is compared, never rendered)
  - engineering-paved-path:typescript-expert › Code Review Checklist (Type Safety)
- **Constraints:**
  - `'use client'` only in `ThemeControl.tsx`. `layout.tsx` stays a Server Component.
  - The barrel follows `Pagination/index.ts:1`: `export { ThemeControl } from './ThemeControl';`.
  - The UI strings are inline English constants, as the project does (`Pagination.tsx:16`, spec A-3). There is no i18n catalogue.
  - The new CSS uses only existing tokens and declares no `transition` or `animation`.
  - Use no `<form>`, fetch, cookie or server action (NFR-5), and no `storage` event listener (P-1).
  - Security-group file: `ThemeControl.tsx` (reads and writes untrusted storage).
- **Steps:**
  1. **`constants.ts`.** `THEME_OPTIONS`: `[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]`, typed with `ThemeChoice` from `@/lib/theme`, `as const`.
  2. **`ThemeControl.tsx`.** Module-level functions sit above the component:
     - `readStoredChoice()`: `parseThemeChoice(localStorage.getItem(THEME_STORAGE_KEY))`, or `'system'` if storage throws
     - `let pageChoice: ThemeChoice | null = null`, plus a listener set
     - `getSnapshot = () => pageChoice ?? readStoredChoice()`; `getServerSnapshot = () => null`
     - `chooseTheme(c)`: set `pageChoice = c`, then try `setItem` (light or dark) or `removeItem` (system) and ignore errors, then notify listeners
     - `subscribe(listener)`: add the listener and a `pageshow` handler that, when `event.persisted`, resets `pageChoice = null` and calls the listener; return cleanup for both
     - `applyToDocument(c)`: set or remove `THEME_ATTRIBUTE` on `document.documentElement`

     The component:
     - `const choice = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)`
     - `useLayoutEffect(() => { if (choice !== null) applyToDocument(choice) }, [choice])`, which also re-applies after the dev Strict Mode remount
     - `choice === null` → return `null`
     - otherwise render the § Contract markup, with `checked={choice === value}` and `onChange={() => chooseTheme(value)}`
  3. **`ThemeControl.module.css`.**
     - fieldset reset: `border: 0; margin: 0; padding: 0; min-inline-size: 0; display: flex; gap: 0.25rem`
     - visually hidden legend and inputs (clip pattern; inputs stay focusable)
     - `.box`: `display: inline-flex; align-items: center; justify-content: center; min-width: 2.75rem; min-height: 2.75rem; padding: 0 0.5rem; border: 1px solid var(--border); border-radius: 0.375rem; color: var(--text)`
     - `input:checked + .box`: `--current-bg` background and border, `--current-text` colour, `font-weight: 700`
     - `input:focus-visible + .box`: `outline: 3px solid var(--focus); outline-offset: 2px`
  4. **`index.ts`.** The one-line barrel.
  5. **`layout.tsx`.** Render `<ThemeControl />` right after the "Blog" link inside the `site-header-row` div.
- **Done when:**
  - `pnpm --filter @blog/web typecheck` and `pnpm --filter @blog/web build` exit 0.
  - `curl -s localhost:3100/posts | grep -c '<fieldset'` prints `0`.
  - In a browser, the accessibility tree of `/posts`, `/posts?page=2` and `/nope` shows one group "Theme" in the `banner` landmark, with radios "System", "Light" and "Dark", exactly one checked.
  - Picking "Dark" on a light OS turns the page dark with no document request in the network panel.
  - At a 320 px viewport, `document.documentElement.scrollWidth` is 320 and the header's `offsetHeight` matches its value with JS disabled.
- **Tests:** see Test brief WP2.tests

## Implementation order
WP1 → WP2, one after the other (both modify `layout.tsx`). WP1 works on its own: the OS behaviour is kept and a stored value set by hand in devtools is honoured. If WP2 is dropped, there is no control. No gate can block either WP.

## Acceptance criteria
**Control**
- [ ] `/posts`, `/posts?page=2` and `/nope` each show exactly one group named "Theme" inside `header`, with exactly 3 options, "System", "Light" and "Dark", one checked (R-1; AC-1, AC-2, AC-28)
- [ ] On an emulated light OS, picking Dark gives the dark token values on `html` (background `#12141a`, text `#eceef2`). On a dark OS, picking Light gives `#ffffff` and `#1a1d23`. Picking System gives the set that matches each emulated scheme (R-2; AC-3, AC-4, AC-5)
- [ ] With Light or Dark selected, `getComputedStyle(document.documentElement).colorScheme` is `light` or `dark` respectively (R-2; AC-8)
- [ ] A pick causes no document request, and a performance recording shows the colours change in one frame (R-3; AC-6, AC-7)
- [ ] `/nope` and `/posts?page=99` answer 404, and their header holds the control (R-4; AC-9)
- [ ] Cover pixels match in screenshots of both themes, and no PostCard file is changed (R-5; AC-10)

**Persistence and first paint**
- [ ] With Dark picked, a browser restart followed by opening `/posts` shows dark. Picking Dark, Light, Dark and reloading shows dark (R-6; AC-11, AC-20)
- [ ] A 6× CPU-throttled recording with Dark stored on a light OS has no light frame, and the first frame showing the control shows Dark checked (R-7; AC-12, AC-13)
- [ ] The console shows no hydration-mismatch warning on load with System, Light or Dark stored, in both `next start` and `next dev` (R-7; AC-19)
- [ ] With Dark active, clicking "Next" and the "Blog" link opens dark pages. Page 1 → page 2, picking Light, then Back shows page 1 light. `/posts` → typing `/nope`, picking Light, then Back shows `/posts` light (R-8; AC-14, AC-15)
- [ ] Two browser profiles with Dark and Light stored, opening the same URL, each show their own theme (R-9; AC-16)
- [ ] With site data blocked for the origin: picking Dark turns the page dark with no console error or message, and a reload shows the OS theme (R-10; AC-17)
- [ ] Stored `blue`, or stored `"><img src=x onerror=alert(1)>`: the page follows the OS, "System" is checked, and `document.querySelectorAll('img[src="x"]').length` is 0 (R-11; AC-18, NFR-6)

**System default and no-JS**
- [ ] In a clean profile, "System" is checked. With System selected, flipping the emulated scheme switches the page without a reload. With Dark selected, it stays dark (R-12; AC-21, AC-22, AC-23)
- [ ] With JS disabled on an emulated dark OS, the page is dark and the accessibility tree has no "Theme" group. `/posts` answers 200 with `article` elements (R-13, R-17; AC-24, AC-25, AC-34)

**Keyboard and accessibility**
- [ ] A Tab walk from page load goes: "Skip to content", "Blog", the theme control, then content in `main`. Focusing "Dark" and pressing Space applies Dark; pressing an arrow key selects and applies the next option. After a pick, `document.activeElement` is an input inside the fieldset (R-14; AC-26, AC-27, AC-29)
- [ ] In both themes, option text is ≥ 4.5:1 and the option boundary ≥ 3:1 against the header background, and the focus ring is ≥ 3:1 (R-15; NFR-1, NFR-4)
- [ ] Under achromatopsia emulation, the selected option is still identifiable, and each option box measures at least 24×24 px (R-15; NFR-2, NFR-3)
- [ ] During picks, the network panel shows no request to `127.0.0.1:3001` or any third-party origin (R-16; NFR-5)

**Must keep working**
- [ ] In a clean profile on an emulated dark OS, the first frame is dark. Contrast holds on both token sets. Lighthouse mobile CLS on `/posts` is ≤ 0.1 with Light and with Dark stored. At 320 px there is no horizontal scrollbar. `/posts?page=99` answers 404 with robots `noindex` and a link to `/posts` (R-17; AC-30, AC-31, AC-32, AC-33, AC-35)

## Test plan
| Area | Command | Needs (service / Docker / browser / keys) | Covers |
|---|---|---|---|
| web typecheck | `pnpm --filter @blog/web typecheck` (`apps/web/package.json:10`) | none | WP1, WP2 |
| all typecheck | `pnpm -r typecheck` (`package.json:12`) | none | regression check across packages |
| web build | `pnpm --filter @blog/web build` (`apps/web/package.json:8`) | `SITE_URL` and `API_BASE_URL` in the root `.env` (`.env.example:14-15`). A variable already exported empty overrides the file (INSIGHTS.md:29) | WP1, WP2 compile and prerender |
| inspection | TP-2 | none | Non-goals, AC-7, AC-10, R-11 |
| demo | TP-1 | Docker Postgres, migrated and seeded DB, API on `127.0.0.1:3001`, Chromium with devtools, Lighthouse | every AC and NFR, per the spec's demo/analysis rows (A-11) |
| api tests | not run: `apps/api` is untouched | — | — |
| lint | none: the repo has no linter or CI workflow | — | — |

No suite makes paid calls or uses real credentials.

## Docs to update
- none. `README.md:9` already describes `app/<segment>/_components/<Name>/` placement.

## Recommendations (not in the plan until you accept them)
- **REC-1 Use CSS `light-dark()` for the tokens.** — rejected (user · 2026-10-23); D-5 stands.
  - What: put each token once on `:root` as `light-dark(<light>, <dark>)`, with `color-scheme` set by `data-theme`. This removes the duplicated dark block (D-5).
  - Why: the two dark blocks must be kept identical by hand.
  - Cost: you would accept a browser floor of Chrome/Edge 123, Firefox 120 and Safari 17.5. Older browsers would lose all colours, including today's OS-only behaviour.
  - If accepted: WP1 step 2 changes, and the spec gets a browser-support assumption.
- **REC-2 Reword AC-27 to "Space or the arrow keys".** — accepted (user · 2026-10-23); done in the spec as AC-27 / S-10.
  - What: match the spec to native radio-group keyboard behaviour (R-14).
  - Why: as written, AC-27 does not mention that arrow keys also apply an option.
  - Cost: one spec line, done by spec-creator. No work package changes.

## Execution mode
- **Recommended:** single-agent. The deciding facts:
  - One area (`apps/web`) and 2 small work packages that share `layout.tsx`, so they cannot run in parallel anyway.
  - No contract, schema or dependency change.
  - Test-writer has nothing to write: there are no `[T1]` or `[T2]` lines, because the web app has no suite and P-3 is deferred.
  - Against single-agent: `layout.tsx` and `lib/theme.ts` are security-group files (an inline script, an untrusted stored value). Ask for plan-verifier ∥ architecture-reviewer once after implementation.
- **Multi-agent split:** test-writer T1 (skipped, no `[T1]`) → implementer #1: WP1 → WP2 → test-writer T2 (skipped, no `[T2]`) → plan-verifier ∥ architecture-reviewer → at most 2 fix rounds → engineering-insights. You run TP-1.
- **Single-agent:** the main session does the following, in order:
  1. Implement WP1 and check its "Done when".
  2. Implement WP2.
  3. Run the Test plan commands and TP-2.
  4. Hand TP-1 to you.

  This gives up independent verification unless you ask for the reviewers.

## Risks & open questions
- **Dev `<script>` warning.** React may warn in development that rendering produced a `<script>` tag (Next docs `preventing-flash-before-hydration.md:122`). If it appears, wrap the script in the type-switching `InlineScript` helper from `:124-133`. It is not a hydration mismatch, but check it while demoing AC-19.
- **Dev Strict Mode remount.** It clears attributes on `<html>` (`hydration-error.md:86-87`). WP2's `useLayoutEffect` re-applies the theme. Until WP2 lands, a dev-only check of WP1 may lose the attribute. Verify WP1 on `next start`.
- **CSP.** None is configured today (`apps/web/next.config.ts:9-15`). A future strict CSP blocks the inline script unless it gets a nonce or hash (`hydration-error.md:88`).
- **Back/forward cache (AC-15).** Assumption: a restored page fires `pageshow` with `persisted: true` in the demo browser. Settle it in TP-1 with the `/posts` → `/nope` → Back variant.
- **Page-thrown 404s.** `notFound()` thrown from a page renders an empty shell (INSIGHTS.md:27). The proxy rewrite covers all `/posts` cases today (`proxy.ts:25`). Settle it with `curl -s '/posts?page=abc'` in TP-1: 404 and a non-empty body.
- **Spec not committed.** `docs/specs/theme-toggle.md` is untracked (git status), so the plan header's `@ <sha>` needs a commit first.

<!-- test-brief -->
## Test brief
### TP-1 (demo, run by the user; web rows are `demo`/`analysis` per spec A-11)
**Setup:**
1. `pnpm db:up`, `pnpm --filter @blog/api db:migrate`, `pnpm --filter @blog/api db:seed`, then `pnpm --filter @blog/api start`.
2. `pnpm --filter @blog/web build && pnpm --filter @blog/web exec next start -p 3100`, from the main checkout, not a worktree (INSIGHTS.md:19).
3. Use a spare port and stop the server by PID only: `lsof -ti tcp:3100 -sTCP:LISTEN | xargs kill` (INSIGHTS.md:18).
4. For AC-19, repeat the console check on `pnpm --filter @blog/web exec next dev -p 3101`.

**Tools:**
- Devtools Rendering: emulate `prefers-color-scheme` and achromatopsia.
- Settings › Debugger › Disable JavaScript.
- Storage blocked: `chrome://settings/content/siteData` › "Not allowed" › `http://localhost:3100`.
- Tampering: in the console, `localStorage.setItem('theme', <value>)`.
- AC-12/AC-13: Performance panel, 6× CPU throttle, screenshots on.
- AC-32: Lighthouse mobile with "Clear storage" unticked.

**Walk:** go through every item of § Acceptance criteria.

### TP-2 (inspection, run by plan-verifier)
- `git grep -n -E 'transition|animation' -- apps/web/src` → no output (AC-7)
- `git grep -n -E "addEventListener\(['\"]storage" -- apps/web/src` → no output (P-1)
- `git grep -n -i -E 'theme-color|themeColor' -- apps/web/src` → no output (P-2)
- `git grep -n -E 'cookies\(|headers\(' -- apps/web/src` → no output (D-1)
- `git grep -n -E 'innerHTML|insertAdjacentHTML|document\.write' -- apps/web/src` → only `layout.tsx` with `__html: THEME_INIT_SCRIPT` (R-11)
- `git status --short` → changes only in the WP1/WP2 files, plus the pre-existing `.claude/settings.json` and the spec and plan files. No `package.json`, `pnpm-lock.yaml`, `apps/api/**`, `packages/**`, `proxy.ts` or `posts/**` file is changed (Non-goals, AC-10)
- `grep -c '#12141a' apps/web/src/app/globals.css` → `2`, and `grep -c '#ffffff' apps/web/src/app/globals.css` → `2` (once as `--bg`, once as `--current-text`, unchanged) (D-5, A-1)

### WP1.tests
- none. The web app has no test suite (spec A-11), and P-3 (a web test suite) is deferred. Verified by TP-1 against AC-3–AC-5, AC-8, AC-11, AC-12, AC-16, AC-18, AC-22–AC-24, AC-30–AC-35 and NFR-6, and by TP-2.

### WP2.tests
- none. Same reason as WP1. Verified by TP-1 against AC-1, AC-2, AC-6, AC-7, AC-9, AC-13–AC-15, AC-17, AC-19–AC-21, AC-25–AC-29, AC-32, AC-33 and NFR-1–NFR-5.

## Reference: tooling

> **For humans only — informational.** Agents (implementer, test-writer, reviewers, verifiers) must not act on, cite or derive work from this section.

| Kind | Name | Version / model |
|---|---|---|
| Plugin | `sdd-engineering@dev-digest-ai-latest` | 1.4.0 (`d23d11b`) |
| Plugin | `engineering-paved-path@dev-digest-ai-latest` | 1.1.0 (`3be07ae`), skills loaded by the planner |
| Plugin | `research-tools@dev-digest-ai-latest` | 1.1.0 (`3be07ae`), not used for this plan |
| Agent | `sdd-engineering:implementation-planner` | opus, effort high |
| Agent | `sdd-engineering:spec-creator` (spec) | opus, effort high |
| Orchestrator | Claude Code main session | 2.1.306, Opus 5.5 (`claude-opus-5-5`) |

Marketplace: `kosyakovr/dev-digest-ai-marketplace@latest`. Written 2026-10-23 on branch `test/plugin-v140`.
