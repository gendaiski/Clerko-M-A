<?php

namespace App\Services\Extraction;

use App\Models\Company;

/**
 * Local stand-in for Extracta that returns a plausible Sijilat CR profile.
 */
class FakeExtractor implements ProfileExtractor
{
    public function submit(Company $company): string
    {
        return 'fake-batch-'.$company->id;
    }

    public function fetch(Company $company): ExtractionResult
    {
        return new ExtractionResult(ExtractionResult::COMPLETED, [
            'cr_no' => '114231-1',
            'commercial_name_en' => 'Meridian Cloud W.L.L.',
            'commercial_name_ar' => 'ميريديان كلاود ذ.م.م',
            'cr_type' => 'With Limited Liability Company',
            'status' => 'ACTIVE',
            'registration_date' => '2018-03-14',
            'expiration_date' => '2027-03-14',
            'issued_capital' => '50000',
            'commercial_address' => 'Flat 21, Building 1565, Road 1722, Block 317, Manama',
            'business_activities' => [
                ['isic4_code' => '6201', 'activity' => 'Computer programming activities'],
                ['isic4_code' => '6311', 'activity' => 'Data processing, hosting and related activities'],
            ],
            'partners_and_shareholders' => [
                ['name' => 'Michael Rodriguez', 'nationality' => 'Bahraini', 'shares' => 300, 'ownership_pct' => 60],
                ['name' => 'Sara Al Khalifa', 'nationality' => 'Bahraini', 'shares' => 200, 'ownership_pct' => 40],
            ],
            'authorized_signatories' => [
                ['name' => 'Michael Rodriguez', 'nationality' => 'Bahraini', 'authority_level' => 'Individually'],
            ],
        ]);
    }
}
