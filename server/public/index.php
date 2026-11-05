<?php
declare(strict_types=1);

use Funbike\Api\MediaController;
use Funbike\Api\ResourceController;
use Funbike\Http\Response;
use Funbike\Storage\JsonStore;
use Funbike\Storage\ResourceRegistry;

spl_autoload_register(static function (string $class): void {
    $prefix = 'Funbike\\';
    if (!str_starts_with($class, $prefix)) return;
    $relative = str_replace('\\', DIRECTORY_SEPARATOR, substr($class, strlen($prefix)));
    $file = dirname(__DIR__) . '/src/' . $relative . '.php';
    if (is_file($file)) require $file;
});

set_exception_handler(static function (Throwable $error): void {
    error_log((string)$error);
    Response::error('Internal server error.', 500);
});

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
if ($method === 'OPTIONS') {
    header('Allow: GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS');
    http_response_code(204);
    exit;
}
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$serverDirectory = dirname(__DIR__);
$store = new JsonStore($serverDirectory . '/storage');
$media = new MediaController($serverDirectory . '/uploads');

if ($path === '/api/health' && in_array($method, ['GET', 'HEAD'], true)) {
    Response::json(['data' => ['status' => 'ok', 'storage' => 'json']]);
}
if (str_starts_with($path, '/uploads/')) {
    if ($method !== 'GET' && $method !== 'HEAD') Response::error('Method not allowed.', 405);
    $media->serve(substr($path, strlen('/uploads/')));
}
if (preg_match('#^/api/media/([^/]+)/([^/]+)$#', $path, $match) === 1 && $method === 'POST') {
    $media->upload(rawurldecode($match[1]), rawurldecode($match[2]));
}
if (preg_match('#^/api/([a-z-]+)(?:/([^/]+))?/?$#', $path, $match) === 1) {
    $resource = $match[1];
    if (!isset(ResourceRegistry::all()[$resource])) Response::error('Resource not found.', 404);
    $id = isset($match[2]) ? rawurldecode($match[2]) : null;
    (new ResourceController($store))->dispatch($resource, $id, $method);
}
Response::error('Route not found.', 404);
