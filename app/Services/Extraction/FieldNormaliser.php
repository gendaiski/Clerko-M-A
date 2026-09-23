<?php

namespace App\Services\Extraction;

use Illuminate\Support\Str;
use SimpleXMLElement;
use Throwable;

/**
 * Turns an extraction result of any shape into a flat map of stable keys.
 *
 * Providers return results differently: nested JSON objects, lists of
 * {field_name, field_value} pairs, or XML. Labels are also written like the
 * Sijilat page ("CR No.", "Commercial Name (EN)"). The normaliser handles all
 * of these and converts every label to snake_case ("cr_no",
 * "commercial_name_en"), so the field map in config/clerko.php works
 * whatever the provider's template calls each field.
 */
class FieldNormaliser
{
    /** Keys that hold a field's name / value in list-of-fields formats. */
    private const NAME_KEYS = ['field_name', 'name', 'key', 'label', 'field', 'title'];

    private const VALUE_KEYS = ['field_value', 'value', 'text', 'content', 'values', 'rows'];

    /** Wrapper keys whose contents belong at the top level. */
    private const CONTAINERS = ['fields', 'field', 'field_data', 'data', 'result', 'results', 'document_fields'];

    /**
     * @param  array<mixed>|string  $result  Decoded array, or a raw JSON / XML string.
     * @return array<string, mixed>
     */
    public function normalise(array|string $result): array
    {
        return $this->normaliseArray(is_string($result) ? self::decode($result) : $result);
    }

    /** "Commercial Name (EN)" → "commercial_name_en", "CR No." → "cr_no". */
    public static function key(string $label): string
    {
        return Str::of($label)
            ->ascii()
            ->lower()
            ->replaceMatches('/[^a-z0-9]+/', '_')
            ->trim('_')
            ->toString();
    }

    /**
     * Decode a JSON or XML payload into arrays.
     *
     * @return array<mixed>
     */
    public static function decode(string $payload): array
    {
        $payload = trim($payload);

        $json = json_decode($payload, true);
        if (is_array($json)) {
            return $json;
        }

        if (str_starts_with($payload, '<')) {
            try {
                $xml = self::xmlToArray(new SimpleXMLElement($payload, LIBXML_NONET | LIBXML_NOCDATA));

                return is_array($xml) ? $xml : [];
            } catch (Throwable) {
                return [];
            }
        }

        return [];
    }

    /**
     * Convert XML to arrays; repeated sibling elements become lists.
     *
     * @return array<mixed>|string
     */
    public static function xmlToArray(SimpleXMLElement $element): array|string
    {
        $children = $element->children();
        if ($children->count() === 0) {
            return trim((string) $element);
        }

        $counts = [];
        foreach ($children as $name => $child) {
            $counts[$name] = ($counts[$name] ?? 0) + 1;
        }

        $out = [];
        foreach ($children as $name => $child) {
            $value = self::xmlToArray($child);
            if ($counts[$name] > 1) {
                $out[$name][] = $value;
            } else {
                $out[$name] = $value;
            }
        }

        return $out;
    }

    /**
     * @param  array<mixed>  $data
     * @return array<string, mixed>
     */
    private function normaliseArray(array $data): array
    {
        if (array_is_list($data) && $this->isFieldList($data)) {
            return $this->fieldsToMap($data);
        }

        $flat = [];
        foreach ($data as $key => $value) {
            $normalisedKey = is_string($key) ? self::key($key) : (string) $key;
            $isContainer = in_array($normalisedKey, self::CONTAINERS, true);

            if (is_array($value)) {
                // One or more {field_name, field_value} entries → merge in by name.
                $entries = array_is_list($value) ? $value : [$value];
                if (($isContainer || array_is_list($value)) && $this->isFieldList($entries)) {
                    $flat = array_merge($flat, $this->fieldsToMap($entries));

                    continue;
                }
                if ($isContainer && ! array_is_list($value)) {
                    $flat = array_merge($flat, $this->normaliseArray($value));

                    continue;
                }
            }

            $flat[$normalisedKey] = $this->normaliseValue($value);
        }

        return $flat;
    }

    private function normaliseValue(mixed $value): mixed
    {
        if (is_string($value)) {
            return trim($value);
        }
        if (! is_array($value)) {
            return $value;
        }
        if (array_is_list($value)) {
            // A table (shareholders, activities…): normalise each row.
            return array_map(fn ($row) => is_array($row) ? $this->normaliseArray($row) : $this->normaliseValue($row), $value);
        }

        return $this->normaliseArray($value);
    }

    /**
     * @param  array<int, array<string, mixed>>  $entries
     * @return array<string, mixed>
     */
    private function fieldsToMap(array $entries): array
    {
        $map = [];
        foreach ($entries as $entry) {
            $map[self::key((string) $this->first($entry, self::NAME_KEYS))] = $this->normaliseValue($this->first($entry, self::VALUE_KEYS));
        }

        return $map;
    }

    /**
     * @param  array<mixed>  $entries
     */
    private function isFieldList(array $entries): bool
    {
        if ($entries === []) {
            return false;
        }

        foreach ($entries as $entry) {
            if (! is_array($entry) || array_is_list($entry) || ! is_scalar($this->first($entry, self::NAME_KEYS)) || ! $this->hasAny($entry, self::VALUE_KEYS)) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param  array<mixed>  $entry
     * @param  array<int, string>  $keys
     */
    private function first(array $entry, array $keys): mixed
    {
        foreach ($keys as $key) {
            if (array_key_exists($key, $entry) && $entry[$key] !== null) {
                return $entry[$key];
            }
        }

        return null;
    }

    /**
     * @param  array<mixed>  $entry
     * @param  array<int, string>  $keys
     */
    private function hasAny(array $entry, array $keys): bool
    {
        return array_intersect($keys, array_keys($entry)) !== [];
    }
}
