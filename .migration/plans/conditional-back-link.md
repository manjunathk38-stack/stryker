# Conditional Back Link Plan

## Overview

The imported article currently shows a static "back" link at the top pointing to `https://www.stryker.com/us/en/index.html`. The requirement is to:

1. **Show the back link only when the visitor arrived from another Stryker page** (same-origin referrer).
2. **Hide it entirely** when the visitor came directly, from search engines, or any third-party domain.
3. **Display the previous page's title** as the link text (instead of generic "back") for accessibility.
4. **Get the title from sessionStorage**, populated by the prior Stryker page before navigation.

## Approach

### Detection
- Read `document.referrer` on page load.
- If empty or its origin doesn't match `window.location.origin` → hide and exit.
- If same-origin → keep the link, swap its text for the title from sessionStorage.

### sessionStorage strategy
- Key: a stable name like `stryker:lastPageTitle`.
- Each Stryker page writes `{ title: document.title, url: location.href, ts: Date.now() }` on `pagehide`/`beforeunload`.
- On the next page, we read that record. If its `url` matches `document.referrer`, use `title`. Otherwise fall back to a generic label ("Back to previous page") since stale data is possible (e.g., user opened a new tab).

### Where the code lives
- **scripts.js** gets a small site-wide hook that:
  - Writes the current page's title to sessionStorage on unload (so any future page can read it).
  - On every page load, finds the article-level "back" link and either updates its text or removes it.
- The "back" link is identified by its position (first paragraph of `main`) and href pattern (link pointing to a Stryker page like `/us/en/index.html` or any same-origin URL with text matching `/^back$/i`).

### Accessibility
- Link text becomes the previous page's `<title>` (or sanitized variant — strip `" | Stryker"` suffix).
- `aria-label` set to `Back to: {previousPageTitle}` for screen reader clarity.
- A visually hidden `"Back to "` prefix is added so the link reads naturally even if title alone is ambiguous.
- When hidden, the element is removed entirely so screen readers don't encounter empty/orphan markup.

### Source files to change
- `scripts/scripts.js` — add the storage write-on-unload + the read-and-decorate-back-link logic.
- `styles/styles.css` — add a `.visually-hidden` utility (if not already present) for the "Back to " prefix.
- **Do not** edit the imported `.plain.html`. The DOM-time JS handles whether the link renders.

## Checklist

- [ ] Add `recordPageTitleForBack()` to `scripts/scripts.js` that writes `{ title, url, ts }` to `sessionStorage` on `pagehide`.
- [ ] Add `decorateBackLink()` to `scripts/scripts.js` that:
  - [ ] Reads `document.referrer`; if empty or cross-origin → remove the back-link paragraph.
  - [ ] Locates the back link (first paragraph in `main` whose only child is an anchor with text "back" or matching the imported pattern).
  - [ ] Reads `sessionStorage['stryker:lastPageTitle']`; if its `url` matches `document.referrer`, use that title (stripped of `" | Stryker"` suffix). Else fall back to "Previous page".
  - [ ] Replaces link text with the title; sets `aria-label="Back to: {title}"`; sets `href` to the referrer URL.
  - [ ] Prepends a visually hidden `"Back to "` span.
- [ ] Wire both functions into the existing `loadEager`/`loadLazy` flow in `scripts.js` so the link is processed before LCP without flash.
- [ ] Add `.visually-hidden` CSS utility in `styles/styles.css` (clip + sr-only pattern) if not present.
- [ ] Test scenarios:
  - [ ] Direct visit (no referrer) → link removed.
  - [ ] Arrival from `google.com` → link removed.
  - [ ] Arrival from another Stryker page that previously stored its title → link shows previous page title.
  - [ ] Arrival from same-origin page that did NOT store title (e.g., before script deployed) → link shows fallback "Previous page".
  - [ ] Screen reader announces "Back to: {title}" on focus.
- [ ] Lint pass (`npm run lint`).

## Notes

- Plan is ready. Execution requires Execute mode — switch out of Plan mode to proceed.
- Storing on `pagehide` instead of `beforeunload` is more reliable on mobile/Safari and bfcache-safe.
- Since this is a per-site behavior (not block-specific), it lives in `scripts.js` rather than a block JS file.
