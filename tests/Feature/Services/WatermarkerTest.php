<?php

namespace Tests\Feature\Services;

use App\Services\Documents\Watermarker;
use Barryvdh\DomPDF\Facade\Pdf;
use setasign\Fpdi\Fpdi;
use setasign\Fpdi\PdfParser\StreamReader;
use Tests\TestCase;

class WatermarkerTest extends TestCase
{
    public function test_it_stamps_every_page_of_a_pdf(): void
    {
        $source = Pdf::loadHTML('<h1>Page one</h1><div style="page-break-after: always"></div><h1>Page two</h1>')->output();

        $stamped = app(Watermarker::class)->stamp($source, 'CONFIDENTIAL - Buyer #A7 - buyer@example.com');

        $this->assertNotNull($stamped);
        $this->assertStringStartsWith('%PDF', $stamped);
        $this->assertSame(2, (new Fpdi)->setSourceFile(StreamReader::createByString($stamped)));
        $this->assertStringContainsString('Buyer #A7', $this->inflatedStreams($stamped));
    }

    /** Concatenate every Flate-compressed stream so we can search the page text. */
    private function inflatedStreams(string $pdf): string
    {
        preg_match_all('/stream\r?\n(.*?)\r?\nendstream/s', $pdf, $matches);

        return implode("\n", array_map(fn ($raw) => @gzuncompress($raw) ?: $raw, $matches[1]));
    }

    public function test_it_returns_null_for_unreadable_input(): void
    {
        $this->assertNull(app(Watermarker::class)->stamp('not a pdf', 'x'));
    }
}
