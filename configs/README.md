# Site configuration

Site-level runtime configuration lives in two places, with a defined precedence:

1. **`/configs/*.json` (this folder)** — durable defaults committed to the repo, reviewed in pull requests, deployed atomically with code.
2. **`/configs` sheet in DA** — optional author-managed overrides. When present, sheet values override matching keys from the repo JSON. Useful for hot-fixing a value without a code release.

If both sources are unavailable (e.g., a brand-new environment), each consumer module falls back to its own in-code constants so the site never breaks.

## Resolution order

```
in-code fallback constants  ←  repo JSON  ←  DA sheet (optional)
   (last resort)              (default)      (override winner)
```

## Files

| File | Purpose |
|---|---|
| `date-formats.json` | Country-aware date format strings consumed by `scripts/date-format.js`. |

## How to override via DA (authors)

1. Open `https://da.live/sheet#/manjunathk38-stack/stryker/configs` (creates the sheet if it does not exist).
2. Add rows in `key`/`value` columns. Example:

   | key | value |
   |---|---|
   | date.format.uk | dd/MM/yyyy HH:mm z |

3. Save and publish the sheet. The next page load will pick up the override.

Authors only need to author the keys they want to change — unlisted keys keep their repo defaults.

## How to add a new country (developers)

1. Add an entry to `configs/date-formats.json`, e.g. `"date.format.it": "dd/MM/yyyy HH:mm z"`.
2. Open a PR. After merge and code-sync, the new value is live.

## Format token reference (date formats)

| Token | Meaning |
|---|---|
| `yyyy` | 4-digit year |
| `MM` | 2-digit month |
| `dd` | 2-digit day |
| `HH` | 24-hour hour |
| `h` | 12-hour hour |
| `mm` | 2-digit minute |
| `a` | `a.m.` / `p.m.` |
| `z` | Timezone passthrough (e.g., `ET` from authored content) |

Any character that is not a token is treated as a literal.
