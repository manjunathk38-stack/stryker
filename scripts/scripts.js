import {
  buildBlock,
  loadHeader,
  loadFooter,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
} from './aem.js';

/**
 * Builds hero block and prepends to main in a new section.
 * @param {Element} main The container element
 */
function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  const picture = main.querySelector('picture');
  // eslint-disable-next-line no-bitwise
  if (h1 && picture && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
    // Check if h1 or picture is already inside a hero block
    if (h1.closest('.hero') || picture.closest('.hero')) {
      return; // Don't create a duplicate hero block
    }
    const section = document.createElement('div');
    section.append(buildBlock('hero', { elems: [picture, h1] }));
    main.prepend(section);
  }
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    // auto load `*/fragments/*` references
    const fragments = [...main.querySelectorAll('a[href*="/fragments/"]')].filter((f) => !f.closest('.fragment'));
    if (fragments.length > 0) {
      // eslint-disable-next-line import/no-cycle
      import('../blocks/fragment/fragment.js').then(({ loadFragment }) => {
        fragments.forEach(async (fragment) => {
          try {
            const { pathname } = new URL(fragment.href);
            const frag = await loadFragment(pathname);
            fragment.parentElement.replaceWith(...frag.children);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Fragment loading failed', error);
          }
        });
      });
    }

    buildHeroBlock(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates formatted links to style them as buttons.
 * @param {HTMLElement} main The main container element
 */
function decorateButtons(main) {
  main.querySelectorAll('p a[href]').forEach((a) => {
    a.title = a.title || a.textContent;
    const p = a.closest('p');
    const text = a.textContent.trim();

    // quick structural checks
    if (a.querySelector('img') || p.textContent.trim() !== text) return;

    // skip URL display links
    try {
      if (new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }

    // require authored formatting for buttonization
    const strong = a.closest('strong');
    const em = a.closest('em');
    if (!strong && !em) return;

    p.className = 'button-wrapper';
    a.className = 'button';
    if (strong && em) { // high-impact call-to-action
      a.classList.add('accent');
      const outer = strong.contains(em) ? strong : em;
      outer.replaceWith(a);
    } else if (strong) {
      a.classList.add('primary');
      strong.replaceWith(a);
    } else {
      a.classList.add('secondary');
      em.replaceWith(a);
    }
  });
}

const BACK_LINK_STORAGE_KEY = 'stryker:lastPageTitle';
const BACK_LINK_FALLBACK_TEXT = 'Previous page';

function cleanReferrerTitle(title) {
  return title.replace(/\s*\|\s*Stryker\s*$/i, '').trim() || BACK_LINK_FALLBACK_TEXT;
}

function isBackLinkParagraph(p) {
  if (p.children.length !== 1) return false;
  const a = p.firstElementChild;
  if (a.tagName !== 'A') return false;
  if (a.textContent.trim().toLowerCase() !== 'back') return false;
  try {
    const href = new URL(a.href, window.location.origin);
    return href.origin === window.location.origin;
  } catch {
    return false;
  }
}

function findBackLinkParagraph(main) {
  const paragraph = [...main.querySelectorAll('p')].find(isBackLinkParagraph);
  return paragraph ? { paragraph, anchor: paragraph.firstElementChild } : null;
}

/**
 * Replace the article-level "back" link with one that:
 *  - is removed when the visitor came directly or from another domain,
 *  - shows the previous page's title (read from sessionStorage) for accessibility.
 * @param {Element} main The main container element
 */
function decorateBackLink(main) {
  const found = findBackLinkParagraph(main);
  if (!found) return;
  const { paragraph, anchor } = found;

  const { referrer } = document;
  if (!referrer) {
    paragraph.remove();
    return;
  }
  let referrerUrl;
  try {
    referrerUrl = new URL(referrer);
  } catch {
    paragraph.remove();
    return;
  }
  if (referrerUrl.origin !== window.location.origin) {
    paragraph.remove();
    return;
  }

  let title = BACK_LINK_FALLBACK_TEXT;
  try {
    const raw = sessionStorage.getItem(BACK_LINK_STORAGE_KEY);
    if (raw) {
      const stored = JSON.parse(raw);
      if (stored && stored.url === referrer && stored.title) {
        title = cleanReferrerTitle(stored.title);
      }
    }
  } catch { /* ignore storage errors */ }

  anchor.href = referrer;
  anchor.setAttribute('aria-label', `Back to: ${title}`);
  anchor.textContent = '';
  const prefix = document.createElement('span');
  prefix.className = 'visually-hidden';
  prefix.textContent = 'Back to ';
  anchor.append(prefix, document.createTextNode(title));
}

/**
 * Persist the current page's title and URL so the next page (if same-origin)
 * can render a meaningful back link.
 */
function recordPageTitleForBack() {
  const write = () => {
    try {
      sessionStorage.setItem(BACK_LINK_STORAGE_KEY, JSON.stringify({
        title: document.title,
        url: window.location.href,
        ts: Date.now(),
      }));
    } catch { /* ignore */ }
  };
  window.addEventListener('pagehide', write);
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  decorateButtons(main);
  decorateBackLink(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  loadHeader(doc.querySelector('header'));

  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();

  recordPageTitleForBack();

  // Country-aware date formatting — load lazily so it doesn't impact LCP.
  // eslint-disable-next-line import/no-cycle
  import('./date-format.js').then(({ formatDates }) => formatDates(main));
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
