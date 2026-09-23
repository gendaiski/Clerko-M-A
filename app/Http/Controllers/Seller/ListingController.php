<?php

namespace App\Http\Controllers\Seller;

use App\Enums\ListingStatus;
use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Engagement;
use App\Models\Listing;
use App\Services\Audit\AuditLog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ListingController extends Controller
{
    public function __construct(private readonly AuditLog $audit) {}

    public function create(Request $request): Response|RedirectResponse
    {
        $companies = $request->user()->companies()->latest()->get();

        if ($companies->isEmpty()) {
            return redirect()->route('seller.companies.create')
                ->with('success', 'Start by uploading your company\'s CR profile.');
        }

        return Inertia::render('seller/listings/form', [
            'listing' => null,
            'companies' => $companies->map(fn (Company $c) => ['id' => $c->id, 'name' => $c->name_en ?? 'Company #'.$c->id]),
            'options' => $this->options(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);
        $company = $request->user()->companies()->findOrFail($data['company_id']);
        $this->assertTeaserIsAnonymous($company, $data);

        $listing = Listing::create([
            ...$data,
            'seller_id' => $request->user()->id,
            'status' => ListingStatus::Draft,
        ]);

        $this->audit->record('listing.created', $listing, $request->user(), listingId: $listing->id);

        return redirect()->route('seller.listings.show', $listing)->with('success', 'Listing saved as a draft.');
    }

    public function show(Request $request, Listing $listing): Response
    {
        Gate::authorize('manage', $listing);

        $listing->load(['company', 'documents', 'reviews.admin']);
        $subscription = $listing->activeSubscription();

        return Inertia::render('seller/listings/show', [
            'listing' => [
                ...$listing->toTeaser(),
                'status' => $listing->status->value,
                'status_label' => $listing->status->label(),
                'editable' => $listing->status->isEditableBySeller(),
                'company' => [
                    'id' => $listing->company->id,
                    'name' => $listing->company->name_en,
                    'verification_status' => $listing->company->verification_status->value,
                ],
                'submitted_at' => $listing->submitted_at?->toIso8601String(),
            ],
            'subscription' => $subscription ? [
                'plan' => $subscription->plan,
                'ends_at' => $subscription->ends_at->toIso8601String(),
            ] : null,
            'reviews' => $listing->reviews->map(fn ($r) => [
                'decision' => $r->decision,
                'notes' => $r->notes,
                'created_at' => $r->created_at->toIso8601String(),
            ]),
            'documents' => $listing->documents->map(fn ($d) => [
                'id' => $d->id,
                'title' => $d->title,
                'category' => $d->category,
                'visibility' => $d->visibility,
                'original_name' => $d->original_name,
                'size' => $d->size,
                'views' => $d->accessLogs()->count(),
            ]),
            'pipeline' => Engagement::query()
                ->where('listing_id', $listing->id)
                ->with(['buyer', 'listing', 'dealRoom'])
                ->latest('last_activity_at')
                ->get()
                ->map(fn ($e) => PipelineRow::from($e)),
            'options' => $this->options(),
            'kycStatus' => $request->user()->kyc_status->value,
        ]);
    }

    public function edit(Request $request, Listing $listing): Response
    {
        Gate::authorize('update', $listing);

        return Inertia::render('seller/listings/form', [
            'listing' => [
                ...$listing->only('id', 'company_id', 'headline', 'teaser_summary', 'sector', 'employees_band', 'location',
                    'established_year', 'deal_preference', 'highlights', 'company_overview', 'financial_summary',
                    'valuation_summary', 'valuation_methods', 'financial_history', 'legal_findings', 'court_debt_checks'),
                'annual_revenue' => (float) $listing->annual_revenue,
                'ebitda' => $listing->ebitda !== null ? (float) $listing->ebitda : null,
                'growth_pct' => $listing->growth_pct !== null ? (float) $listing->growth_pct : null,
                'asking_price' => (float) $listing->asking_price,
                'valuation_low' => $listing->valuation_low !== null ? (float) $listing->valuation_low : null,
                'valuation_high' => $listing->valuation_high !== null ? (float) $listing->valuation_high : null,
                'status' => $listing->status->value,
            ],
            'companies' => $request->user()->companies()->get()->map(fn (Company $c) => ['id' => $c->id, 'name' => $c->name_en ?? 'Company #'.$c->id]),
            'options' => $this->options(),
        ]);
    }

    public function update(Request $request, Listing $listing): RedirectResponse
    {
        Gate::authorize('update', $listing);

        $data = $this->validated($request);
        $company = $request->user()->companies()->findOrFail($data['company_id']);
        $this->assertTeaserIsAnonymous($company, $data);

        $listing->update($data);
        $this->audit->record('listing.updated', $listing, $request->user(), listingId: $listing->id);

        return redirect()->route('seller.listings.show', $listing)->with('success', 'Listing updated.');
    }

    /** Resubmit after a requested revision (the tier is already paid). */
    public function submit(Request $request, Listing $listing): RedirectResponse
    {
        Gate::authorize('update', $listing);

        if (! $listing->activeSubscription()) {
            return redirect()->route('seller.listings.tier', $listing);
        }

        $listing->update(['status' => ListingStatus::PendingReview, 'submitted_at' => now()]);
        $this->audit->record('listing.resubmitted', $listing, $request->user(), listingId: $listing->id);

        return redirect()->route('seller.listings.show', $listing)->with('success', 'Resubmitted for review.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        $money = ['numeric', 'min:0', 'max:999999999999'];
        $check = ['required', 'array:status,text'];

        return $request->validate([
            'company_id' => ['required', 'integer'],
            'headline' => ['required', 'string', 'max:120'],
            'teaser_summary' => ['required', 'string', 'max:1500'],
            'sector' => ['required', Rule::in(array_keys(Listing::SECTORS))],
            'employees_band' => ['required', Rule::in(array_keys(Listing::EMPLOYEE_BANDS))],
            'location' => ['required', Rule::in(array_keys(Listing::LOCATIONS))],
            'established_year' => ['nullable', 'integer', 'min:1900', 'max:'.now()->year],
            'annual_revenue' => ['required', ...$money],
            'ebitda' => ['nullable', 'numeric', 'min:-999999999999', 'max:999999999999'],
            'growth_pct' => ['nullable', 'numeric', 'min:-100', 'max:1000'],
            'asking_price' => ['required', ...$money, 'gt:0'],
            'deal_preference' => ['required', Rule::in(array_keys(Listing::DEAL_PREFERENCES))],
            'highlights' => ['nullable', 'array', 'max:6'],
            'highlights.*' => ['string', 'max:40'],

            'company_overview' => ['nullable', 'string', 'max:5000'],
            'financial_summary' => ['nullable', 'string', 'max:5000'],
            'valuation_low' => ['nullable', ...$money],
            'valuation_high' => ['nullable', ...$money, 'gte:valuation_low'],
            'valuation_summary' => ['nullable', 'string', 'max:3000'],
            'valuation_methods' => ['nullable', 'array', 'max:6'],
            'valuation_methods.*' => ['required', 'array:method,value'],
            'valuation_methods.*.method' => ['required', 'string', 'max:80'],
            'valuation_methods.*.value' => ['required', ...$money],
            'financial_history' => ['nullable', 'array', 'max:10'],
            'financial_history.*' => ['required', 'array:year,revenue,ebitda'],
            'financial_history.*.year' => ['required', 'integer', 'min:1990', 'max:'.(now()->year + 1)],
            'financial_history.*.revenue' => ['required', ...$money],
            'financial_history.*.ebitda' => ['nullable', 'numeric'],
            'legal_findings' => ['nullable', 'array', 'max:12'],
            'legal_findings.*' => $check,
            'legal_findings.*.status' => ['required', 'in:ok,warning'],
            'legal_findings.*.text' => ['required', 'string', 'max:300'],
            'court_debt_checks' => ['nullable', 'array', 'max:12'],
            'court_debt_checks.*' => $check,
            'court_debt_checks.*.status' => ['required', 'in:ok,warning'],
            'court_debt_checks.*.text' => ['required', 'string', 'max:300'],
        ]);
    }

    /**
     * The teaser is public, so it must not give away who the company is.
     *
     * @param  array<string, mixed>  $data
     */
    private function assertTeaserIsAnonymous(Company $company, array $data): void
    {
        $public = mb_strtolower($data['headline'].' '.$data['teaser_summary'].' '.implode(' ', $data['highlights'] ?? []));

        $names = collect([$company->name_en, $company->name_ar, $company->cr_number])
            ->filter()
            ->map(fn ($n) => mb_strtolower(trim(preg_replace('/\b(w\.?l\.?l\.?|b\.?s\.?c\.?|s\.?p\.?c\.?|co\.?|company|ltd\.?)\b/i', '', $n), ' .,')))
            ->filter(fn ($n) => mb_strlen($n) >= 3);

        foreach ($names as $name) {
            if (str_contains($public, $name)) {
                throw ValidationException::withMessages([
                    'headline' => 'The teaser is public and must not name the company. Remove "'.$name.'" from the headline, summary and highlights.',
                ]);
            }
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function options(): array
    {
        return [
            'sectors' => Listing::SECTORS,
            'employee_bands' => Listing::EMPLOYEE_BANDS,
            'locations' => Listing::LOCATIONS,
            'deal_preferences' => Listing::DEAL_PREFERENCES,
            'document_categories' => Listing::DOCUMENT_CATEGORIES,
        ];
    }
}
