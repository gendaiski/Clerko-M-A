<?php

namespace App\Services\Compliance;

/**
 * Detects attempts to move a conversation off the platform (email addresses,
 * phone numbers, links, messaging apps) in deal room messages.
 */
class ContactPolicy
{
    private const PATTERNS = [
        'email' => '/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i',
        'url' => '/\b(?:https?:\/\/|www\.)\S+/i',
        'phone' => '/(?<![\d])(?:\+|00)?\d[\d\s().-]{6,}\d(?!\d)/',
        'messaging_app' => '/\b(?:whats\s?app|telegram|signal|wechat|viber|skype|call me|text me|dm me)\b/i',
    ];

    public const REDACTION = '[contact details removed]';

    /**
     * @return array{clean: string, matches: array<int, string>}
     */
    public function scan(string $text): array
    {
        $matches = [];
        $clean = $text;

        foreach (self::PATTERNS as $type => $pattern) {
            if ($type === 'phone') {
                // Ignore plain amounts and years; a phone number has 8+ digits.
                $clean = preg_replace_callback($pattern, function ($m) use (&$matches) {
                    $candidate = trim($m[0]);
                    $isDateOrYears = preg_match('/^\d{4}\s*[-\/.]\s*\d{1,4}(\s*[-\/.]\s*\d{1,4})?$/', $candidate);
                    if (strlen(preg_replace('/\D/', '', $candidate)) < 8 || $isDateOrYears) {
                        return $m[0];
                    }
                    $matches[] = trim($m[0]);

                    return self::REDACTION;
                }, $clean);

                continue;
            }

            $clean = preg_replace_callback($pattern, function ($m) use (&$matches, $type) {
                $matches[] = $m[0];

                return $type === 'messaging_app' ? $m[0] : self::REDACTION;
            }, $clean);
        }

        return ['clean' => $clean, 'matches' => array_values(array_unique($matches))];
    }
}
