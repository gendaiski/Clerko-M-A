<?php

namespace App\Services\Extraction;

/**
 * A document-extraction provider that reads the company profile out of the
 * CR PDF a seller saved from Sijilat.
 *
 * To add a provider: implement this interface (and ReceivesWebhooks if the
 * provider can push results), register it in AppServiceProvider, and set
 * CLERKO_EXTRACTION_DRIVER. Nothing else in the platform changes.
 */
interface ProfileExtractor
{
    /** Provider name recorded against each extraction run, e.g. "xtracta". */
    public function name(): string;

    /**
     * Send the PDF for extraction and return the provider's reference for it
     * (document id, batch id…), used to poll for or match the result.
     */
    public function submit(string $pdf, string $filename): string;

    /** Ask the provider for the current state of an earlier submission. */
    public function fetch(string $reference): ExtractionResult;
}
