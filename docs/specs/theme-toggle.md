# Theme toggle

**Status:** draft
**Ticket:** none
**Areas:** apps/web

## Goal
Readers can get the dark palette only by switching their whole device to dark: the web app follows the OS
`prefers-color-scheme` setting and nothing else (S-3, S-5 A-23). A reader who wants the blog in another palette than
their device — dark at night on a light-themed laptop, light in sunlight on a dark-themed phone — has no way to say so
(S-1). This feature adds a "Theme" menu button to the site header of every page that lets the reader pick the palette,
remembers the choice in their browser, and keeps the device-following behaviour as the default. It lifts the posts-list
non-goal "A manual light/dark toggle (A-23)" (S-5); posts-list A-23 now points to this spec (S-8).

## Non-goals
- New palettes or colour values — high contrast, sepia, custom accents; the two existing token sets are reused as they are (S-3).
- Storing the choice on a server or per account — no accounts or authentication exist (S-5); the choice lives in one browser (A-3).
- Syncing the choice across browsers or devices (A-3).
- Animation of the theme menu opening or closing (A-7).
- Palette-specific images: cover images are the same in both palettes (inferred).
- A keyboard shortcut for switching, and type-ahead (letter keys) inside the menu (inferred; A-14).
- A web test suite — still deferred as posts-list P-2 (S-5) and as P-2 here (S-8); web rows stay `demo` (A-12).

## Sources
| ID | Source | What it contributes |
|---|---|---|
| S-1 | request — user text, 2026-10-23: "Робимо спеціфікацію на перемикач темної та світлої теми" ("a spec for a dark/light theme switcher") | a manual light/dark switch in the web app |
| S-2 | brief — main session, 2026-10-23 | the coverage list: choices, first-visit default, persistence and its effect on rendering, no flash, no-JS, OS changes, tab sync, `color-scheme` / `theme-color`, hydration, control a11y incl. 44 px target, placement, print |
| S-3 | existing — `apps/web/src/app/globals.css:1-29,53-56,69-76` | light tokens on `:root`, dark overrides only under `prefers-color-scheme: dark` (`--bg` `#ffffff` / `#12141a`); `:focus-visible` outline; header link height 2.75rem (44 px) |
| S-4 | existing — `apps/web/src/app/layout.tsx:11-28` | `colorScheme: 'light dark'`; `<html lang="en">`; header `Blog` link on every page; skip link first; no `theme-color` meta |
| S-5 | existing — `docs/specs/posts-list.md` A-13, A-22, A-23, AC-1, AC-12, NFR-2, NFR-4, NFR-7, NFR-8, NFR-12, P-2 | WCAG 2.2 AA targets, contrast 4.5:1 / 3:1, 320 px reflow, CLS ≤ 0.1; no web suite (demo); no auth |
| S-6 | existing — `apps/web/src/app/posts/page.tsx:30-38`, `apps/web/src/lib/posts.ts:47-58`, `apps/web/package.json:6-11` | `/posts` is rendered per request; the API cache is keyed by page only; web has no test script |
| S-7 | request — user answers to open questions, 2026-10-23 | three choices Light / Dark / System; choice kept in browser storage (localStorage), applied before first paint; A-4 stands (JS off → control hidden, page follows the OS); the control is a "Theme" button that opens a menu of Light / Dark / System |
| S-8 | request — user decisions on proposals, 2026-10-23: "P-1 - так", "P-2 - пізніше", "оновити A-23" | P-1 accepted (cross-fade, off under reduced motion); P-2 deferred; posts-list A-23 updated to point here |

## User stories
### US-1 — Pick a palette (P1)
As a reader, I want to choose light, dark or my device's setting from the site header, so that I can read the blog in the palette that suits me now.
**Independent test:** with the OS on light, open the "Theme" menu in the header of `/posts` and choose "Dark"; the menu closes and the page turns dark without a reload; choose "System"; it turns light.

### US-2 — Keep my choice (P1)
As a returning reader, I want the site to remember my choice in this browser and apply it from the first frame, so that I never see the wrong palette flash.
**Independent test:** OS on light, choose "Dark", reload `/posts` and open `/posts?page=2` in a new tab; both paint dark from the first frame, the "Theme" button shows the Dark icon and the menu has "Dark" checked.

