#!/usr/bin/env php
<?php
declare(strict_types=1);

use Funbike\Migration\MigrationRunner;
use Funbike\Storage\JsonStore;

$serverRoot = dirname(__DIR__);
spl_autoload_register(static function (string $class) use ($serverRoot): void {
    $prefix = 'Funbike\\';
    if (!str_starts_with($class, $prefix)) return;
    $relative = str_replace('\\', DIRECTORY_SEPARATOR, substr($class, strlen($prefix)));
    $file = $serverRoot . '/src/' . $relative . '.php';
    if (is_file($file)) require $file;
});

$options = getopt('', ['apply', 'dry-run', 'retry-images', 'manifest:']);
$apply = array_key_exists('apply', $options);
$retryImages = array_key_exists('retry-images', $options);
$manifest = isset($options['manifest']) ? (string)$options['manifest'] : $serverRoot . '/storage/.migration-source.json';
try {
    $runner = new MigrationRunner($serverRoot, new JsonStore($serverRoot . '/storage'));
    $report = $runner->run($manifest, $apply, $retryImages);
    echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n";
    if ($apply && ($report['errors'] ?? []) !== []) exit(2);
} catch (Throwable $error) {
    fwrite(STDERR, 'Migration preparation failed: ' . $error->getMessage() . "\n");
    exit(1);
}
