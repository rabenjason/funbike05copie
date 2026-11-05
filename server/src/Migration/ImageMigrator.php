<?php
declare(strict_types=1);

namespace Funbike\Migration;

final class ImageMigrator
{
    private const MIME_EXTENSIONS = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'];
    private array $failures = [];
    private array $downloads = [];
    private int $cacheHits = 0;
    private int $copies = 0;

    public function __construct(private readonly string $uploads, private readonly string $cache)
    {
        foreach ([$this->uploads, $this->cache] as $directory) {
            if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) {
                throw new \RuntimeException("Cannot create image directory: {$directory}");
            }
        }
    }

    /** Rewrites known image URL fields in-place, preserving array order and all other fields. */
    public function rewrite(mixed &$node, string $resource, string $id, string $path = 'record'): void
    {
        if (!is_array($node)) return;
        foreach ($node as $key => &$value) {
            if (is_string($value) && $this->isImageField((string)$key) && filter_var($value, FILTER_VALIDATE_URL)) {
                $main = in_array((string)$key, ['logoUrl', 'logo', 'imageUrl', 'bannerUrl', 'bannerImageUrl', 'heroImage', 'coverImage', 'thumbnailUrl', 'featuredImageUrl'], true);
                if ((string)$key === 'url' && (($node['isMain'] ?? false) === true)) $main = true;
                $relative = $this->localize($value, $resource, $id, $path . '.' . (string)$key, $main);
                if ($relative !== null) $value = $relative;
                continue;
            }
            if (is_array($value)) {
                $childId = $id;
                if ($resource === 'homepage' && array_is_list($value)) $childId = $id;
                $this->rewrite($value, $resource, $childId, $path . '.' . (string)$key);
            }
        }
        unset($value);
    }

    public function summary(): array
    {
        return ['downloads' => $this->downloads, 'cacheHits' => $this->cacheHits, 'entityCopies' => $this->copies, 'failures' => $this->failures];
    }

    private function isImageField(string $key): bool
    {
        return in_array($key, ['url', 'src', 'logoUrl', 'imageUrl', 'bannerUrl', 'bannerImageUrl', 'heroImage', 'coverImage', 'thumbnailUrl', 'featuredImageUrl'], true);
    }

    private function localize(string $url, string $resource, string $id, string $field, bool $main): ?string
    {
        $source = $this->getVerifiedSource($url, $resource, $id, $field);
        if ($source === null) return null;
        [$cachedPath, $extension, $sourceHash] = $source;
        $entityDirectory = $this->entityDirectory($resource, $id, $field);
        if (!is_dir($entityDirectory) && !mkdir($entityDirectory, 0775, true) && !is_dir($entityDirectory)) {
            $this->failures[] = ['resource' => $resource, 'id' => $id, 'field' => $field, 'url' => $url, 'reason' => 'Unable to create entity image directory.'];
            return null;
        }
        $basename = $this->imageFilename($field, $main, $extension);
        $destination = $entityDirectory . DIRECTORY_SEPARATOR . $basename;
        if (is_file($destination) && $this->validImage($destination) && hash_file('sha256', $destination) === $sourceHash) {
            return $this->publicPath($resource, $id, $field, $basename);
        }
        $temporary = tempnam($entityDirectory, '.image-');
        if ($temporary === false || !copy($cachedPath, $temporary) || !$this->validImage($temporary) || hash_file('sha256', $temporary) !== $sourceHash) {
            if (isset($temporary) && is_file($temporary)) unlink($temporary);
            $this->failures[] = ['resource' => $resource, 'id' => $id, 'field' => $field, 'url' => $url, 'reason' => 'Verified source could not be copied; existing image was retained.'];
            return null;
        }
        if (!rename($temporary, $destination)) {
            unlink($temporary);
            $this->failures[] = ['resource' => $resource, 'id' => $id, 'field' => $field, 'url' => $url, 'reason' => 'Could not finalize local image; existing image was retained.'];
            return null;
        }
        $this->copies++;
        return $this->publicPath($resource, $id, $field, $basename);
    }

    private function getVerifiedSource(string $url, string $resource, string $id, string $field): ?array
    {
        $key = hash('sha256', $url);
        foreach (glob($this->cache . DIRECTORY_SEPARATOR . $key . '.*') ?: [] as $cached) {
            if ($this->validImage($cached)) {
                $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($cached) ?: '';
                if (isset(self::MIME_EXTENSIONS[$mime])) {
                    $this->cacheHits++;
                    return [$cached, self::MIME_EXTENSIONS[$mime], hash_file('sha256', $cached)];
                }
            }
        }
        if (!in_array(strtolower((string)parse_url($url, PHP_URL_SCHEME)), ['http', 'https'], true) || !filter_var($url, FILTER_VALIDATE_URL)) {
            $this->recordFailure($resource, $id, $field, $url, 'Invalid or unsupported URL.');
            return null;
        }
        $context = stream_context_create(['http' => [
            'method' => 'GET', 'timeout' => 25, 'follow_location' => 1, 'max_redirects' => 4,
            'ignore_errors' => true, 'header' => "User-Agent: FunbikeDataMigration/1.0\r\nAccept: image/*\r\n",
        ], 'https' => ['verify_peer' => true, 'verify_peer_name' => true]]);
        $stream = @fopen($url, 'rb', false, $context);
        if ($stream === false) {
            $this->recordFailure($resource, $id, $field, $url, 'Download request failed.');
            return null;
        }
        $temporary = tempnam($this->cache, '.download-');
        if ($temporary === false) {
            fclose($stream);
            $this->recordFailure($resource, $id, $field, $url, 'Could not allocate temporary cache file.');
            return null;
        }
        $output = fopen($temporary, 'wb');
        $bytes = 0;
        $ok = $output !== false;
        while ($ok && !feof($stream)) {
            $chunk = fread($stream, 65536);
            if ($chunk === false) { $ok = false; break; }
            $bytes += strlen($chunk);
            if ($bytes > 20 * 1024 * 1024) { $ok = false; break; }
            if ($chunk !== '' && fwrite($output, $chunk) !== strlen($chunk)) { $ok = false; break; }
        }
        fclose($stream);
        if (is_resource($output)) fclose($output);
        $headers = $http_response_header ?? [];
        $status = 0;
        foreach ($headers as $header) if (preg_match('#^HTTP/\S+\s+(\d{3})#', $header, $m)) $status = (int)$m[1];
        if (!$ok || $bytes < 1 || $status < 200 || $status >= 300 || !$this->validImage($temporary)) {
            unlink($temporary);
            $reason = $bytes > 20 * 1024 * 1024 ? 'Image exceeds the 20 MB download limit.' : ($status < 200 || $status >= 300 ? "HTTP status {$status}." : 'Downloaded bytes are empty or not a valid supported image.');
            $this->recordFailure($resource, $id, $field, $url, $reason);
            return null;
        }
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($temporary) ?: '';
        if (!isset(self::MIME_EXTENSIONS[$mime])) {
            unlink($temporary);
            $this->recordFailure($resource, $id, $field, $url, "Unsupported image MIME type: {$mime}.");
            return null;
        }
        $extension = self::MIME_EXTENSIONS[$mime];
        $destination = $this->cache . DIRECTORY_SEPARATOR . $key . '.' . $extension;
        if (!rename($temporary, $destination)) {
            unlink($temporary);
            $this->recordFailure($resource, $id, $field, $url, 'Unable to store verified source image.');
            return null;
        }
        $this->downloads[] = ['url' => $url, 'cachedAs' => basename($destination), 'bytes' => $bytes, 'mime' => $mime];
        return [$destination, $extension, hash_file('sha256', $destination)];
    }

    private function validImage(string $path): bool
    {
        if (!is_file($path) || filesize($path) < 1) return false;
        $info = @getimagesize($path);
        return is_array($info) && isset(self::MIME_EXTENSIONS[$info['mime'] ?? '']);
    }

    private function entityDirectory(string $resource, string $id, string $field): string
    {
        if ($resource === 'site') return $this->uploads . '/homepage/site';
        if ($resource === 'homepage' && preg_match('/homepageCategories\.(\d+)/', $field, $m)) {
            return $this->uploads . '/homepage/category-' . str_pad((string)((int)$m[1] + 1), 2, '0', STR_PAD_LEFT);
        }
        if ($resource === 'homepage' && str_contains($field, '.sherco.')) return $this->uploads . '/homepage/sherco';
        return $this->uploads . '/' . $resource . '/' . $id;
    }

    private function imageFilename(string $field, bool $main, string $extension): string
    {
        if (str_ends_with($field, '.logoUrl') || str_ends_with($field, '.logo')) return 'logo.' . $extension;
        if ($main || str_ends_with($field, '.src')) return 'main.' . $extension;
        preg_match_all('/(?:\.(\d+)|image-(\d+))/', $field, $matches);
        $index = count($matches[1]) ? (int)end($matches[1]) : (count($matches[2]) ? (int)end($matches[2]) : 0);
        return 'image-' . str_pad((string)max(1, $index), 2, '0', STR_PAD_LEFT) . '.' . $extension;
    }

    private function publicPath(string $resource, string $id, string $field, string $file): string
    {
        if ($resource === 'site') return '/uploads/homepage/site/' . rawurlencode($file);
        if ($resource === 'homepage' && preg_match('/homepageCategories\.(\d+)/', $field, $m)) {
            return '/uploads/homepage/category-' . str_pad((string)((int)$m[1] + 1), 2, '0', STR_PAD_LEFT) . '/' . $file;
        }
        if ($resource === 'homepage' && str_contains($field, '.sherco.')) return '/uploads/homepage/sherco/' . rawurlencode($file);
        return '/uploads/' . rawurlencode($resource) . '/' . rawurlencode($id) . '/' . rawurlencode($file);
    }

    private function recordFailure(string $resource, string $id, string $field, string $url, string $reason): void
    {
        $this->failures[] = compact('resource', 'id', 'field', 'url', 'reason');
    }
}
