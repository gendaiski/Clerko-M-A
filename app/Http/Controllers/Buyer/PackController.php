<?php

namespace App\Http\Controllers\Buyer;

use App\Http\Controllers\Controller;
use App\Models\Engagement;
use App\Models\Listing;
use App\Models\ListingDocument;
use App\Services\Audit\AuditLog;
use App\Services\Documents\DocumentServer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

/**
 * The Company Details Pack: identity, valuation, financials, legal and court /
 * debt checks, and watermarked supporting documents.
 */
class PackController extends Controller
{
    public function show(Request $request, Engagement $engagement, AuditLog $audit): Response
    {
        Gate::authorize('viewPack', $engagement);

        $listing = $engagement->listing->load(['company', 'documents']);
        $company = $listing->company;

        $audit->record('pack.viewed', $engagement, $request->user(), listingId: $listing->id);

        return Inertia::render('buyer/pack', [
            'engagement' => [
                'id' => $engagement->id,
                'stage' => $engagement->stage->value,
                'deal_room_id' => $engagement->dealRoom?->id,
            ],
            'viewer' => $request->user()->buyerLabel(),
            'listing' => [
                ...$listing->toTeaser(),
                'ebitda' => $listing->ebitda !== null ? (float) $listing->ebitda : null,
                'company_overview' => $listing->company_overview,
                'financial_summary' => $listing->financial_summary,
                'valuation_low' => $listing->valuation_low !== null ? (float) $listing->valuation_low : null,
                'valuation_high' => $listing->valuation_high !== null ? (float) $listing->valuation_high : null,
                'valuation_summary' => $listing->valuation_summary,
                'valuation_methods' => $listing->valuation_methods ?? [],
                'financial_history' => $listing->financial_history ?? [],
                'legal_findings' => $listing->legal_findings ?? [],
                'court_debt_checks' => $listing->court_debt_checks ?? [],
            ],
            'company' => [
                'name_en' => $company->name_en,
                'name_ar' => $company->name_ar,
                'cr_number' => $company->cr_number,
                'legal_form' => $company->legal_form,
                'cr_status' => $company->cr_status,
                'registration_date' => $company->registration_date?->toDateString(),
                'expiry_date' => $company->expiry_date?->toDateString(),
                'capital' => $company->capital !== null ? (float) $company->capital : null,
                'address' => $company->address,
                'activities' => $company->activities ?? [],
                'verified' => $company->isVerified(),
            ],
            'documents' => $listing->documents
                ->where('visibility', ListingDocument::VISIBILITY_PACK)
                ->values()
                ->map(fn (ListingDocument $d) => [
                    'id' => $d->id,
                    'title' => $d->title,
                    'category' => Listing::DOCUMENT_CATEGORIES[$d->category] ?? $d->category,
                    'is_pdf' => $d->isPdf(),
                    'size' => $d->size,
                ]),
        ]);
    }

    public function document(Request $request, Engagement $engagement, ListingDocument $document, DocumentServer $server): HttpResponse
    {
        Gate::authorize('viewPack', $engagement);
        abort_unless($document->listing_id === $engagement->listing_id, 404);

        $released = $engagement->dealRoom?->releasedDocuments()->whereKey($document->id)->exists() ?? false;
        abort_unless($document->visibility === ListingDocument::VISIBILITY_PACK || $released, 403);

        return $server->serve($document, $request->user(), $engagement, $request, $request->boolean('download'));
    }
}
