<?php
declare(strict_types=1);

namespace Funbike\Api;

use Funbike\Http\Request;
use Funbike\Http\Response;

final class MediaController
{
    private const ENTITY_DIRS = ['products', 'brands', 'dealers', 'blog', 'homepage'];
    private const MIME_EXTENSIONS = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'];

    public function __construct(private readonly string $uploadsDirectory) {}

    public function upload(string $entity, string $id): never
    {
        if (!Request::isAdmin()) Response::error('A valid administrator bearer token is required for uploads.', 401);
        if (!in_array($entity, self::ENTITY_DIRS, true) || !$this->safeSegment($id)) Response::error('Invalid image destination.', 400);
        $file = $_FILES['file'] ?? null;
        if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'] ?? '')) {
            Response::error('A successfully uploaded image file is required.', 422);
        }
        if (($file['size'] ?? 0) < 1 || $file['size'] > 12 * 1024 * 1024) Response::error('Image size must be between 1 byte and 12 MB.', 422);
        $info = @getimagesize($file['tmp_name']);
        $mime = is_array($info) ? ($info['mime'] ?? '') : '';
        if (!isset(self::MIME_EXTENSIONS[$mime])) Response::error('Unsupported or invalid image. Use JPEG, PNG, WebP or GIF.', 422);

        $slot = (string)($_POST['slot'] ?? 'main');
        if (!preg_match('/^(main|logo|image-[0-9]{2,4})$/', $slot)) Response::error('Image slot must be main, logo, or image-NN.', 422);
        $directory = $this->uploadsDirectory . DIRECTORY_SEPARATOR . $entity . DIRECTORY_SEPARATOR . $id;
        if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) Response::error('Unable to create image directory.', 500);
        $destination = $directory . DIRECTORY_SEPARATOR . $slot . '.' . self::MIME_EXTENSIONS[$mime];
        $temporary = tempnam($directory, '.upload-');
        if ($temporary === false || !move_uploaded_file($file['tmp_name'], $temporary)) Response::error('Unable to save uploaded image.', 500);
        $verify = @getimagesize($temporary);
        if (!is_array($verify) || ($verify['mime'] ?? '') !== $mime || filesize($temporary) < 1) {
            unlink($temporary);
            Response::error('Image integrity check failed; existing image was not replaced.', 422);
        }
        if (!rename($temporary, $destination)) {
            unlink($temporary);
            Response::error('Unable to finalize image file.', 500);
        }
        Response::json(['data' => ['url' => '/uploads/' . rawurlencode($entity) . '/' . rawurlencode($id) . '/' . rawurlencode(basename($destination))]], 201);
    }

    public function serve(string $relativePath): never
    {
        $segments = explode('/', trim($relativePath, '/'));
        if (count($segments) !== 3 || !in_array($segments[0], self::ENTITY_DIRS, true)
            || !$this->safeSegment($segments[1]) || !$this->safeFile($segments[2])) {
            Response::error('Image not found.', 404);
        }
        $base = realpath($this->uploadsDirectory);
        $path = realpath($this->uploadsDirectory . DIRECTORY_SEPARATOR . implode(DIRECTORY_SEPARATOR, $segments));
        if ($base === false || $path === false || !str_starts_with($path, $base . DIRECTORY_SEPARATOR) || !is_file($path)) Response::error('Image not found.', 404);
        $info = @getimagesize($path);
        if (!is_array($info)) Response::error('Image not found.', 404);
        header('Content-Type: ' . ($info['mime'] ?? 'application/octet-stream'));
        header('X-Content-Type-Options: nosniff');
        header('Cache-Control: public, max-age=86400');
        header('Content-Length: ' . filesize($path));
        readfile($path);
        exit;
    }

    private function safeSegment(string $value): bool { return preg_match('/^[a-zA-Z0-9_-]{1,120}$/', $value) === 1; }
    private function safeFile(string $value): bool { return preg_match('/^[a-zA-Z0-9_-]+\.(jpg|png|webp|gif)$/', $value) === 1; }
}
