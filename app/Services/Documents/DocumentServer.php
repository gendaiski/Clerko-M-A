<?php

namespace App\Services\Documents;

use App\Models\DocumentAccessLog;
use App\Models\Engagement;
use App\Models\ListingDocument;
use App\Models\User;
use App\Support\PrivateFiles;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Serves confidential listing documents: every view is logged, and PDFs are
 * watermarked to the viewing account.
 */
class DocumentServer
{
    public function __construct(private readonly Watermarker $watermarker) {}

    public function serve(ListingDocument $document, User $viewer, ?Engagement $engagement, Request $request, bool $download): Response
    {
        $bytes = PrivateFiles::get($document->path);
        $watermarked = false;

        if ($document->isPdf()) {
            $stamp = sprintf(
                'CONFIDENTIAL - Clerko M&A - %s - %s - %s - NDA-bound, do not distribute',
                $engagement ? $viewer->buyerLabel() : $viewer->name,
                $viewer->email,
                now(config('clerko.display_timezone'))->format('Y-m-d H:i').' Bahrain time',
            );
            if ($stamped = $this->watermarker->stamp($bytes, $stamp)) {
                $bytes = $stamped;
                $watermarked = true;
            }
        }

        // An unstamped PDF may only be viewed inline, never downloaded.
        $download = $download && (! $document->isPdf() || $watermarked);

        DocumentAccessLog::create([
            'user_id' => $viewer->id,
            'listing_document_id' => $document->id,
            'engagement_id' => $engagement?->id,
            'action' => $download ? 'download' : 'view',
            'watermarked' => $watermarked,
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 500),
            'created_at' => now(),
        ]);

        $filename = str_replace(['"', '/', '\\'], '', $document->original_name);

        return response($bytes, 200, [
            'Content-Type' => $document->mime_type,
            'Content-Disposition' => ($download ? 'attachment' : 'inline').'; filename="'.$filename.'"',
            'Cache-Control' => 'private, no-store, max-age=0',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
