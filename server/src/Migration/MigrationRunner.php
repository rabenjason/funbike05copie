<?php
declare(strict_types=1);

namespace Funbike\Migration;

use Funbike\Storage\JsonStore;
use Funbike\Storage\ResourceRegistry;

final class MigrationRunner
{
    private const RESOURCE_MAP = [
        'products' => 'products', 'brands' => 'brands', 'categories' => 'categories',
        'productTypes' => 'product-types', 'models' => 'models', 'promotions' => 'promotions',
        'blog' => 'blog', 'dealers' => 'dealers', 'homepage' => 'homepage',
        'contact' => 'contact', 'site' => 'site',
    ];

    public function __construct(private readonly string $serverRoot, private readonly JsonStore $store) {}

    public function run(string $manifestPath, bool $apply, bool $retryImages = false): array
    {
        if (!is_file($manifestPath)) throw new \RuntimeException("Migration snapshot not found: {$manifestPath}. Run the export command first.");
        $manifest = json_decode((string)file_get_contents($manifestPath), true, 512, JSON_THROW_ON_ERROR);
        if (($manifest['manifestVersion'] ?? null) !== 1 || !is_array($manifest['data'] ?? null)) throw new \RuntimeException('Unsupported or malformed migration snapshot.');
        $sourceHash = (string)($manifest['sourceHash'] ?? '');
        if (!preg_match('/^[a-f0-9]{64}$/', $sourceHash)) throw new \RuntimeException('Snapshot does not contain a valid source hash.');

        $source = $this->normalize($manifest['data']);
        $report = [
            'createdAt' => gmdate(DATE_ATOM), 'mode' => $apply ? 'apply' : 'dry-run',
            'sourceHash' => $sourceHash, 'sourceFiles' => $manifest['sourceFiles'] ?? [],
            'counts' => [], 'duplicates' => [], 'relations' => [], 'images' => null,
            'errors' => [], 'warnings' => [],
        ];
        $report['relations'] = $this->validateRelations($source);
        $report['duplicates'] = $this->findDuplicates($source);
        foreach ($source as $resource => $value) {
            $report['counts'][$resource] = is_array($value) && array_is_list($value) ? count($value) : ($value === null ? 0 : 1);
        }
        if ($report['relations'] !== []) $report['warnings'][] = 'Relation validation found unresolved references; no data will be written until corrected.';
        if ($report['duplicates'] !== []) $report['warnings'][] = 'Duplicate source identifiers were detected; later copies are ignored.';

        $imageMigrator = new ImageMigrator($this->serverRoot . '/uploads', $this->serverRoot . '/storage/image-cache');
        if ($apply && $report['relations'] !== []) {
            $report['errors'][] = 'Apply is blocked because relation validation failed.';
        } elseif ($apply) {
            $this->backupStorage($sourceHash);
            $report['storage'] = $this->importEntities($source, $imageMigrator, $retryImages);
        } else {
            $report['storage'] = ['wouldImport' => $this->countSourceRecords($source), 'written' => 0, 'skippedExisting' => 0];
        }
        $report['images'] = $imageMigrator->summary();
        $report['imageReferenceCount'] = $this->countImageUrls($source);
        $report['reportFile'] = $this->saveReport($report, $sourceHash);
        return $report;
    }

    private function normalize(array $data): array
    {
        $normalized = [];
        foreach (self::RESOURCE_MAP as $sourceKey => $resource) {
            if (!array_key_exists($sourceKey, $data)) throw new \RuntimeException("Snapshot is missing '{$sourceKey}'.");
            $normalized[$resource] = $data[$sourceKey];
            if (($resource === 'homepage' || $resource === 'contact' || $resource === 'site') && !is_array($data[$sourceKey])) {
                throw new \RuntimeException("Snapshot singleton '{$sourceKey}' must be an object.");
            }
            if (in_array($resource, ['products', 'brands', 'categories', 'product-types', 'models', 'promotions', 'blog', 'dealers'], true) && !is_array($data[$sourceKey])) {
                throw new \RuntimeException("Snapshot collection '{$sourceKey}' must be an array.");
            }
        }
        return $normalized;
    }

