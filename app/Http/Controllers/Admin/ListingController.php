<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ListingStatus;
use App\Http\Controllers\Controller;
use App\Jobs\NotifyMatchingBuyers;
use App\Models\Listing;
use App\Models\ListingDocument;
use App\Models\ListingReview;
use App\Notifications\ClerkoNotification;
use App\Services\Audit\AuditLog;
use App\Services\Documents\DocumentServer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class ListingController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->query('status', ListingStatus::PendingReview->value);

        $listings = Listing::query()
            ->with(['company', 'seller'])
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->latest('updated_at')
            ->paginate(25)
            ->withQueryString()
            ->through(fn (Listing $l) => self::row($l));

        return Inertia::render('admin/listings/index', [
            'listings' => $listings,
            'status' => $status,
            'statuses' => collect(ListingStatus::cases())->mapWithKeys(fn ($s) => [$s->value => $s->label()]),
        ]);
    }

    public function show(Listing $listing): Response
    {
        $listing->load(['company', 'seller.latestKycSubmission', 'documents', 'reviews.admin']);

        return Inertia::render('admin/listings/show', [
            'listing' => [
                ...$listing->toTeaser(),
                ...$listing->only('company_overview', 'financial_summary', 'valuation_summary', 'valuation_methods',
                    'financial_history', 'legal_findings', 'court_debt_checks'),
                'ebitda' => $listing->ebitda !== null ? (float) $listing->ebitda : null,
                'valuation_low' => $listing->valuation_low !== null ? (float) $listing->valuation_low : null,
                'valuation_high' => $listing->valuation_high !== null ? (float) $listing->valuation_high : null,
                'status' => $listing->status->value,
                'status_label' => $listing->status->label(),
                'submitted_at' => $listing->submitted_at?->toIso8601String(),
            ],
            'company' => [
                'id' => $listing->company->id,
                'name' => $listing->company->name_en,
                'cr_number' => $listing->company->cr_number,
                'verification_status' => $listing->company->verification_status->value,
            ],
            'seller' => [
                'name' => $listing->seller->name,
                'email' => $listing->seller->email,
                'kyc_status' => $listing->seller->kyc_status->value,
                'kyc_submission_id' => $listing->seller->latestKycSubmission?->id,
            ],
            'documents' => $listing->documents->map(fn ($d) => $d->only('id', 'title', 'category', 'visibility', 'original_name')),
            'reviews' => $listing->reviews->map(fn ($r) => [
                'decision' => $r->decision,
                'notes' => $r->notes,
                'admin' => $r->admin->name,
                'created_at' => $r->created_at->toIso8601String(),
            ]),
        ]);
    }

    public function review(Request $request, Listing $listing, AuditLog $audit): RedirectResponse
    {
        abort_unless($listing->status === ListingStatus::PendingReview, 409, 'This listing is not awaiting review.');

        $data = $request->validate([
            'decision' => ['required', 'in:approve,revise,reject'],
            'notes' => ['nullable', 'required_unless:decision,approve', 'string', 'max:3000'],
            'featured' => ['nullable', 'boolean'],
        ]);

        if ($data['decision'] === ListingReview::APPROVE) {
            $listing->loadMissing(['company', 'seller']);
            if (! $listing->company->isVerified() || ! $listing->seller->isKycVerified()) {
                throw ValidationException::withMessages([
                    'decision' => 'Verify the seller\'s identity (KYC) and the company (KYB) before approving the listing.',
                ]);
            }
        }

        ListingReview::create([
            'listing_id' => $listing->id,
            'admin_id' => $request->user()->id,
            'decision' => $data['decision'],
            'notes' => $data['notes'] ?? null,
        ]);

        $listing->update(match ($data['decision']) {
            ListingReview::APPROVE => [
                'status' => ListingStatus::Live,
                'published_at' => now(),
                'featured' => $data['featured'] ?? $listing->featured,
            ],
            ListingReview::REVISE => ['status' => ListingStatus::RevisionRequested],
            ListingReview::REJECT => ['status' => ListingStatus::Rejected],
        });

        $audit->record('listing.reviewed', $listing, $request->user(), ['decision' => $data['decision']], listingId: $listing->id);

        $listing->seller->notify(new ClerkoNotification(
            match ($data['decision']) {
                ListingReview::APPROVE => 'Your listing is live',
                ListingReview::REVISE => 'Revision requested on your listing',
                ListingReview::REJECT => 'Your listing was not approved',
            },
            "Listing {$listing->reference}: ".($data['notes'] ?? 'your anonymised teaser is now on the marketplace.'),
            route('seller.listings.show', $listing),
        ));

        if ($data['decision'] === ListingReview::APPROVE) {
            NotifyMatchingBuyers::dispatch($listing);
        }

        return redirect()->route('admin.listings.index')->with('success', 'Review recorded.');
    }

    /** Admins read listing documents during moderation; the view is logged. */
    public function document(Request $request, Listing $listing, ListingDocument $document, DocumentServer $server): HttpResponse
    {
        abort_unless($document->listing_id === $listing->id, 404);

        return $server->serve($document, $request->user(), null, $request, false);
    }

    /**
     * @return array<string, mixed>
     */
    public static function row(Listing $l): array
    {
        return [
            'id' => $l->id,
            'reference' => $l->reference,
            'headline' => $l->headline,
            'company' => $l->company?->name_en,
            'company_verified' => $l->company?->isVerified() ?? false,
            'sector' => $l->sectorLabel(),
            'tier' => $l->tier,
            'status' => $l->status->value,
            'status_label' => $l->status->label(),
            'submitted_at' => $l->submitted_at?->toIso8601String(),
        ];
    }
}
