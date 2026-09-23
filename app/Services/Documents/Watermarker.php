<?php

namespace App\Services\Documents;

use setasign\Fpdi\Fpdi;
use Symfony\Component\Process\Process;
use Throwable;

/**
 * Stamps every page of a PDF with a per-viewer watermark, so a leaked copy can
 * be traced back to the account that viewed it.
 */
class Watermarker
{
    /**
     * Return the watermarked PDF bytes, or null when the PDF cannot be parsed
     * (the caller then serves it through the in-app viewer only).
     */
    public function stamp(string $pdfBytes, string $text): ?string
    {
        $result = $this->tryStamp($pdfBytes, $text);

        if ($result === null && ($normalised = $this->normaliseWithGhostscript($pdfBytes))) {
            $result = $this->tryStamp($normalised, $text);
        }

        return $result;
    }

    private function tryStamp(string $pdfBytes, string $text): ?string
    {
        $source = tempnam(sys_get_temp_dir(), 'wm');
        file_put_contents($source, $pdfBytes);

        try {
            $pdf = new Fpdi;
            // The footer sits near the bottom edge; never let it spill onto a new page.
            $pdf->SetAutoPageBreak(false);
            $pageCount = $pdf->setSourceFile($source);

            for ($page = 1; $page <= $pageCount; $page++) {
                $template = $pdf->importPage($page);
                $size = $pdf->getTemplateSize($template);
                $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
                $pdf->useTemplate($template);
                $this->drawWatermark($pdf, $size['width'], $size['height'], $text);
            }

            return $pdf->Output('S');
        } catch (Throwable) {
            return null;
        } finally {
            @unlink($source);
        }
    }

    private function drawWatermark(Fpdi $pdf, float $width, float $height, string $text): void
    {
        $label = iconv('UTF-8', 'windows-1252//TRANSLIT', $text) ?: $text;

        // Footer line on every page.
        $pdf->SetFont('Helvetica', '', 7);
        $pdf->SetTextColor(120, 120, 120);
        $pdf->SetXY(8, $height - 8);
        $pdf->Cell($width - 16, 4, $label, 0, 0, 'C');

        // Diagonal repeated stamp across the page.
        $pdf->SetFont('Helvetica', 'B', 14);
        $pdf->SetTextColor(200, 200, 200);
        for ($y = 40; $y < $height; $y += 70) {
            $this->rotatedText($pdf, 15, $y, $label, 30);
        }
    }

    private function rotatedText(Fpdi $pdf, float $x, float $y, string $text, float $angle): void
    {
        $angleRad = deg2rad($angle);
        $c = cos($angleRad);
        $s = sin($angleRad);
        $k = (fn () => $this->k)->call($pdf); // points per user unit
        $cx = $x * $k;
        $cy = ($pdf->GetPageHeight() - $y) * $k;

        $pdf->SetXY($x, $y);
        $this->out($pdf, sprintf('q %.5F %.5F %.5F %.5F %.2F %.2F cm 1 0 0 1 %.2F %.2F cm', $c, $s, -$s, $c, $cx, $cy, -$cx, -$cy));
        $pdf->Text($x, $y, $text);
        $this->out($pdf, 'Q');
    }

    private function out(Fpdi $pdf, string $command): void
    {
        (fn () => $this->_out($command))->call($pdf);
    }

    private function normaliseWithGhostscript(string $pdfBytes): ?string
    {
        $binary = config('clerko.documents.ghostscript_path');
        if (! $binary || ! is_executable($binary)) {
            return null;
        }

        $in = tempnam(sys_get_temp_dir(), 'gsin');
        $out = tempnam(sys_get_temp_dir(), 'gsout');
        file_put_contents($in, $pdfBytes);

        try {
            $process = new Process([$binary, '-q', '-dNOPAUSE', '-dBATCH', '-dSAFER', '-sDEVICE=pdfwrite',
                '-dCompatibilityLevel=1.4', '-sOutputFile='.$out, $in]);
            $process->setTimeout(60)->run();

            return $process->isSuccessful() ? file_get_contents($out) : null;
        } finally {
            @unlink($in);
            @unlink($out);
        }
    }
}