## Contract
- **Routes / APIs:** none — no new route; the API and its calls are unchanged (AC-31).
- **Shared schemas:** none.
- **Tools / commands:** none.
- **UI surface:** a "Theme" menu button in the site header of every page (`/posts`, `/posts?page=N`, not-found), after
  the "Blog" link (user · 2026-10-23, S-7; A-9). The button shows the icon of the current choice and the visible text
  "Theme"; its accessible name is "Theme: <current choice>" (A-13). It opens a menu of three radio-style items, "Light",
  "Dark", "System", exactly one checked — the WAI-ARIA menu button pattern: the button exposes a menu popup and
  `aria-expanded`; the items are `menuitemradio` with `aria-checked` (A-16). Keyboard and focus follow A-14; the menu
  overlays the page below the button and stays inside the viewport (A-9). The document's `color-scheme` and the browser
  UI colour (`theme-color`) follow the active palette (AC-11, AC-12).
- **Persistence:** the reader's choice — `light | dark | system` — kept in browser storage (localStorage) for this site
  and applied in the browser before first paint (user · 2026-10-23, S-7). Every reader receives the same HTML, so the
  rendering and caching of every page stay as they are; nothing is sent to or stored on a server; no database, no
  migration. With JavaScript off the choice is not applied and the control is hidden (A-4). `/posts` is already rendered
  per request and the API cache ignores the palette (S-6), so the API call count does not change.

### Module interaction
All in the reader's browser; no server hop.
1. Reader → "Theme" button → theme menu: a choice · on failure (storage unavailable): applied to the current page only (AC-25).
2. Theme menu → stored choice: `light | dark | system` · unreadable value → System (AC-24).
3. Stored choice → every page load and every other open tab of the site, including an open menu there: the palette and the checked item (AC-17, AC-22, AC-42).

## Acceptance criteria
**Choosing (US-1)**
- **AC-1** (US-1 · S-1, S-4) Every page SHALL show the "Theme" button in the site header.
- **AC-2** (US-1 · S-7) The theme menu SHALL offer the choices "Light", "Dark" and "System", in that order.
- **AC-3** (US-1 · S-1) WHEN the reader chooses "Dark", the page SHALL render with the dark token set whatever the OS preference.
- **AC-4** (US-1 · S-1) WHEN the reader chooses "Light", the page SHALL render with the light token set whatever the OS preference.
- **AC-5** (US-1 · S-2, A-1) WHEN the reader chooses "System", the page SHALL render with the token set matching the OS preference.
- **AC-6** (US-1 · S-2) WHILE the choice is "Light" or "Dark", WHEN the OS preference changes, the page SHALL keep the chosen palette.
- **AC-7** (US-1 · S-2) WHEN the reader makes a choice, the page SHALL apply it without a reload.
- **AC-8** (US-1 · S-7, A-13) WHEN the reader makes a choice, the "Theme" button SHALL show that choice's icon.
- **AC-9** (US-1 · S-7, A-14) WHEN the reader selects a choice in the menu, keyboard focus SHALL return to the "Theme" button.
- **AC-10** (US-1 · S-3) WHILE "Dark" is chosen, the page SHALL use the same token values as a "System" visit on a dark OS.
- **AC-11** (US-1 · S-2, S-4) The document's computed `color-scheme` SHALL equal the active palette (`light` or `dark`).
- **AC-12** (US-1 · S-2, A-11) The browser UI colour (`theme-color`) SHALL equal the active palette's background: `#ffffff` light, `#12141a` dark.
- **AC-13** (US-1 · S-7, A-4) IF JavaScript is disabled, THEN the page SHALL show no "Theme" button.
- **AC-14** (US-1 · A-8) WHEN a page is printed, the printout SHALL use the light token set whatever the choice.
- **AC-15** (US-1 · A-8) WHEN a page is printed, the printout SHALL NOT show the "Theme" button or the menu.

