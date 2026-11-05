# Persistent JSON data

The API reads and writes the JSON files in this directory. Empty collection files are intentional preparation scaffolds, not migrated data. `homepage.json`, `contact.json` and `site.json` are singleton slots and remain `null` until the Phase 3 import. Source data in `src/data/` is preserved.

| File | Entity / shape |
|---|---|
| `products.json` | Product collection; preserves product ids, image order, specifications and relations |
| `brands.json` | Brand collection |
| `categories.json` | Category collection |
| `product-types.json` | Product type collection, retaining `categoryId` |
| `models.json` | Model collection, retaining `brandId` |
| `promotions.json` | Promotion collection and date/status fields |
| `blog.json` | Blog article collection |
| `dealers.json` | Dealer collection; existing `key` is the stable identifier |
| `homepage.json` | Homepage singleton |
| `contact.json` | Contact singleton |
| `site.json` | Site-level settings such as the existing logo URL |

`backups/`, `migration-reports/` and `image-cache/` hold generated runtime artifacts. Do not manually add sample data to make the migration appear complete.
