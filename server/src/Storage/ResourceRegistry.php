<?php
declare(strict_types=1);

namespace Funbike\Storage;

final class ResourceRegistry
{
    /** @return array<string, array{file: string, mode: string, publicPublishedOnly?: bool, publicStatuses?: list<string>, keyField?: string}> */
    public static function all(): array
    {
        return [
            'products' => ['file' => 'products.json', 'mode' => 'collection', 'publicPublishedOnly' => true],
            'brands' => ['file' => 'brands.json', 'mode' => 'collection'],
            'categories' => ['file' => 'categories.json', 'mode' => 'collection'],
            'product-types' => ['file' => 'product-types.json', 'mode' => 'collection'],
            'models' => ['file' => 'models.json', 'mode' => 'collection'],
            'promotions' => ['file' => 'promotions.json', 'mode' => 'collection', 'publicStatuses' => ['ACTIVE']],
            'blog' => ['file' => 'blog.json', 'mode' => 'collection', 'publicPublishedOnly' => true],
            'dealers' => ['file' => 'dealers.json', 'mode' => 'collection', 'keyField' => 'key'],
            // Singletons retain the source object shape instead of inventing a list wrapper.
            'homepage' => ['file' => 'homepage.json', 'mode' => 'singleton'],
            'contact' => ['file' => 'contact.json', 'mode' => 'singleton'],
            'site' => ['file' => 'site.json', 'mode' => 'singleton'],
        ];
    }

    public static function get(string $resource): array
    {
        $registry = self::all();
        if (!isset($registry[$resource])) {
            throw new \InvalidArgumentException('Unknown resource.');
        }
        return $registry[$resource];
    }
}