**The theme menu (US-1)**
- **AC-32** (US-1 · S-7, A-14) WHEN the reader activates the "Theme" button by click, tap, Enter, Space or ArrowDown, the theme menu SHALL open.
- **AC-33** (US-1 · A-14) WHEN the theme menu opens, keyboard focus SHALL move to the checked choice.
- **AC-34** (US-1 · A-14) WHILE the theme menu is open, WHEN the reader presses ArrowDown or ArrowUp, focus SHALL move to the next or previous choice, wrapping from last to first and first to last.
- **AC-35** (US-1 · A-14) WHILE the theme menu is open, WHEN the reader presses Home or End, focus SHALL move to the first or last choice.
- **AC-36** (US-1 · S-7) WHEN the reader selects a choice by click, tap, Enter or Space, the theme menu SHALL close.
- **AC-37** (US-1 · S-7, A-14) WHILE the theme menu is open, WHEN the reader presses Escape, the menu SHALL close without changing the choice.
- **AC-38** (US-1 · S-7, A-14) WHEN Escape closes the theme menu, keyboard focus SHALL return to the "Theme" button.
- **AC-39** (US-1 · S-7, A-14) WHILE the theme menu is open, WHEN the reader presses Tab or Shift+Tab, the menu SHALL close without changing the choice.
- **AC-40** (US-1 · S-7, A-14) WHILE the theme menu is open, WHEN the reader clicks or taps outside the menu and the button, the menu SHALL close without changing the choice.
- **AC-41** (US-1 · A-14) WHILE the theme menu is open, WHEN the reader activates the "Theme" button by click or tap, the menu SHALL close.
- **AC-42** (US-1 · A-15) WHILE the theme menu is open, WHEN the choice changes in another tab, the menu SHALL stay open with the new choice checked.
- **AC-43** (US-1 · A-9) WHEN the theme menu opens, it SHALL render above the page content without moving it.

**Remembering (US-2)**
- **AC-16** (US-2 · A-5) WHEN the reader makes several choices in a row and reloads, the page SHALL render the last choice made.
- **AC-17** (US-2 · S-2, S-7, A-3) WHEN a reader who chose "Light" or "Dark" reloads or opens any page of the site in the same browser, the page SHALL render with the chosen palette.
- **AC-18** (US-2 · S-2, S-7) WHEN a page loads with a stored choice that differs from the OS preference, the browser SHALL paint no frame in the other palette.
- **AC-19** (US-2 · S-2) WHEN the reader follows a link to another page of the site, the next page SHALL paint no frame in the other palette.
- **AC-20** (US-2 · S-2, A-13) WHILE a page with a stored choice loads, the "Theme" button SHALL show no icon other than the stored choice's.
- **AC-21** (US-2 · A-1) WHEN no choice is stored, the theme menu SHALL show "System" as checked.
- **AC-22** (US-2 · A-6) WHEN the choice changes in one tab, every other open tab of the site SHALL apply it without a reload.
- **AC-23** (US-2 · A-6) WHEN a page is restored from the back/forward cache, it SHALL show the currently stored choice.
- **AC-24** (US-2 · A-5) IF the stored value is not `light`, `dark` or `system`, THEN the page SHALL treat the choice as "System".
- **AC-25** (US-2 · A-5) IF browser storage is unavailable, THEN a choice SHALL still apply to the current page.

### Must keep working
- **AC-26** (existing · `apps/web/src/app/globals.css:15-29`; posts-list AC-12) WHILE the choice is "System", WHEN the OS prefers dark, the page SHALL CONTINUE TO render with the dark token set.
- **AC-27** (existing · `apps/web/src/app/globals.css:15`) WHILE the choice is "System", WHEN the OS preference changes on an open page, the page SHALL CONTINUE TO switch palette without a reload.
- **AC-28** (existing · `apps/web/src/app/globals.css:15`) WHILE JavaScript is disabled, the page SHALL CONTINUE TO follow the OS preference.
- **AC-29** (existing · posts-list AC-1) WHILE JavaScript is disabled, `/posts` SHALL CONTINUE TO be readable with its posts in the HTML.
- **AC-30** (existing · `apps/web/src/app/layout.tsx:19-21`; posts-list NFR-8) WHEN a keyboard user tabs from page load, focus SHALL CONTINUE TO reach "Skip to content" first.
- **AC-31** (existing · `apps/web/src/lib/posts.ts:47-58`; posts-list NFR-2) WHEN one list page is requested repeatedly within 60 s, the web app SHALL CONTINUE TO make at most 1 API call for it, whatever palette readers chose.

