const CONFIG_URL = '/configs.json';
const CONFIG_TIMEOUT_MS = 5000;
const FORMAT_KEY_PREFIX = 'date.format.';
const DEFAULT_FORMAT = 'MM/dd/yyyy h:mm a z';

const FALLBACK_CONFIG = {
  default: DEFAULT_FORMAT,
  us: 'MM/dd/yyyy h:mm a z',
  uk: 'dd/MM/yyyy HH:mm z',
  de: 'dd.MM.yyyy HH:mm z',
  fr: 'dd/MM/yyyy HH:mm z',
  jp: 'yyyy/MM/dd HH:mm z',
};

let configPromise = null;

/**
 * Fetch /configs.json once per session and reduce its rows into a
 * country -> format string map keyed by country code.
 *
 * Recognised key shape: `date.format.{cc}` (e.g. `date.format.us`).
 * Falls back to FALLBACK_CONFIG on network failure or 404.
 */
async function loadDateFormatConfig() {
  if (configPromise) return configPromise;
  configPromise = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG_TIMEOUT_MS);
    try {
      const response = await fetch(CONFIG_URL, { signal: controller.signal });
      if (!response.ok) return { ...FALLBACK_CONFIG };
      const json = await response.json();
      const rows = Array.isArray(json.data) ? json.data : [];
      const map = { ...FALLBACK_CONFIG };
      rows.forEach((row) => {
        const key = (row.key || '').trim().toLowerCase();
        const value = (row.value || '').trim();
        if (!value) return;
        if (!key.startsWith(FORMAT_KEY_PREFIX)) return;
        const country = key.slice(FORMAT_KEY_PREFIX.length);
        if (country) map[country] = value;
      });
      return map;
    } catch (e) {
      return { ...FALLBACK_CONFIG };
    } finally {
      clearTimeout(timer);
    }
  })();
  return configPromise;
}

/**
 * Detect country from the first non-empty path segment.
 * Returns lowercase 2-letter code or null.
 */
function getCountry() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  const first = (segments[0] || '').toLowerCase();
  return /^[a-z]{2}$/.test(first) ? first : null;
}

function pickFormat(config) {
  const country = getCountry();
  if (country && config[country]) return config[country];
  return config.default || DEFAULT_FORMAT;
}

/**
 * Parse an authored date string of the form:
 *   MM/DD/YYYY [h:mm a.m./p.m. TZ]
 * Returns parts or null if unparseable.
 */
export function parseAuthoredDate(text) {
  if (!text) return null;
  const re = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)\s*([A-Z]{1,4}))?\s*$/i;
  const m = text.trim().match(re);
  if (!m) return null;
  const month = parseInt(m[1], 10);
  const day = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const result = {
    year, month, day, hour12: null, minute: null, ampm: null, tz: null, hasTime: false,
  };
  if (m[4]) {
    const hr = parseInt(m[4], 10);
    const min = parseInt(m[5], 10);
    if (hr < 1 || hr > 12 || min < 0 || min > 59) return null;
    const [, , , , , , ampmRaw, tz] = m;
    result.hour12 = hr;
    result.minute = min;
    result.ampm = ampmRaw.toLowerCase().startsWith('p') ? 'pm' : 'am';
    result.tz = tz;
    result.hasTime = true;
  }
  return result;
}

/**
 * Parse an ISO 8601 date (YYYY-MM-DD or full datetime) into the same parts shape.
 * Used for index entries / publishDate metadata.
 */
export function parseIsoDate(text) {
  if (!text) return null;
  const ts = Date.parse(text);
  if (Number.isNaN(ts)) return null;
  const d = new Date(ts);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour12: null,
    minute: null,
    ampm: null,
    tz: null,
    hasTime: false,
  };
}

function pad2(n) { return String(n).padStart(2, '0'); }

function to24h(hour12, ampm) {
  if (hour12 === null) return null;
  if (ampm === 'pm') return hour12 === 12 ? 12 : hour12 + 12;
  return hour12 === 12 ? 0 : hour12;
}

function ampmText(ampm) {
  if (ampm === 'pm') return 'p.m.';
  if (ampm === 'am') return 'a.m.';
  return '';
}

/**
 * Apply a token-based format string to parsed date parts.
 * Tokens: yyyy, MM, dd, HH, h, mm, a, z (timezone passthrough). All other characters are literal.
 * If the parts have no time and the format has time tokens, the time portion is stripped cleanly.
 */
export function formatParts(parts, format) {
  if (!parts) return '';
  const hour24 = to24h(parts.hour12, parts.ampm);
  const tokens = {
    yyyy: String(parts.year),
    MM: pad2(parts.month),
    dd: pad2(parts.day),
    HH: hour24 !== null ? pad2(hour24) : '',
    h: parts.hour12 !== null ? String(parts.hour12) : '',
    mm: parts.minute !== null ? pad2(parts.minute) : '',
    a: ampmText(parts.ampm),
    z: parts.tz || '',
  };
  let out = format.replace(/yyyy|MM|dd|HH|mm|h|a|z/g, (t) => tokens[t]);
  if (!parts.hasTime) {
    out = out.replace(/\s+(?:[-:.,/]+\s*)?$/, '').trim();
  } else {
    out = out.replace(/\s{2,}/g, ' ').trim();
  }
  return out;
}

/**
 * Format an authored date string ("MM/DD/YYYY h:mm a.m. TZ") for the visitor's
 * country. Returns the original string if it can't be parsed.
 */
export async function formatAuthoredDate(text) {
  const parts = parseAuthoredDate(text);
  if (!parts) return text;
  const config = await loadDateFormatConfig();
  return formatParts(parts, pickFormat(config));
}

/**
 * Format an ISO 8601 date for the visitor's country. Returns '' if invalid.
 */
export async function formatIsoDate(text) {
  const parts = parseIsoDate(text);
  if (!parts) return '';
  const config = await loadDateFormatConfig();
  return formatParts(parts, pickFormat(config));
}

/**
 * Walk the given root and reformat every <strong>/<b> whose text matches the
 * authored date pattern. Idempotent — already-reformatted dates that don't
 * match the source pattern are left alone.
 */
export async function formatDates(root) {
  if (!root) return;
  const config = await loadDateFormatConfig();
  const format = pickFormat(config);
  root.querySelectorAll('strong, b').forEach((el) => {
    const text = (el.textContent || '').trim();
    const parts = parseAuthoredDate(text);
    if (!parts) return;
    el.textContent = formatParts(parts, format);
  });
}

export default formatDates;
