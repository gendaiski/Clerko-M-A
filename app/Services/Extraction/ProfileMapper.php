<?php

namespace App\Services\Extraction;

use Carbon\CarbonImmutable;
use Throwable;

/**
 * Turns the raw extracted fields into company profile attributes using the
 * configured field map.
 */
class ProfileMapper
{
    private const DATE_FIELDS = ['registration_date', 'expiry_date'];

    private const LIST_FIELDS = ['activities', 'shareholders', 'signatories'];

    /**
     * @param  array<string, mixed>  $fields
     * @return array<string, mixed>
     */
    public function map(array $fields): array
    {
        $attributes = [];

        foreach (config('clerko.extraction.field_map') as $attribute => $sourceKey) {
            $value = data_get($fields, $sourceKey);
            if ($value === null || $value === '' || $value === []) {
                continue;
            }

            $attributes[$attribute] = match (true) {
                in_array($attribute, self::DATE_FIELDS, true) => $this->date($value),
                in_array($attribute, self::LIST_FIELDS, true) => $this->list($value),
                $attribute === 'capital' => $this->number($value),
                default => is_scalar($value) ? trim((string) $value) : json_encode($value),
            };
        }

        return array_filter($attributes, fn ($value) => $value !== null);
    }

    /**
     * Sijilat prints dates day-first (14/03/2018), so try day-first formats
     * before falling back to a general parse.
     */
    private function date(mixed $value): ?string
    {
        $value = trim((string) $value);

        foreach (['!d/m/Y', '!d-m-Y', '!d.m.Y', '!Y-m-d'] as $format) {
            try {
                $date = CarbonImmutable::createFromFormat($format, $value);
            } catch (Throwable) {
                continue;
            }
            if ($date && $date->format(ltrim($format, '!')) === $value) {
                return $date->toDateString();
            }
        }

        try {
            return CarbonImmutable::parse($value)->toDateString();
        } catch (Throwable) {
            return null;
        }
    }

    private function number(mixed $value): ?string
    {
        $clean = preg_replace('/[^0-9.]/', '', (string) $value);

        return is_numeric($clean) ? $clean : null;
    }

    /**
     * @return array<int, mixed>
     */
    private function list(mixed $value): array
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            $value = is_array($decoded) ? $decoded : array_filter(array_map('trim', preg_split('/\r?\n|;/', $value)));
        }

        return array_values((array) $value);
    }
}