## States and edge cases
| Surface | Default | Loading | Empty | Error | Partial / degraded | No access | Stale / expired |
|---|---|---|---|---|---|---|---|
| "Theme" button | AC-1, AC-8, NFR-1, NFR-15 | AC-20, NFR-12 (no shift) | no choice → System icon (A-13) | storage off → AC-25 | JS off → AC-13; print → AC-15 | n/a — public (S-5) | other tab changed → AC-22, AC-23; bad value → AC-24 |
| Theme menu | AC-2, AC-32–AC-36, NFR-13 | n/a — opens only once scripts run (A-4) | n/a — always three choices (AC-2) | storage off → AC-25 | 320 px → NFR-16; JS off → AC-13 | n/a | other tab changed while open → AC-42 |
| Page palette (every page) | AC-3–AC-5, AC-10 | AC-18, AC-19 | AC-21, AC-26, AC-27 (A-1) | AC-25 | JS off → AC-28; print → AC-14 | n/a | AC-22–AC-24 |
| Browser chrome (`color-scheme`, `theme-color`) | AC-11, AC-12 | AC-18 | follows OS (A-11) | n/a | JS off → follows OS (A-11) | n/a | AC-22 |

Other edge cases: OS changes while "Dark" is chosen → AC-6; rapid repeated choices end on the last one → AC-16;
storage cleared by the reader → AC-21; two tabs changed at once → the last change wins in both (A-6); menu dismissed by
Escape, Tab or outside click → AC-37–AC-40; choosing the already-checked item closes the menu and changes nothing
(AC-36, A-14); no hydration warning in any state → NFR-11.

## Non-functional
- **NFR-1** (accessibility · S-7, A-13) The "Theme" button SHALL expose the accessible name "Theme: <current choice>", for example "Theme: Dark".
- **NFR-2** (accessibility · S-2, A-14) Every choice SHALL be reachable and selectable with the keyboard alone.
- **NFR-3** (accessibility · S-3, S-5) WHEN the "Theme" button or a menu item has keyboard focus, it SHALL show a focus indicator with contrast ≥ 3:1 against its background in both palettes.
- **NFR-4** (accessibility · S-2, A-10) The "Theme" button and each menu item SHALL have a target ≥ 44×44 CSS px.
- **NFR-5** (accessibility · S-5) In both palettes, text SHALL have contrast ≥ 4.5:1, and the button's icon, the menu's boundary against the page and the checked-item indicator ≥ 3:1.
- **NFR-6** (accessibility · S-5) The checked choice in the menu SHALL be identifiable without relying on colour alone.
- **NFR-7** (usability · S-8, A-7) WHILE the OS does not ask for reduced motion, WHEN the palette changes on an open page, the colours SHALL cross-fade to the new palette and finish within 200 ms.
- **NFR-8** (accessibility · S-5, A-9) At a 320 CSS px viewport, the header SHALL show "Blog" and the "Theme" button on one row with no horizontal scrolling.
- **NFR-9** (accessibility · A-9) WHILE the theme menu is closed, the Tab order SHALL be "Skip to content", "Blog", the "Theme" button, then the main content, with no menu item as a Tab stop.
- **NFR-10** (privacy · A-3) WHEN the reader makes a choice, the browser SHALL send no network request.
- **NFR-11** (reliability · S-2) WHEN any page loads in each of the 6 combinations of stored choice and OS preference, the browser console SHALL report no hydration mismatch.
- **NFR-12** (performance · S-5) WHEN `/posts` loads with a stored "Dark" choice under the posts-list NFR-4 profile, CLS SHALL be ≤ 0.1.
- **NFR-13** (accessibility · S-7, A-16) The open theme menu SHALL expose its items as `menuitemradio` with `aria-checked="true"` on the current choice only.
- **NFR-14** (accessibility · A-2) Each menu item SHALL expose its text name "Light", "Dark" or "System".
- **NFR-15** (accessibility · A-16) The "Theme" button SHALL expose a menu popup and an `aria-expanded` value matching whether the menu is open.
- **NFR-16** (accessibility · S-5, A-9) WHILE the theme menu is open at a 320 CSS px viewport, the menu SHALL lie fully inside the viewport with no horizontal scrolling.
- **NFR-17** (accessibility · S-8, A-7) WHILE the OS asks for reduced motion (`prefers-reduced-motion: reduce`), WHEN the palette changes, the page SHALL switch with no animated colour transition.
- **NFR-18** (usability · S-8, A-7) WHEN a page loads, is restored from the back/forward cache or is reached by a link, the page SHALL show no colour transition.

