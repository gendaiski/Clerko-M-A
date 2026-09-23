<?php

namespace App\Support;

use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Confidential files (CR PDFs, identity documents, NDAs, deal documents) on
 * the private documents disk. A missing file is a 404, never a server error.
 */
final class PrivateFiles
{
    public static function disk(): Filesystem
    {
        return Storage::disk(config('clerko.documents.disk'));
    }

    public static function get(string $path): string
    {
        abort_unless(self::disk()->exists($path), 404, 'File not found.');

        return (string) self::disk()->get($path);
    }

    /**
     * @param  array<string, string>  $headers
     */
    public static function inline(string $path, ?string $name = null, array $headers = []): StreamedResponse
    {
        abort_unless(self::disk()->exists($path), 404, 'File not found.');

        return self::disk()->response($path, $name, ['Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff'] + $headers);
    }

    public static function download(string $path, string $name): StreamedResponse
    {
        abort_unless(self::disk()->exists($path), 404, 'File not found.');

        return self::disk()->download($path, $name, ['Cache-Control' => 'private, no-store']);
    }
}
