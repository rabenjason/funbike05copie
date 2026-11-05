# Funbike PHP backend scaffold

This directory is the PHP backend prepared for the migration. It is intentionally **not populated from `src/data/` yet**. Run the one-time migration only in Phase 3, after reviewing its dry-run report and confirming PHP is installed in the target environment.

## Requirements and local start

- PHP 8.1 or newer with the standard JSON, fileinfo and image inspection functions enabled.
- Node.js and the existing project dependencies for exporting the TypeScript source data (`typescript` is already a project devDependency).
- Writable `server/storage/` and `server/uploads/` directories for the PHP process.

From the repository root, start the API with:

```sh
FUNBIKE_ADMIN_TOKEN='a-long-random-secret' php -S 0.0.0.0:8080 -t server/public server/public/index.php
```

Set `FUNBIKE_ADMIN_TOKEN` in the server environment; do not commit it. Reads are public. POST, PUT, PATCH, DELETE and image uploads require `Authorization: Bearer <token>`. Configure HTTPS and a strong secret in deployment. CORS is intentionally not opened to arbitrary origins; the intended frontend integration is same-origin or a deliberately configured trusted proxy.

The endpoint catalogue is available at `/api/health` and `/api/{resource}` for products, brands, categories, product-types, models, promotions, blog, dealers, homepage, contact and site. Collection resources use stable `id` values; dealers retain their existing `key`. Homepage, contact and site are JSON singletons so their source object shape can be preserved. Collection deletion is a soft delete (`deletedAt`; status-bearing records become `ARCHIVED`). Deletion of a referenced brand, category, product type, model or product returns `409` rather than leaving dangling relationships. Singleton deletion is a tombstone (`_deletedAt`). A subsequent PUT restores/replaces a singleton. Writes validate the known brand/category/type/model/product links. Hidden/deleted records are omitted from public reads; `?includeHidden=1` requires admin authentication.

Image uploads use `POST /api/media/{products|brands|dealers|blog|homepage}/{entity-id}` with multipart fields `file` and optional `slot` (`main`, `logo` or `image-NN`). Only valid JPEG, PNG, WebP and GIF files up to 12 MB are accepted. Images are stored under entity-specific paths in `server/uploads/` and served through `/uploads/...`; upload handling checks the image before atomically replacing a slot.

## Storage policy

`server/storage/*.json` are the persistent source of truth. Collections start as empty arrays; singleton files start as `null`. These are deliberately empty scaffolds, not sample or migrated records. The API writes JSON atomically under a file lock. Backups and generated migration reports stay in `server/storage/`; source image cache and uploaded media stay outside Git.

## Migration preparation (do not run until Phase 3 is authorized)

1. On the machine with PHP installed, review a dry-run report (no records are written and no images are downloaded):
   ```sh
   npm run migration:dry-run
   ```
   This checks for PHP 8.1+, exports the TypeScript data to the ignored snapshot and runs the PHP dry-run.
2. After reviewing relation and duplicate checks, apply explicitly:
   ```sh
   npm run migration:apply
   ```
   To retry failed image URLs for already imported records without replacing other edited fields:
   ```sh
   npm run migration:retry-images
   ```
3. Start the PHP API locally with:
   ```sh
   FUNBIKE_ADMIN_TOKEN='a-long-random-secret' npm run api:php
   ```

The migration runner backs up current JSON and existing uploads before an apply. It validates entity references, records duplicate IDs, inserts missing records by stable ID (or dealer key), and skips existing IDs on subsequent runs rather than duplicating or overwriting them. With `--retry-images`, it may change only image URL fields that still equal the original source URL. Each unique source URL is fetched once into a SHA-256-keyed cache; verified image bytes are copied into each entity's own directory. A failed, empty, oversized, unsupported or corrupt download leaves the original URL unchanged and is listed with entity, field, URL and reason in the report. Existing files are replaced only after a downloaded image has passed integrity checks. Images use the source MIME type for a clean extension and stable main/secondary naming.

The snapshot file is `server/storage/.migration-source.json`; it is ignored by Git. Reports are written to `server/storage/migration-reports/`. The original `src/data/` files remain untouched. This scaffold does not connect React/Vite to PHP and does not change any visual component.