## Assumptions
- **A-1** A reader with no stored choice gets "System" — it keeps today's behaviour (S-3, S-5 AC-12) and respects the device.
- **A-2** Texts: visible button text "Theme", items "Light", "Dark", "System"; English only (posts-list A-6, S-5).
- **A-3** The choice belongs to one browser on one site origin, is never sent to or stored by a server, and is lost when the reader clears site data (then A-1 applies).
- **A-4** With JavaScript off the "Theme" button is hidden and the page follows the OS — a control that does nothing misleads (error prevention) — confirmed, user · 2026-10-23 (S-7).
- **A-5** An unknown stored value or unavailable storage means "System"; with storage unavailable a choice still holds on the current page until it is left. Rapid choices: the last one wins.
- **A-6** Open tabs of the site follow a change without a reload; the last change wins; a page restored from the back/forward cache shows the stored choice.
- **A-7** A palette change on an open page — the reader's choice, an OS change under "System", or a change synced from another tab — cross-fades in ≤ 200 ms (P-1 accepted, S-8); 200 ms reads as a smooth change without delaying the reader. Under `prefers-reduced-motion: reduce` it is instant. Page load, back/forward restore and navigation never animate, so the fade cannot show a frame of the other palette (AC-18, AC-19). The menu opens and closes without animation.
- **A-8** Print always uses the light palette and omits the button and menu — dark backgrounds waste ink and are often dropped by printers.
- **A-9** The "Theme" button sits at the end of the header row on every width from 320 px, with no collapsed header menu; Tab order skip link → "Blog" → "Theme" button → main; menu items are reached by arrow keys, not Tab. The menu opens below the button, its end edge aligned with the button's end edge so it grows towards the viewport's inside, overlays all page content without moving it, and never extends past the viewport.
- **A-10** Target 44×44 CSS px for the button and each menu item — the brief (S-2) and the existing header link height of 2.75rem (S-3); stricter than posts-list's 24 px (S-5).
- **A-11** `theme-color` equals the active palette's `--bg` (S-3); with no stored choice or JavaScript off it follows the OS; none is set today (S-4).
- **A-12** Web criteria are verified by `demo`, `inspection` or `analysis` — the web app has no test suite (S-6, posts-list A-22).
- **A-13** The button shows a distinct icon per choice (Light, Dark, System) beside the visible text "Theme", so the current choice is visible without opening the menu; its accessible name "Theme: <choice>" announces the current choice and contains the visible label (WCAG 2.5.3 Label in Name). Before any choice is stored it shows the System icon.
- **A-14** Keyboard and pointer model of the WAI-ARIA menu button pattern: click, tap, Enter, Space or ArrowDown opens; focus goes to the checked item (so the current choice is announced first) rather than the first item; ArrowUp/ArrowDown move and wrap, Home/End jump; Enter, Space, click or tap on an item selects it, closes the menu and returns focus to the button (selecting the checked item only closes it); Escape closes and returns focus to the button; Tab or Shift+Tab closes and focus moves on in the normal Tab order; a click or tap outside closes and focus goes where the reader clicked; no type-ahead.
- **A-15** WHILE the menu is open and another tab changes the choice, the page palette (AC-22), the button icon and the checked item update; the menu stays open and focus does not move — closing it would discard where the reader is.
- **A-16** Semantics: an ARIA menu of `menuitemradio` items with `aria-checked`, not a disclosure list of buttons with `aria-pressed` — the user chose a menu (S-7); `menuitemradio` states that the three choices are one exclusive set and screen readers announce "checked" on the current one; the button's popup and expanded state tell the reader a menu opens and whether it is open.

## Open questions
none — all three answered by the user on 2026-10-23 (S-7): choices → AC-2; persistence → § Contract › Persistence, AC-17, A-4; control style → § Contract › UI surface, AC-32–AC-43, A-13–A-16.

## Proposals
Not requirements until the user accepts them.
- **P-1** A short cross-fade between palettes, off under `prefers-reduced-motion` — polish (aesthetic and minimalist design) — accepted (user · 2026-10-23, S-8) → NFR-7, NFR-17, NFR-18, A-7
- **P-2** Revisit posts-list P-2: a web end-to-end suite, so no-flash (AC-18, AC-19), tab sync (AC-22) and the menu keyboard model (AC-32–AC-41) are checked on every change rather than by hand — they are timing-sensitive and easy to regress — rejected (deferred, user · 2026-10-23, S-8)

## Traceability and verification
Web rows are `demo`, `inspection` or `analysis` per A-12; the browser OS preference is emulated in devtools.