    private function validateRelations(array $source): array
    {
        $errors = [];
        $ids = static function (array $items, string $key = 'id'): array {
            $result = [];
            foreach ($items as $item) if (is_array($item) && isset($item[$key])) $result[(string)$item[$key]] = true;
            return $result;
        };
        $brands = $ids($source['brands']);
        $categories = $ids($source['categories']);
        $types = $ids($source['product-types']);
        $typeRecords = [];
        foreach ($source['product-types'] as $type) if (isset($type['id'])) $typeRecords[(string)$type['id']] = $type;
        $models = $ids($source['models']);
        $modelRecords = [];
        foreach ($source['models'] as $model) if (isset($model['id'])) $modelRecords[(string)$model['id']] = $model;
        $products = $ids($source['products']);
        foreach ($source['products'] as $product) {
            $pid = (string)($product['id'] ?? '(missing id)');
            foreach (['brandId' => $brands, 'categoryId' => $categories, 'productTypeId' => $types] as $field => $known) {
                if (!isset($product[$field]) || !isset($known[(string)$product[$field]])) $errors[] = ['entity' => 'product', 'id' => $pid, 'field' => $field, 'value' => $product[$field] ?? null];
            }
            if (isset($product['modelId']) && !isset($models[(string)$product['modelId']])) $errors[] = ['entity' => 'product', 'id' => $pid, 'field' => 'modelId', 'value' => $product['modelId']];
            if (isset($product['productTypeId'], $product['categoryId'], $typeRecords[(string)$product['productTypeId']]) && ($typeRecords[(string)$product['productTypeId']]['categoryId'] ?? null) !== $product['categoryId']) $errors[] = ['entity' => 'product', 'id' => $pid, 'field' => 'categoryId/productTypeId', 'value' => [$product['categoryId'], $product['productTypeId']]];
            if (isset($product['modelId'], $product['brandId'], $modelRecords[(string)$product['modelId']]) && ($modelRecords[(string)$product['modelId']]['brandId'] ?? null) !== $product['brandId']) $errors[] = ['entity' => 'product', 'id' => $pid, 'field' => 'brandId/modelId', 'value' => [$product['brandId'], $product['modelId']]];
            foreach (($product['compatibleBrandIds'] ?? []) as $brandId) if (!isset($brands[(string)$brandId])) $errors[] = ['entity' => 'product', 'id' => $pid, 'field' => 'compatibleBrandIds', 'value' => $brandId];
        }
        foreach ($source['models'] as $model) if (!isset($brands[(string)($model['brandId'] ?? '')])) $errors[] = ['entity' => 'model', 'id' => $model['id'] ?? null, 'field' => 'brandId', 'value' => $model['brandId'] ?? null];
        foreach ($source['product-types'] as $type) if (!isset($categories[(string)($type['categoryId'] ?? '')])) $errors[] = ['entity' => 'product-type', 'id' => $type['id'] ?? null, 'field' => 'categoryId', 'value' => $type['categoryId'] ?? null];
        $homepage = $source['homepage'];
        $highlightIds = $homepage['featuredProductIds'] ?? [];
        foreach (($homepage['heroFeaturedProductIds'] ?? []) as $id) $highlightIds[] = $id;
        foreach (($homepage['highlights'] ?? []) as $highlight) if (isset($highlight['productId'])) $highlightIds[] = $highlight['productId'];
        foreach ($highlightIds as $productId) if (!isset($products[(string)$productId])) $errors[] = ['entity' => 'homepage', 'field' => 'productId', 'value' => $productId];
        return $errors;
    }

    private function findDuplicates(array $source): array
    {
        $duplicates = [];
        foreach ($source as $resource => $value) {
            if (!is_array($value) || !array_is_list($value)) continue;
            $field = $resource === 'dealers' ? 'key' : 'id';
            $seen = [];
            foreach ($value as $item) {
                $id = $item[$field] ?? null;
                if (!is_string($id) || $id === '') { $duplicates[] = ['resource' => $resource, 'issue' => 'missing identifier']; continue; }
                if (isset($seen[$id])) $duplicates[] = ['resource' => $resource, 'id' => $id, 'issue' => 'duplicate source identifier'];
                $seen[$id] = true;
            }
        }
        $imageUrls = [];
        $walk = function (mixed $node, string $resource, string $path = 'record') use (&$walk, &$imageUrls): void {
            if (!is_array($node)) return;
            foreach ($node as $key => $value) {
                if (is_string($value) && in_array((string)$key, ['url', 'src', 'logoUrl', 'imageUrl', 'bannerUrl', 'bannerImageUrl', 'heroImage', 'coverImage', 'thumbnailUrl', 'featuredImageUrl'], true) && filter_var($value, FILTER_VALIDATE_URL)) {
                    $imageUrls[$value][] = $resource . ':' . $path . '.' . (string)$key;
                } elseif (is_array($value)) {
                    $walk($value, $resource, $path . '.' . (string)$key);
                }
            }
        };
        foreach ($source as $resource => $value) $walk($value, $resource);
        foreach ($imageUrls as $url => $references) if (count($references) > 1) {
            $duplicates[] = ['type' => 'image-url', 'url' => $url, 'references' => count($references)];
        }
        foreach (ResourceRegistry::all() as $resource => $definition) {
            if ($definition['mode'] !== 'collection') continue;
            $keyField = $definition['keyField'] ?? 'id';
            $seen = [];
            foreach ($this->store->read($resource) as $item) {
                $id = (string)($item[$keyField] ?? '');
                if ($id !== '' && isset($seen[$id])) $duplicates[] = ['type' => 'stored-id', 'resource' => $resource, 'id' => $id];
                $seen[$id] = true;
            }
        }
        return $duplicates;
    }

