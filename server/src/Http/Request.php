<?php
declare(strict_types=1);

namespace Funbike\Http;

final class Request
{
    public static function jsonBody(): array
    {
        $raw = file_get_contents('php://input');
        if ($raw === false || trim($raw) === '') {
            return [];
        }
        try {
            $value = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            Response::error('Request body must be valid JSON.', 400);
        }
        if (!is_array($value) || !str_starts_with(ltrim($raw), '{')) {
            Response::error('Request body must be a JSON object.', 400);
        }
        return $value;
    }

    public static function isAdmin(): bool
    {
        $expected = getenv('FUNBIKE_ADMIN_TOKEN');
        $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        return is_string($expected) && $expected !== ''
            && preg_match('/^Bearer\s+(.+)$/i', $authorization, $matches) === 1
            && hash_equals($expected, trim($matches[1]));
    }
}
