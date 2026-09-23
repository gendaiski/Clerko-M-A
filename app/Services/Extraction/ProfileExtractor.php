<?php

namespace App\Services\Extraction;

use App\Models\Company;

/**
 * Reads the company profile out of the CR PDF the seller saved from Sijilat.
 */
interface ProfileExtractor
{
    /** Send the PDF for extraction and return the provider's reference. */
    public function submit(Company $company): string;

    public function fetch(Company $company): ExtractionResult;
}