| ID | Story | Source | Method | Suite | Verification hint |
|---|---|---|---|---|---|
| AC-1 | US-1 | S-1 | demo | — | `/posts`, `/posts?page=2`, a 404 page: "Theme" button in `header` |
| AC-2 | US-1 | S-7 | demo | — | open menu: items "Light", "Dark", "System" in that order |
| AC-3 | US-1 | S-1 | demo | — | OS light, choose Dark: `--bg` computes `#12141a` |
| AC-4 | US-1 | S-1 | demo | — | OS dark, choose Light: `--bg` computes `#ffffff` |
| AC-5 | US-1 | A-1 | demo | — | choose System under each OS setting: `--bg` follows it |
| AC-6 | US-1 | S-2 | demo | — | Dark chosen, flip OS to light: `--bg` stays `#12141a` |
| AC-7 | US-1 | S-2 | demo | — | network panel shows no document request on a choice |
| AC-8 | US-1 | A-13 | demo | — | after choosing Dark, the button shows the Dark icon |
| AC-9 | US-1 | A-14 | demo | — | select by keyboard: `document.activeElement` is the "Theme" button |
| AC-10 | US-1 | S-3 | demo | — | computed token values equal between Dark-on-light-OS and System-on-dark-OS |
| AC-11 | US-1 | S-2 | demo | — | computed `color-scheme` of `html` per palette; scrollbar matches |
| AC-12 | US-1 | A-11 | demo | — | effective `theme-color` per palette; mobile browser bar colour |
| AC-13 | US-1 | A-4 | demo | — | JS off: no "Theme" button in the rendered header |
| AC-14 | US-1 | A-8 | demo | — | Dark chosen, print preview: light background |
| AC-15 | US-1 | A-8 | demo | — | print preview has no button or menu |
| AC-16 | US-2 | A-5 | demo | — | choose Light, Dark, System, Dark in a row, reload: dark |
| AC-17 | US-2 | S-7 | demo | — | Dark chosen, reload and open another page: dark |
| AC-18 | US-2 | S-2 | demo | — | performance filmstrip of a reload: no light frame with Dark on a light OS |
| AC-19 | US-2 | S-2 | demo | — | filmstrip of following "Next": no frame in the other palette |
| AC-20 | US-2 | A-13 | demo | — | filmstrip of a reload with Dark stored: button never shows another choice's icon |
| AC-21 | US-2 | A-1 | demo | — | cleared site data: menu has "System" checked |
| AC-22 | US-2 | A-6 | demo | — | two tabs; choose Dark in one: the other turns dark with no reload |
| AC-23 | US-2 | A-6 | demo | — | change in tab B, go back in tab A from another site: stored choice shown |
| AC-24 | US-2 | A-5 | demo | — | stored value edited to `blue`: page follows OS, "System" checked |
| AC-25 | US-2 | A-5 | demo | — | storage blocked: choice applies on the page; reload follows OS |
| AC-26 | — | S-3 | demo | — | no choice stored, OS dark: dark tokens |
| AC-27 | — | S-3 | demo | — | System, flip OS on an open page: palette switches without reload |
| AC-28 | — | S-3 | demo | — | JS off, OS dark: dark tokens |
| AC-29 | — | S-5 | demo | — | JS off: `GET /posts` HTML holds the 12 `article` elements |
| AC-30 | — | S-5 | demo | — | Tab from load: first stop "Skip to content" |
| AC-31 | — | S-6 | analysis | — | API request log: one call for 5 reloads within 60 s, readers on different palettes |
| AC-32 | US-1 | S-7 | demo | — | each of click, Enter, Space, ArrowDown on the button opens the menu |
| AC-33 | US-1 | A-14 | demo | — | Dark stored, open by keyboard: focus on "Dark"; screen reader says "Dark, checked" |
| AC-34 | US-1 | A-14 | demo | — | ArrowDown on "System" focuses "Light"; ArrowUp on "Light" focuses "System" |
| AC-35 | US-1 | A-14 | demo | — | Home focuses "Light", End focuses "System" |
| AC-36 | US-1 | S-7 | demo | — | select an item each way: menu gone, `aria-expanded="false"` |
| AC-37 | US-1 | S-7 | demo | — | arrow to another item, Escape: menu closed, palette unchanged |
| AC-38 | US-1 | S-7 | demo | — | after Escape, `document.activeElement` is the button |
| AC-39 | US-1 | S-7 | demo | — | Tab inside the open menu: menu closed, choice unchanged |
| AC-40 | US-1 | S-7 | demo | — | click on page body with menu open: menu closed, choice unchanged |
| AC-41 | US-1 | A-14 | demo | — | click the button twice: menu opens then closes |
| AC-42 | US-1 | A-15 | demo | — | menu open in tab A, choose Dark in tab B: tab A menu still open, "Dark" checked |
| AC-43 | US-1 | A-9 | demo | — | open menu: element positions in `main` unchanged; menu drawn over the cards |
| NFR-1 | US-1 | A-13 | demo | — | accessibility tree: button name "Theme: System" / "Theme: Dark" |
| NFR-2 | US-1 | S-2 | demo | — | each choice selected with keyboard only |
| NFR-3 | US-1 | S-3 | analysis | — | contrast checker: focus outline on button and items, both palettes |
| NFR-4 | US-1 | A-10 | demo | — | measured button and item boxes ≥ 44×44 px |
| NFR-5 | US-1 | S-5 | analysis | — | contrast checker on text, icon, menu boundary, checked indicator in both palettes |
| NFR-6 | US-1 | S-5 | demo | — | grayscale emulation: checked item still identifiable |
| NFR-7 | US-1 | A-7 | demo | — | filmstrip of a choice: intermediate colours, final palette reached ≤ 200 ms |
| NFR-8 | US-1 | A-9 | demo | — | 320 px viewport: one header row, no horizontal scrollbar |
| NFR-9 | US-1 | A-9 | demo | — | Tab walk order with the menu closed; no item is a stop |
| NFR-10 | US-1 | A-3 | demo | — | network panel empty while choosing |
| NFR-11 | US-2 | S-2 | demo | — | dev build console in 6 combinations: no hydration error |
| NFR-12 | US-2 | S-5 | analysis | — | Lighthouse mobile report CLS with Dark stored |
| NFR-13 | US-1 | A-16 | inspection | — | accessibility tree: three `menuitemradio`, only the current one `aria-checked="true"` |
| NFR-14 | US-1 | A-2 | demo | — | accessibility tree: item names "Light", "Dark", "System" |
| NFR-15 | US-1 | A-16 | inspection | — | button has a menu popup; `aria-expanded` false closed, true open |
| NFR-16 | US-1 | A-9 | demo | — | 320 px viewport, menu open: menu box inside the viewport, no horizontal scrollbar |
| NFR-17 | US-1 | A-7 | demo | — | emulate reduced motion, filmstrip of a choice: no intermediate colours |
| NFR-18 | US-2 | A-7 | demo | — | filmstrip of a reload, a "Next" click and a back/forward restore with Dark stored: no intermediate colours |

