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
        /*
        | Which service reads the Sijilat CR profile PDF:
        |   "xtracta"  – Xtracta (xtracta.com)
        |   "extracta" – Extracta.ai
        |   "manual"   – no API; admins enter the profile from the PDF
        |   "fake"     – sample data, for local development and tests
        */
        'driver' => env('CLERKO_EXTRACTION_DRIVER', 'fake'),

        // Shared secret for POST /webhooks/extraction/{token} (providers that push results).
        'webhook_token' => env('CLERKO_EXTRACTION_WEBHOOK_TOKEN'),

        // Poll every N seconds, giving up (→ failed, admin can retry or enter manually) after M attempts.
        'poll_interval' => (int) env('CLERKO_EXTRACTION_POLL_SECONDS', 15),
        'max_polls' => (int) env('CLERKO_EXTRACTION_MAX_POLLS', 40),

        /*
        | Xtracta. Everything that depends on their API is here, so it can be
        | aligned with Xtracta's documentation without code changes.
        | Check with: php artisan clerko:extraction:test cr.pdf --driver=xtracta
        */
        'xtracta' => [
            'api_key' => env('XTRACTA_API_KEY'),
            'workflow_id' => env('XTRACTA_WORKFLOW_ID'),
            'base_url' => env('XTRACTA_BASE_URL', 'https://api-app.xtracta.com/v1'),
            'upload_path' => env('XTRACTA_UPLOAD_PATH', '/documents/upload'),
            'status_path' => env('XTRACTA_STATUS_PATH', '/documents'),
            'file_field' => 'userfile',
            'reference_key' => 'document_id',
            'status_key' => 'document_status',
            'fields_key' => 'field_data',
            'completed_statuses' => ['output', 'completed', 'complete'],
            'failed_statuses' => ['reject', 'rejected', 'error', 'failed'],
        ],

        'extracta' => [
            'api_key' => env('EXTRACTA_API_KEY'),
            'extraction_id' => env('EXTRACTA_CR_EXTRACTION_ID'),
            'base_url' => env('EXTRACTA_BASE_URL', 'https://api.extracta.ai/api/v1'),
            'upload_path' => '/uploadFiles',
            'results_path' => '/getBatchResults',
        ],

        /*
        | Company profile attribute => candidate field names in the extraction
        | result, tried in order. Names are compared after normalising, so
        | "CR No.", "cr_no" and "CR NO" all match. Defaults follow the labels
        | on the Sijilat CR page. The full raw result is always kept and shown
        | to admins, so an unmapped field is never lost.
        */
        'field_map' => [
            'cr_number' => ['CR No.', 'CR Number', 'Commercial Registration No.', 'Registration Number'],
            'name_en' => ['Commercial Name (EN)', 'Commercial Name', 'Company Name (EN)', 'Company Name'],
            'name_ar' => ['Commercial Name (AR)', 'Company Name (AR)', 'Arabic Name'],
            'legal_form' => ['CR Type', 'Company Type', 'Legal Form'],
            'cr_status' => ['Status', 'CR Status'],
            'registration_date' => ['Registration Date', 'Reg. Date'],
            'expiry_date' => ['Expiration Date', 'Expiry Date', 'Exp. Date'],
            'capital' => ['Issued Capital', 'Paid-up Capital', 'Authorized Capital', 'Capital'],
            'address' => ['Commercial Address', 'Address'],
            'activities' => ['Business Activities', 'Activities'],
            'shareholders' => ['Partners and Shareholders', 'Shareholders', 'Partners'],
            'signatories' => ['Authorized Signatories', 'Authorised Signatories', 'Signatories'],
        ],

        // Used to build the address when there is no single address field.
        'address_parts' => [
            'Flat' => ['Flat / Shop No.', 'Flat No.', 'Shop No.'],
            'Building' => ['Building', 'Building No.'],
            'Road' => ['Road/Street Number', 'Road', 'Street'],
            'Block' => ['Block'],
            '' => ['Town', 'City'],
        ],
    ],

    'agent' => [
        // Set to false to switch the Clerko Agent off platform-wide.
        'enabled' => env('CLERKO_AGENT_ENABLED', true),
        'model' => env('CLERKO_AGENT_MODEL', 'claude-opus-5'),
        'api_key' => env('ANTHROPIC_API_KEY'),
    ],

];
