<?php
declare(strict_types=1);

namespace Funbike\Api;

use Funbike\Http\Request;
use Funbike\Http\Response;
use Funbike\Storage\JsonStore;
use Funbike\Storage\ResourceRegistry;

final class ResourceController
{
    private readonly RelationValidator $relations;

    public function __construct(private readonly JsonStore $store)
    {
        $this->relations = new RelationValidator($store);
    }

    public function dispatch(string $resource, ?string $id, string $method): never
    {
        $definition = ResourceRegistry::get($resource);
        $admin = Request::isAdmin();
        if (!in_array($method, ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            header('Allow: GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS');
            Response::error('Method not allowed.', 405);
        }
        if ($method !== 'GET' && $method !== 'HEAD' && !$admin) {
            Response::error('A valid administrator bearer token is required for changes.', 401);
        }

        if ($definition['mode'] === 'singleton') {
            $this->singleton($resource, $id, $method);
        }

        $items = $this->store->read($resource);
        if ($id === null && $method === 'GET') {
            $includeHidden = $admin && ($_GET['includeHidden'] ?? '') === '1';
            $items = array_values(array_filter($items, function (array $item) use ($definition, $includeHidden): bool {
                if (isset($item['deletedAt']) && !$includeHidden) return false;
                if (!$includeHidden && !$this->isPublicStatus($item, $definition)) return false;
                return true;
            }));
            Response::json(['data' => $items]);
        }

        if ($id === null && $method === 'POST') {
            $body = Request::jsonBody();
            $keyField = $definition['keyField'] ?? 'id';
            $newId = $body[$keyField] ?? null;
            if (!is_string($newId) || trim($newId) === '') Response::error('A non-empty string id is required.', 422);
            foreach ($items as $item) if (($item[$keyField] ?? null) === $newId) Response::error('An item with this id already exists.', 409);
            $body[$keyField] = $newId;
            $this->assertRelations($resource, $body);
            $items[] = $body;
            $this->store->write($resource, $items);
            Response::json(['data' => $body], 201);
        }

        if ($id === null) Response::error('An item id is required for this operation.', 400);
        $keyField = $definition['keyField'] ?? 'id';
        $index = $this->findIndex($items, $id, $keyField);
        if ($index === null) Response::error('Resource not found.', 404);

        if ($method === 'GET' || $method === 'HEAD') {
            $item = $items[$index];
            if (!$admin && isset($item['deletedAt'])) Response::error('Resource not found.', 404);
            if (!$admin && !$this->isPublicStatus($item, $definition)) Response::error('Resource not found.', 404);
            Response::json(['data' => $item]);
        }

        if ($method === 'PUT' || $method === 'PATCH') {
            $body = Request::jsonBody();
            $items[$index] = $method === 'PATCH' ? array_replace($items[$index], $body) : $body;
            $items[$index][$keyField] = $id;
            unset($items[$index]['deletedAt']);
            $this->assertRelations($resource, $items[$index]);
            $this->store->write($resource, $items);
            Response::json(['data' => $items[$index]]);
        }

        if ($method === 'DELETE') {
            $dependents = $this->relations->dependents($resource, $id);
            if ($dependents !== []) Response::json(['error' => ['message' => 'Cannot delete a record that is still referenced.', 'dependents' => $dependents]], 409);
            $items[$index]['deletedAt'] = gmdate(DATE_ATOM);
            if (array_key_exists('status', $items[$index])) $items[$index]['status'] = 'ARCHIVED';
            $this->store->write($resource, $items);
            Response::json(['data' => $items[$index]]);
        }

        Response::error('Method not allowed.', 405);
    }

    private function singleton(string $resource, ?string $id, string $method): never
    {
        if ($id !== null && $id !== $resource) Response::error('Singleton id must be omitted or match the resource name.', 404);
        $value = $this->store->read($resource);
        if ($method === 'GET' || $method === 'HEAD') {
            if ($value === null || (is_array($value) && isset($value['_deletedAt']))) Response::error('Resource not found.', 404);
            Response::json(['data' => $value]);
        }
        if ($method === 'POST' && $value !== null) Response::error('Singleton already exists.', 409);
        if ($method === 'PATCH' && $value === null) Response::error('Resource not found.', 404);
        if ($method === 'POST' || $method === 'PUT' || $method === 'PATCH') {
            $body = Request::jsonBody();
            if ($method === 'PATCH' && is_array($value)) $body = array_replace($value, $body);
            unset($body['_deletedAt']);
            $this->assertRelations($resource, $body);
            $this->store->write($resource, $body);
            Response::json(['data' => $body], $value === null ? 201 : 200);
        }
        if ($method === 'DELETE') {
            if ($value === null) Response::error('Resource not found.', 404);
            $value['_deletedAt'] = gmdate(DATE_ATOM);
            $this->store->write($resource, $value);
            Response::json(['data' => $value]);
        }
        Response::error('Method not allowed.', 405);
    }

    private function assertRelations(string $resource, array $record): void
    {
        $errors = $this->relations->validate($resource, $record);
        if ($errors !== []) Response::json(['error' => ['message' => 'One or more relationships are invalid.', 'details' => $errors]], 422);
    }

    private function isPublicStatus(array $item, array $definition): bool
    {
        if (isset($definition['publicStatuses'])) return in_array($item['status'] ?? null, $definition['publicStatuses'], true);
        if (($definition['publicPublishedOnly'] ?? false) === true) return ($item['status'] ?? null) === 'PUBLISHED';
        return true;
    }

    private function findIndex(array $items, string $id, string $keyField = 'id'): ?int
    {
        foreach ($items as $index => $item) if ((string)($item[$keyField] ?? '') === $id) return $index;
        return null;
    }
}
