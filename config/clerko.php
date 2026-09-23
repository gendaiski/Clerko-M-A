<?php

return [

    /*
    | Prices are in Bahraini Dinar (BHD, 3 decimal places).
    */
    'currency' => 'BHD',

    // Times are stored in UTC and shown to people in Bahrain time.
    'display_timezone' => 'Asia/Bahrain',

    'seller_tiers' => [
        'standard' => [
            'name' => 'Standard',
            'monthly_price' => 299,
            'features' => ['Anonymised teaser listing', 'Standard visibility', 'Interest pipeline dashboard'],
        ],
        'premium' => [
            'name' => 'Premium',
            'monthly_price' => 699,
            'features' => ['Everything in Standard', 'Priority placement + valuation support', 'Documentation assistance'],
        ],
        'enterprise' => [
            'name' => 'Enterprise',
            'monthly_price' => 1299,
            'features' => ['Everything in Premium', 'Dedicated deal advisor', 'Full valuation & documentation service'],
        ],
    ],

    'buyer' => [
        'pack_unlock_price' => 250,
        'premium_monthly_price' => 699,
        'premium_monthly_unlocks' => 10,
    ],

    'nda' => [
        'version' => '2026-09',
    ],

    'documents' => [
        'disk' => env('CLERKO_DOCUMENTS_DISK', 'local'),
        'max_upload_kb' => 20480,
        // Optional path to a Ghostscript binary, used to normalise PDFs that the
        // bundled parser cannot read before they are watermarked.
        'ghostscript_path' => env('CLERKO_GHOSTSCRIPT_PATH'),
    ],

    'payments' => [
        // "tap" for Tap Payments, "fake" for local development and tests.
        'driver' => env('CLERKO_PAYMENT_DRIVER', 'fake'),
        'tap' => [
            'secret_key' => env('TAP_SECRET_KEY'),
            'base_url' => env('TAP_BASE_URL', 'https://api.tap.company/v2'),
        ],
    ],

    'extraction' => [
        // "extracta" for Extracta.ai, "fake" for local development and tests.
        'driver' => env('CLERKO_EXTRACTION_DRIVER', 'fake'),
        'extracta' => [
            'api_key' => env('EXTRACTA_API_KEY'),
            'base_url' => env('EXTRACTA_BASE_URL', 'https://api.extracta.ai/api/v1'),
            'extraction_id' => env('EXTRACTA_CR_EXTRACTION_ID'),
        ],

        /*
        | Maps each company profile attribute to the field name used in the
        | Extracta template for the Sijilat CR profile. Adjust these to match
        | the template's field names exactly. The full raw result is always
        | stored and shown to admins, so an unmapped field is never lost.
        */
        'field_map' => [
            'cr_number' => 'cr_no',
            'name_en' => 'commercial_name_en',
            'name_ar' => 'commercial_name_ar',
            'legal_form' => 'cr_type',
            'cr_status' => 'status',
            'registration_date' => 'registration_date',
            'expiry_date' => 'expiration_date',
            'capital' => 'issued_capital',
            'address' => 'commercial_address',
            'activities' => 'business_activities',
            'shareholders' => 'partners_and_shareholders',
            'signatories' => 'authorized_signatories',
        ],
    ],

    'agent' => [
        // Set to false to switch the Clerko Agent off platform-wide.
        'enabled' => env('CLERKO_AGENT_ENABLED', true),
        'model' => env('CLERKO_AGENT_MODEL', 'claude-opus-5'),
        'api_key' => env('ANTHROPIC_API_KEY'),
    ],

];
