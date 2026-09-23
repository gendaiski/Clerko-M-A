<?php

namespace App\Services\Extraction;

use Illuminate\Support\Str;

/**
 * Local stand-in that returns a plausible Sijilat CR profile, labelled the
 * way the Sijilat page labels it, so the normaliser and field map are
 * exercised exactly as with a real provider.
 */
class FakeExtractor implements ProfileExtractor
{
    public function name(): string
    {
        return 'fake';
    }

    public function submit(string $pdf, string $filename): string
    {
        return 'fake-'.Str::ulid();
    }

    public function fetch(string $reference): ExtractionResult
    {
        $fields = [
            ['field_name' => 'CR No.', 'field_value' => '114231-1'],
            ['field_name' => 'Commercial Name (EN)', 'field_value' => 'Meridian Cloud W.L.L.'],
            ['field_name' => 'Commercial Name (AR)', 'field_value' => 'ميريديان كلاود ذ.م.م'],
            ['field_name' => 'CR Type', 'field_value' => 'With Limited Liability Company'],
            ['field_name' => 'Status', 'field_value' => 'ACTIVE'],
            ['field_name' => 'Registration Date', 'field_value' => '14/03/2018'],
            ['field_name' => 'Expiration Date', 'field_value' => '14/03/2027'],
            ['field_name' => 'Issued Capital', 'field_value' => '50,000.000'],
            ['field_name' => 'Flat / Shop No.', 'field_value' => '21'],
            ['field_name' => 'Building', 'field_value' => '1565'],
            ['field_name' => 'Road/Street Number', 'field_value' => '1722'],
            ['field_name' => 'Block', 'field_value' => '317'],
            ['field_name' => 'Town', 'field_value' => 'Manama'],
            ['field_name' => 'Business Activities', 'field_value' => [
                ['ISIC4 Code' => '6201', 'Activities' => 'Computer programming activities'],
                ['ISIC4 Code' => '6311', 'Activities' => 'Data processing, hosting and related activities'],
            ]],
            ['field_name' => 'Partners and Shareholders', 'field_value' => [
                ['English Name' => 'Michael Rodriguez', 'Nationality' => 'Bahraini', 'No. of Shares' => '300', 'Ownership (%)' => '60'],
                ['English Name' => 'Sara Al Khalifa', 'Nationality' => 'Bahraini', 'No. of Shares' => '200', 'Ownership (%)' => '40'],
            ]],
            ['field_name' => 'Authorized Signatories', 'field_value' => [
                ['English Name' => 'Michael Rodriguez', 'Nationality' => 'Bahraini', 'Authority Level' => 'Individually'],
            ]],
        ];

        return new ExtractionResult(ExtractionResult::COMPLETED, ['fields' => $fields], raw: ['fields' => $fields]);
    }
}
