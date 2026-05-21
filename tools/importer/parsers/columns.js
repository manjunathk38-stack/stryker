/* eslint-disable */
/* global WebImporter */

/**
 * Parser for variant: columns
 * Base block:        columns
 * Source URL:        https://www.stryker.com/us/en/about/news/2026/a-message-to-our-customers-03-2026.html
 * Generated:         2026-05-21
 *
 * Source HTML structure (from migration-work/block-context/columns/source.html):
 *   Two sibling <div class="standaloneimage ... aem-GridColumn--default--6"> elements
 *   (sharing the same parent), each containing a single <img> wrapped in
 *   .c-standalone-image > .c-standalone-image-content > .title-content > .text-center.
 *   The two scanned "General Assurance Letter" pages are laid out side-by-side
 *   via the AEM responsive grid (each column = 6/12 on desktop).
 *
 * Target table (from migration-work/block-context/columns/library-example.md):
 *   Row 1: block name "columns" (single header cell, spans all columns)
 *   Row 2+: one row per content row, with N cells where N = column count
 *   For this instance we have a single content row of 2 cells, one image per cell.
 *
 * Selector (from tools/importer/page-templates.json):
 *   .standaloneimage.aem-GridColumn--default--6
 *   This selector matches BOTH sibling divs simultaneously, so the parser is
 *   invoked once per match. To avoid producing two duplicate Columns blocks
 *   we build the table on the FIRST matched element (using its parent to
 *   collect every sibling that matches the selector) and remove the rest.
 */
export default function parse(element, { document }) {
  const SELECTOR = '.standaloneimage.aem-GridColumn--default--6';
  const parent = element.parentElement;

  // Gather every sibling column that belongs in this Columns block. The
  // selector matches all .standaloneimage.aem-GridColumn--default--6 children
  // of the same parent grid; querying from the parent keeps order stable and
  // works regardless of how many columns are present (defensive for variation:
  // the same template might place 2, 3, or more side-by-side images).
  const columnEls = parent
    ? Array.from(parent.querySelectorAll(`:scope > ${SELECTOR}`))
    : [element];

  // The first matched element is the "anchor" we replace with the block.
  // Subsequent matched siblings are removed so the importer doesn't emit
  // duplicate Columns tables for the same group.
  if (columnEls[0] !== element) {
    element.remove();
    return;
  }

  // Build one cell per source column. Each cell receives the inner image
  // (preferred) or, as a fallback, the column's content wrapper - this
  // preserves alt/src/title and lets the importer download the asset.
  const cellRow = columnEls.map((col) => {
    const img = col.querySelector(
      '.c-standalone-image-content img, .title-content img, img.img-responsive, img',
    );
    if (img) return img;
    // Fallback: hand over the inner content wrapper so any non-image
    // authoring (caption, link) still survives the import.
    return col.querySelector('.c-standalone-image-content, .c-standalone-image') || col;
  });

  const cells = [cellRow];

  const block = WebImporter.Blocks.createBlock(document, {
    name: 'columns',
    cells,
  });

  // Replace the anchor element with the generated block, then remove the
  // remaining sibling columns we already consumed into `cells`.
  element.replaceWith(block);
  for (let i = 1; i < columnEls.length; i += 1) {
    columnEls[i].remove();
  }
}
