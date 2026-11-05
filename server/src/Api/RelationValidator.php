<?php
declare(strict_types=1);

namespace Funbike\Api;

use Funbike\Storage\JsonStore;

final class RelationValidator
{
    public function __construct(private readonly JsonStore $store) {}

    public function validate(string $resource, array $record): array
    {
        $errors = [];
        $require = function (string $collection, mixed $id, string $field) use (&$errors): void {
            if (!is_string($id) || $id === '' || !$this->exists($collection, $id)) {
                $errors[] = ['field' => $field, 'message' => "Referenced {$collection} record does not exist."];
            }
        };
        if ($resource === 'products') {
            $require('brands', $record['brandId'] ?? null, 'brandId');
            $require('categories', $record['categoryId'] ?? null, 'categoryId');
            $require('product-types', $record['productTypeId'] ?? null, 'productTypeId');
            if (isset($record['modelId'])) $require('models', $record['modelId'], 'modelId');
            $type = isset($record['productTypeId']) ? $this->find('product-types', (string)$record['productTypeId']) : null;
            if ($type !== null && isset($record['categoryId']) && ($type['categoryId'] ?? null) !== $record['categoryId']) $errors[] = ['field' => 'categoryId/productTypeId', 'message' => 'Product type belongs to a different category.'];
            $model = isset($record['modelId']) ? $this->find('models', (string)$record['modelId']) : null;
            if ($model !== null && isset($record['brandId']) && ($model['brandId'] ?? null) !== $record['brandId']) $errors[] = ['field' => 'brandId/modelId', 'message' => 'Model belongs to a different brand.'];
            foreach (($record['compatibleBrandIds'] ?? []) as $brandId) $require('brands', $brandId, 'compatibleBrandIds');
        } elseif ($resource === 'models') {
            $require('brands', $record['brandId'] ?? null, 'brandId');
        } elseif ($resource === 'product-types') {
            $require('categories', $record['categoryId'] ?? null, 'categoryId');
        } elseif ($resource === 'promotions') {
            foreach (($record['productIds'] ?? []) as $productId) $require('products', $productId, 'productIds');
        } elseif ($resource === 'homepage') {
            foreach (['featuredProductIds', 'heroFeaturedProductIds'] as $field) {
                foreach (($record[$field] ?? []) as $productId) $require('products', $productId, $field);
            }
            foreach (($record['highlights'] ?? []) as $highlight) if (isset($highlight['productId'])) $require('products', $highlight['productId'], 'highlights.productId');
            foreach (($record['exclusiveBrands'] ?? []) as $brand) if (isset($brand['brandId'])) $require('brands', $brand['brandId'], 'exclusiveBrands.brandId');
        }
        return $errors;
    }

    /** Blocks soft deletion of a parent while live records still refer to it. */
    public function dependents(string $resource, string $id): array
    {
        $checks = match ($resource) {
            'brands' => [
                ['products', static fn(array $item): bool => ($item['brandId'] ?? null) === $id || in_array($id, $item['compatibleBrandIds'] ?? [], true)],
                ['models', static fn(array $item): bool => ($item['brandId'] ?? null) === $id],
            ],
            'categories' => [
                ['products', static fn(array $item): bool => ($item['categoryId'] ?? null) === $id],
                ['product-types', static fn(array $item): bool => ($item['categoryId'] ?? null) === $id],
            ],
            'product-types' => [['products', static fn(array $item): bool => ($item['productTypeId'] ?? null) === $id]],
            'models' => [['products', static fn(array $item): bool => ($item['modelId'] ?? null) === $id]],
            'products' => [
                ['promotions', static fn(array $item): bool => in_array($id, $item['productIds'] ?? [], true)],
                ['homepage', fn(array $item): bool => $this->homepageReferences($item, $id)],
            ],
            default => [],
        };
        $references = [];
        foreach ($checks as [$collection, $matches]) {
            $data = $collection === 'homepage' ? [$this->store->read('homepage')] : $this->store->read($collection);
            if (!is_array($data)) continue;
            foreach ($data as $item) {
                if (!is_array($item) || isset($item['deletedAt']) || !$matches($item)) continue;
                $key = $collection === 'homepage' ? 'homepage' : (string)($item['id'] ?? $item['key'] ?? 'unknown');
                $references[] = ['resource' => $collection, 'id' => $key];
            }
        }
        return $references;
    }

    private function homepageReferences(array $homepage, string $productId): bool
    {
        if (in_array($productId, $homepage['featuredProductIds'] ?? [], true) || in_array($productId, $homepage['heroFeaturedProductIds'] ?? [], true)) return true;
        foreach (($homepage['highlights'] ?? []) as $highlight) if (($highlight['productId'] ?? null) === $productId) return true;
        return false;
    }

    private function find(string $resource, string $id): ?array
    {
        $definition = \Funbike\Storage\ResourceRegistry::get($resource);
        $data = $this->store->read($resource);
        if ($definition['mode'] === 'singleton') return is_array($data) && !isset($data['_deletedAt']) ? $data : null;
        $keyField = $definition['keyField'] ?? 'id';
        foreach ($data as $item) if (($item[$keyField] ?? null) === $id && !isset($item['deletedAt'])) return $item;
        return null;
    }

    private function exists(string $resource, string $id): bool
    {
        return $this->find($resource, $id) !== null;
    }
}
