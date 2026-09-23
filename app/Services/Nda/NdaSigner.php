<?php

namespace App\Services\Nda;

use App\Enums\EngagementStage;
use App\Models\Engagement;
use App\Models\NdaSignature;
use App\Notifications\ClerkoNotification;
use App\Services\Audit\AuditLog;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class NdaSigner
{
    public function __construct(
        private readonly NdaTemplate $template,
        private readonly AuditLog $audit,
    ) {}

    public function sign(Engagement $engagement, string $signedName, Request $request): NdaSignature
    {
        $buyer = $engagement->buyer;
        $listing = $engagement->listing;
        $nda = $this->template->render($listing, $buyer);
        $hash = $this->template->hash($nda);
        $signedAt = now();

        $pdf = Pdf::loadView('pdf.nda', [
            'nda' => $nda,
            'signedName' => $signedName,
            'email' => $buyer->email,
            'alias' => $buyer->buyerLabel(),
            'signedAt' => $signedAt,
            'ip' => $request->ip(),
            'hash' => $hash,
        ])->output();

        $path = "ndas/{$listing->id}/engagement-{$engagement->id}.pdf";
        Storage::disk(config('clerko.documents.disk'))->put($path, $pdf);

        $signature = DB::transaction(function () use ($engagement, $buyer, $signedName, $nda, $hash, $path, $request, $signedAt) {
            $signature = NdaSignature::create([
                'engagement_id' => $engagement->id,
                'user_id' => $buyer->id,
                'signed_name' => $signedName,
                'nda_version' => $nda['version'],
                'text_sha256' => $hash,
                'pdf_path' => $path,
                'ip_address' => $request->ip(),
                'user_agent' => substr((string) $request->userAgent(), 0, 500),
                'signed_at' => $signedAt,
            ]);

            $engagement->nda_signed_at = $signedAt;
            $engagement->advanceTo(EngagementStage::NdaSigned);

            return $signature;
        });

        $this->audit->record('nda.signed', $signature, $buyer, [
            'nda_version' => $nda['version'],
            'text_sha256' => $hash,
        ], listingId: $listing->id);

        $listing->seller->notify(new ClerkoNotification(
            'NDA signed',
            "{$buyer->buyerLabel()} signed the NDA for listing {$listing->reference}.",
            route('seller.listings.show', $listing),
        ));

        return $signature;
    }
}
