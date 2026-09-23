<?php

namespace App\Services\Extraction;

/** Small helpers for digging values out of decoded provider responses. */
final class Payload
{
    /**
     * First value found under $key anywhere in the structure (depth-first).
     *
     * @param  array<mixed>  $data
     */
    public static function find(array $data, string $key): mixed
    {
        if (array_key_exists($key, $data)) {
            return $data[$key];
        }
        foreach ($data as $value) {
            if (is_array($value) && ($found = self::find($value, $key)) !== null) {
                return $found;
            }
        }

        return null;
    }

    /** Truncated copy of a response for the run log. */
    public static function excerpt(mixed $raw, int $limit = 20000): ?string
    {
        if ($raw === null) {
            return null;
        }
        $text = is_string($raw) ? $raw : json_encode($raw, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        return mb_strlen((string) $text) > $limit ? mb_substr((string) $text, 0, $limit).'…' : $text;
    }
}
