# Single Page Migration Plan

## Overview

Migrate a single web page to AEM Edge Delivery Services (DA project type) with design styling extracted and applied to match the original page's visual look. The migration will prioritize matching page sections to existing EDS blocks in the project's block library before creating new variants. This plan covers analysis, infrastructure generation, content import, and visual validation.

**Source URL:** https://www.stryker.com/us/en/about/news/2026/a-message-to-our-customers-03-2026.html

**Project Type:** DA (Document Authoring)

**Block Strategy:** Reuse existing EDS blocks from the project's block library wherever possible; only create new variants when no suitable existing block matches.

## Checklist

### Phase 1 — Setup & Analysis
- [ ] Confirm project type as **DA** and load the DA-specific Block Library endpoint
- [ ] Discover and inventory all available EDS blocks in the project's block catalog
- [ ] Analyze the source page: structure, sections, blocks, and authoring decisions
- [ ] Produce analysis artifacts (cleaned HTML, screenshots, page-templates JSON)

### Phase 2 — Block Variants & Mapping
- [ ] **Prioritize matching page sections to existing EDS blocks** in the catalog
- [ ] For each section, attempt to use an existing block variant before considering a new one
- [ ] Document the block-to-section mapping rationale (which existing block fits which section and why)
- [ ] Only create a new variant if no existing block reasonably matches the content pattern
- [ ] When new variants are required, track metadata and follow ≥70% similarity reuse threshold
- [ ] Add DOM selectors / block mappings to page-templates.json

### Phase 3 — Import Infrastructure
- [ ] Generate block parsers for each block variant used on the page
- [ ] Generate page transformers (cleanup + sections)
- [ ] Generate the bundled import script
- [ ] Validate parser and transformer outputs

### Phase 4 — Content Import
- [ ] Run the bulk import to produce content in the project's content directory
- [ ] Verify imported HTML renders correctly via local preview

### Phase 5 — Design Migration & Styling
- [ ] Extract computed styles from the original page (typography, colors, spacing, layout)
- [ ] Apply site-level design tokens (CSS custom properties, fonts)
- [ ] Style each block on the page to match the original look
- [ ] Visually compare original vs. migrated; iterate until pixel-close

### Phase 6 — Validation & QA
- [ ] Page critique: full-page visual diff against the original
- [ ] Fix any CSS / layout discrepancies surfaced by the critique
- [ ] Check accessibility (heading hierarchy, alt text, ARIA)
- [ ] Verify responsive behavior at mobile / tablet / desktop breakpoints

## Notes

- Plan is ready. Execution requires Execute mode — please switch out of Plan mode to proceed.
- Project type is **DA** — the project expert will configure the appropriate DA block library endpoint.
- **Block reuse is the priority** in Phase 2: every section will first be evaluated against the existing block catalog, and a new variant will only be created when no existing block reasonably fits.
- The site migration skill will orchestrate site analysis, page analysis, block mapping, and import infrastructure as a single coordinated workflow.
