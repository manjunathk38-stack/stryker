import { createOptimizedPicture } from '../../scripts/aem.js';
import { formatIsoDate } from '../../scripts/date-format.js';

const INDEX_URL = '/us/en/about/news/query-index.json';
const DEFAULT_LIMIT = 5;
const FETCH_TIMEOUT_MS = 5000;

/**
 * Read optional configuration rows like:
 *   | limit | 5 |
 * from the block's authored content. Each row is a 2-column key/value pair.
 */
function readBlockConfig(block) {
  const config = {};
  block.querySelectorAll(':scope > div').forEach((row) => {
    const cells = row.querySelectorAll(':scope > div');
    if (cells.length !== 2) return;
    const key = cells[0].textContent.trim().toLowerCase();
    const value = cells[1].textContent.trim();
    if (key) config[key] = value;
  });
  return config;
}

async function fetchNewsIndex() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(INDEX_URL, { signal: controller.signal });
    if (!response.ok) return [];
    const json = await response.json();
    return Array.isArray(json.data) ? json.data : [];
  } catch (e) {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function parsePublishDate(value) {
  if (!value) return null;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? null : ts;
}

function buildCard(entry, formattedDate) {
  const li = document.createElement('li');
  li.className = 'news-list-item';

  if (entry.image) {
    const figure = document.createElement('div');
    figure.className = 'news-list-item-image';
    const picture = createOptimizedPicture(entry.image, entry.title || '', false, [{ width: '600' }]);
    figure.append(picture);
    li.append(figure);
  }

  const body = document.createElement('div');
  body.className = 'news-list-item-body';

  const titleEl = document.createElement('h3');
  titleEl.className = 'news-list-item-title';
  const link = document.createElement('a');
  link.href = entry.path;
  link.textContent = entry.title || entry.path;
  titleEl.append(link);
  body.append(titleEl);

  if (formattedDate) {
    const time = document.createElement('time');
    time.className = 'news-list-item-date';
    time.dateTime = entry.publishDate;
    time.textContent = formattedDate;
    body.append(time);
  }

  if (entry.description) {
    const summary = document.createElement('p');
    summary.className = 'news-list-item-summary';
    summary.textContent = entry.description;
    body.append(summary);
  }

  li.append(body);
  return li;
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  const limit = Math.max(1, parseInt(config.limit, 10) || DEFAULT_LIMIT);

  block.textContent = '';

  const entries = await fetchNewsIndex();
  if (entries.length === 0) return;

  const ranked = entries
    .map((e) => ({ entry: e, ts: parsePublishDate(e.publishDate) }))
    .filter((e) => e.ts !== null)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, limit)
    .map((e) => e.entry);

  if (ranked.length === 0) return;

  const formattedDates = await Promise.all(
    ranked.map((entry) => formatIsoDate(entry.publishDate)),
  );

  const list = document.createElement('ul');
  list.className = 'news-list-items';
  ranked.forEach((entry, i) => list.append(buildCard(entry, formattedDates[i])));
  block.append(list);
}