    private function importEntities(array $source, ImageMigrator $images, bool $retryImages): array
    {
        $result = ['written' => 0, 'skippedExisting' => 0, 'imagesRetried' => 0];
        foreach ($source as $resource => $incoming) {
            $definition = ResourceRegistry::get($resource);
            if ($definition['mode'] === 'singleton') {
                $current = $this->store->read($resource);
                if ($current !== null) { $result['skippedExisting']++; continue; }
                $record = $incoming;
                $images->rewrite($record, $resource, $resource);
                $this->store->write($resource, $record);
                $result['written']++;
                continue;
            }
            $current = $this->store->read($resource);
            $keyField = $definition['keyField'] ?? 'id';
            $index = [];
            foreach ($current as $position => $record) if (isset($record[$keyField])) $index[(string)$record[$keyField]] = $position;
            $changed = false;
            foreach ($incoming as $original) {
                if (!is_array($original) || !isset($original[$keyField])) continue;
                $id = (string)$original[$keyField];
                if (isset($index[$id])) {
                    $result['skippedExisting']++;
                    if ($retryImages) {
                        $migrated = $original;
                        $images->rewrite($migrated, $resource, $id);
                        $updated = $this->replaceOnlyMigratedImages($current[$index[$id]], $original, $migrated);
                        if ($updated !== $current[$index[$id]]) {
                            $current[$index[$id]] = $updated;
                            $result['imagesRetried']++;
                            $changed = true;
                        }
                    }
                    continue;
                }
                $record = $original;
                $images->rewrite($record, $resource, $id);
                $index[$id] = count($current);
                $current[] = $record;
                $result['written']++;
                $changed = true;
            }
            if ($changed) $this->store->write($resource, $current);
        }
        return $result;
    }

    private function replaceOnlyMigratedImages(mixed $current, mixed $original, mixed $migrated): mixed
    {
        if (is_string($original) && is_string($migrated) && is_string($current)
            && $original !== $migrated && str_starts_with($migrated, '/uploads/') && $current === $original) return $migrated;
        if (!is_array($original) || !is_array($migrated) || !is_array($current)) return $current;
        foreach ($original as $key => $value) {
            if (array_key_exists($key, $migrated) && array_key_exists($key, $current)) {
                $current[$key] = $this->replaceOnlyMigratedImages($current[$key], $value, $migrated[$key]);
            }
        }
        return $current;
    }

    private function backupStorage(string $sourceHash): void
    {
        $storage = $this->serverRoot . '/storage';
        $backup = $storage . '/backups/' . gmdate('Ymd-His') . '-' . substr($sourceHash, 0, 12) . '-' . bin2hex(random_bytes(3));
        if (!mkdir($backup, 0775, true) && !is_dir($backup)) throw new \RuntimeException('Could not create storage backup directory.');
        foreach (glob($storage . '/*.json') ?: [] as $file) {
            if (!copy($file, $backup . '/' . basename($file))) throw new \RuntimeException('Could not back up ' . basename($file));
        }
        $uploads = $this->serverRoot . '/uploads';
        if (is_dir($uploads)) $this->copyTree($uploads, $backup . '/uploads');
    }

    private function copyTree(string $source, string $destination): void
    {
        if (!is_dir($destination) && !mkdir($destination, 0775, true) && !is_dir($destination)) throw new \RuntimeException('Could not create backup image directory.');
        foreach (scandir($source) ?: [] as $entry) {
            if ($entry === '.' || $entry === '..') continue;
            $from = $source . DIRECTORY_SEPARATOR . $entry;
            $to = $destination . DIRECTORY_SEPARATOR . $entry;
            if (is_dir($from)) $this->copyTree($from, $to);
            elseif (is_file($from) && !copy($from, $to)) throw new \RuntimeException('Could not back up image ' . $from);
        }
    }

    private function countSourceRecords(array $source): int
    {
        $count = 0;
        foreach ($source as $value) $count += is_array($value) && array_is_list($value) ? count($value) : ($value === null ? 0 : 1);
        return $count;
    }

    private function countImageUrls(array $source): int
    {
        $count = 0;
        $walk = function (mixed $node) use (&$walk, &$count): void {
            if (!is_array($node)) return;
            foreach ($node as $key => $value) {
                if (is_string($value) && in_array((string)$key, ['url', 'src', 'logoUrl', 'imageUrl', 'bannerUrl', 'bannerImageUrl', 'heroImage', 'coverImage', 'thumbnailUrl', 'featuredImageUrl'], true) && filter_var($value, FILTER_VALIDATE_URL)) $count++;
                elseif (is_array($value)) $walk($value);
            }
        };
        foreach ($source as $value) $walk($value);
        return $count;
    }

    private function saveReport(array $report, string $sourceHash): string
    {
        $directory = $this->serverRoot . '/storage/migration-reports';
        if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) throw new \RuntimeException('Could not create migration report directory.');
        $suffix = $report['mode'] === 'dry-run' ? 'dry-run' : 'apply';
        $path = $directory . '/' . gmdate('Ymd-His') . '-' . substr($sourceHash, 0, 12) . '-' . $suffix . '.json';
        file_put_contents($path, json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n", LOCK_EX);
        return $path;
    }
}
