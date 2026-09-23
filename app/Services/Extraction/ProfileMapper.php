<?php

namespace App\Services\Extraction;

use Carbon\CarbonImmutable;
use Throwable;

/**
 * Turns an extraction result into company profile attributes: normalise the
 * result's shape and labels, then look each attribute up by the candidate keys
 * in config('clerko.extraction.field_map').
 */
class ProfileMapper
{
    private const DATE_FIELDS = ['registration_date', 'expiry_date'];

    private const LIST_FIELDS = ['activities', 'shareholders', 'signatories'];

    public function __construct(private readonly FieldNormaliser $normaliser) {}

    /**
     * @param  array<mixed>|string  $fields
     * @return array<string, mixed>
     */
    public function map(array|string $fields): array
    {
        $normalised = $this->normaliser->normalise($fields);
        $attributes = [];

        foreach (config('clerko.extraction.field_map') as $attribute => $candidates) {
            $value = $this->lookup($normalised, (array) $candidates);
            if ($value === null) {
                continue;
            }

            $converted = match (true) {
                in_array($attribute, self::DATE_FIELDS, true) => $this->date($value),
                in_array($attribute, self::LIST_FIELDS, true) => $this->list($value),
                $attribute === 'capital' => $this->number($value),
                default => is_scalar($value) ? trim((string) $value) : json_encode($value, JSON_UNESCAPED_UNICODE),
            };

            if ($converted !== null && $converted !== '' && $converted !== []) {
                $attributes[$attribute] = $converted;
            }
        }

        // Sijilat splits the address into parts; join them when there is no single field.
        if (! isset($attributes['address'])) {
            $parts = [];
            foreach (config('clerko.extraction.address_parts') as $label => $candidates) {
                $part = $this->lookup($normalised, (array) $candidates);
                if (is_scalar($part) && trim((string) $part) !== '') {
                    $parts[] = trim($label.' '.trim((string) $part));
                }
            }
            if ($parts !== []) {
                $attributes['address'] = implode(', ', $parts);
            }
        }

        return $attributes;
    }

    /**
     * Normalised keys that no field-map entry uses — shown to admins and by
     * the test command, to help complete the field map.
     *
     * @param  array<mixed>|string  $fields
     * @return array<int, string>
     */
    public function unmappedKeys(array|string $fields): array
    {
        $used = collect(config('clerko.extraction.field_map'))
            ->merge(config('clerko.extraction.address_parts'))
            ->flatten()
            ->map(fn ($k) => FieldNormaliser::key($k))
            ->all();

        return array_values(array_diff(array_keys($this->normaliser->normalise($fields)), $used));
    }

    /**
     * @param  array<string, mixed>  $normalised
     * @param  array<int, string>  $candidates
     */
    private function lookup(array $normalised, array $candidates): mixed
    {
        foreach ($candidates as $candidate) {
            $value = $normalised[FieldNormaliser::key($candidate)] ?? null;
            if ($value !== null && $value !== '' && $value !== []) {
                return $value;
            }
        }

        return null;
    }

    /**
     * Sijilat prints dates day-first (14/03/2018), so try day-first formats
     * before falling back to a general parse.
     */
    private function date(mixed $value): ?string
    {
        $value = trim((string) (is_scalar($value) ? $value : ''));
        if ($value === '') {
            return null;
        }

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
        $clean = preg_replace('/[^0-9.]/', '', (string) (is_scalar($value) ? $value : ''));

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
