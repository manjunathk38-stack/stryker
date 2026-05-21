/* eslint-disable */
/* global WebImporter */

/**
 * Site-wide cleanup transformer for stryker.com pages.
 *
 * All selectors below were verified against migration-work/cleaned.html
 * for the stryker news/message-article template. They strip site chrome
 * (header, footer, megamenu, cookie banners, country-switch modal,
 * back-to-top, hidden form inputs, empty widget placeholders) so the
 * import contains only authorable article content.
 *
 * Selectors and their source lines in cleaned.html:
 *   #cookie-alert .................. line 4   (custom top cookie/alert bar)
 *   #onetrust-consent-sdk .......... line 880 (OneTrust cookie banner & PC)
 *   #ot-sdk-btn-floating ........... line 1127 (OneTrust floating cookie button)
 *   #c-country-switch-modal ........ line 387 (country switch modal)
 *   header#header.g-header ......... line 32  (site header, megamenu, search)
 *   footer#footer.footer ........... line 790 (site footer + social icons)
 *   .c-back-to-top ................. line 783 (back-to-top widget)
 *   .c-publish-date ................ line 430 (empty AEM publish-date placeholder)
 *   .c-event-location-properties ... line 435 (empty AEM event-location placeholder)
 */

const TransformHook = {
  beforeTransform: 'beforeTransform',
  afterTransform: 'afterTransform',
};

/**
 * Scan article body for dated <strong> entries like "04/01/2026 10:45 a.m. ET"
 * and return the most recent date as ISO 8601 (YYYY-MM-DD), or null if none found.
 */
function derivePublishDate(element) {
  const datePattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\b/;
  let latest = null;
  element.querySelectorAll('strong, b').forEach((el) => {
    const text = (el.textContent || '').trim();
    const m = text.match(datePattern);
    if (!m) return;
    const month = parseInt(m[1], 10);
    const day = parseInt(m[2], 10);
    const year = parseInt(m[3], 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) return;
    const ts = Date.UTC(year, month - 1, day);
    if (Number.isNaN(ts)) return;
    if (!latest || ts > latest.ts) {
      latest = {
        ts,
        iso: `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
      };
    }
  });
  return latest ? latest.iso : null;
}

/**
 * Inject a publishDate row into the page metadata so query-index can index it.
 * Idempotent: only writes when an authored publishDate is not already present.
 */
function injectPublishDateMeta(document, publishDate) {
  if (!publishDate) return;
  const head = document.head;
  if (!head) return;
  if (head.querySelector('meta[name="publishdate" i]')) return;
  const meta = document.createElement('meta');
  meta.setAttribute('name', 'publishdate');
  meta.setAttribute('content', publishDate);
  head.appendChild(meta);
}

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Cookie/consent UI and modal overlays - remove early so block parsing
    // is not influenced by these layered elements.
    WebImporter.DOMUtils.remove(element, [
      '#cookie-alert',
      '#onetrust-consent-sdk',
      '#ot-sdk-btn-floating',
      '#c-country-switch-modal',
    ]);
  }

  if (hookName === TransformHook.afterTransform) {
    // Non-authorable site chrome.
    WebImporter.DOMUtils.remove(element, [
      'header#header',
      'footer#footer',
      '.c-back-to-top',
      '.c-publish-date',
      '.c-event-location-properties',
      // Generic safety: hidden form inputs scattered across the AEM markup
      // (e.g. #indexUrl, #hdnRunMode, #businessUnitTag, #hiddenPublishedDate,
      // #hdnShowAlert, #hdnAlertTitle, #hdnAlertMsg, #hdnAlertContBtnText,
      // #hdnAlertCancelBtnText, #hdnDisplayHcpConfirmation, #hdnShowFooter)
      // - none are authorable content.
      'input',
      // Strip noscript/iframe/link/source leftovers that survive cleaning.
      'iframe',
      'noscript',
      'source',
      'link',
    ]);

    // Strip tracking/onclick attributes that AEM injects on arbitrary elements.
    element.querySelectorAll('*').forEach((el) => {
      el.removeAttribute('onclick');
      el.removeAttribute('data-track');
      el.removeAttribute('data-tracking');
    });

    // Surface the article's most recent dated entry as a publishDate meta tag
    // so query-index can index it for downstream news listing/search.
    if (payload && payload.document) {
      const publishDate = derivePublishDate(element);
      injectPublishDateMeta(payload.document, publishDate);
    }
  }
}