## Self-check
- [x] Every AC and NFR is one EARS sentence with one trigger and an observable response — no "fast", "properly", "gracefully".
- [x] Every number is sourced (`S-n`) or an assumption (`A-n`).
- [x] Every user story has an AC and an Independent test; every `S-n` is cited at least once.
- [x] Every state-matrix cell holds an AC, an `A-n`, a marker or `n/a`.
- [x] Every AC and NFR has a row in § Traceability and verification.
- [x] No HOW: no file to change, library, layer or work order outside § Sources and § Must keep working.
- [x] A changed shared schema names every copy; a stored field names the migration gate.
- [x] At most 3 `[NEEDS CLARIFICATION]` markers, each repeated under § Open questions.

## Reference: tooling
Provenance only, not requirements. Recorded 2026-10-23 from `~/.claude/plugins/installed_plugins.json` and `.claude/settings.json`.

| Tool | Version | Role in this spec |
|---|---|---|
| Claude Code main session | model Opus 5.5 (`claude-opus-5-5`) | brief, user questions, edits of 2026-10-23 (S-8) |
| `sdd-engineering:spec-creator` agent | plugin `sdd-engineering` 1.3.0 (commit `3be07ae`); agent model `opus`, effort `high` | wrote the draft and folded in S-7 |
| `spec-lint.sh` | plugin `sdd-engineering` 1.3.0 | self-check (§ Self-check) |
| `engineering-paved-path`, `research-tools`, `architecture-review` | 1.1.0 each (commit `6e5c0c7`) | enabled dependencies of `sdd-engineering`; not used for this spec |

Marketplace: `dev-digest-ai-latest` — `kosyakovr/dev-digest-ai-marketplace`, ref `latest`, auto-update on, so versions may differ in a later session.
