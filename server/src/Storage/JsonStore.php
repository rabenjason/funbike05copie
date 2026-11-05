<?php
declare(strict_types=1);

namespace Funbike\Storage;

use RuntimeException;

final class JsonStore
{
    public function __construct(private readonly string $directory)
    {
        if (!is_dir($this->directory) && !mkdir($this->directory, 0775, true) && !is_dir($this->directory)) {
            throw new RuntimeException('Unable to create JSON storage directory.');
        }
    }

    public function read(string $resource): mixed
    {
        $definition = ResourceRegistry::get($resource);
        $path = $this->path($definition['file']);
        $lock = fopen($path . '.lock', 'c');
        if ($lock === false) {
            throw new RuntimeException('Unable to open storage lock.');
        }
        try {
            flock($lock, LOCK_SH);
            $contents = is_file($path) ? file_get_contents($path) : ($definition['mode'] === 'singleton' ? 'null' : '[]');
            if ($contents === false) {
                throw new RuntimeException('Unable to read storage file.');
            }
            $value = json_decode($contents, true, 512, JSON_THROW_ON_ERROR);
            if ($definition['mode'] === 'collection' && !is_array($value)) {
                throw new RuntimeException("Storage file {$definition['file']} must contain a JSON array.");
            }
            return $value;
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    public function write(string $resource, mixed $value): void
    {
        $definition = ResourceRegistry::get($resource);
        if ($definition['mode'] === 'collection' && !is_array($value)) {
            throw new RuntimeException('Collection storage must be an array.');
        }
        $path = $this->path($definition['file']);
        $lock = fopen($path . '.lock', 'c');
        if ($lock === false) {
            throw new RuntimeException('Unable to open storage lock.');
        }
        try {
            flock($lock, LOCK_EX);
            $json = json_encode($value, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n";
            $temporary = tempnam($this->directory, '.write-');
            if ($temporary === false || file_put_contents($temporary, $json, LOCK_EX) === false || !rename($temporary, $path)) {
                if (isset($temporary) && is_file($temporary)) {
                    unlink($temporary);
                }
                throw new RuntimeException('Unable to atomically write storage file.');
            }
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    private function path(string $file): string
    {
        return $this->directory . DIRECTORY_SEPARATOR . $file;
    }
}
