<?php

namespace App\Http\Controllers\Seller;

use App\Enums\VerificationStatus;
use App\Http\Controllers\Controller;
use App\Jobs\ExtractCompanyProfile;
use App\Models\Company;
use App\Services\Audit\AuditLog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * KYB: the seller uploads the CR profile PDF saved from Sijilat; the profile
 * is extracted automatically and verified manually by an admin.
 */
class CompanyController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('seller/company/create', [
            'capacities' => Company::SELLER_CAPACITIES,
        ]);
    }

    public function store(Request $request, AuditLog $audit): RedirectResponse
    {
        $data = $request->validate([
            'cr_pdf' => ['required', 'file', 'mimes:pdf', 'max:10240'],
            'seller_capacity' => ['required', 'in:'.implode(',', array_keys(Company::SELLER_CAPACITIES))],
            'authority_document' => ['nullable', 'required_if:seller_capacity,attorney', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
            'confirm_authority' => ['accepted'],
        ]);

        $user = $request->user();
        $disk = config('clerko.documents.disk');

        $company = Company::create([
            'owner_id' => $user->id,
            'cr_pdf_path' => $request->file('cr_pdf')->store("companies/{$user->id}", $disk),
            'seller_capacity' => $data['seller_capacity'],
            'authority_document_path' => $request->file('authority_document')?->store("companies/{$user->id}", $disk),
            'verification_status' => VerificationStatus::Pending,
        ]);

        $audit->record('company.cr_uploaded', $company, $user);
        ExtractCompanyProfile::dispatch($company);

        return redirect()->route('seller.companies.show', $company)
            ->with('success', 'CR profile uploaded. We are reading it now.');
    }

    public function show(Request $request, Company $company): Response
    {
        abort_unless($company->owner_id === $request->user()->id, 403);

        return Inertia::render('seller/company/show', [
            'company' => [
                ...$company->only('id', 'extraction_status', 'extraction_error', 'cr_number', 'name_en', 'name_ar',
                    'legal_form', 'cr_status', 'address', 'activities', 'shareholders', 'signatories',
                    'seller_capacity', 'verification_notes'),
                'registration_date' => $company->registration_date?->toDateString(),
                'expiry_date' => $company->expiry_date?->toDateString(),
                'capital' => $company->capital !== null ? (float) $company->capital : null,
                'verification_status' => $company->verification_status->value,
                'seller_capacity_label' => Company::SELLER_CAPACITIES[$company->seller_capacity] ?? $company->seller_capacity,
            ],
            'hasListing' => $company->listings()->exists(),
        ]);
    }

    public function retry(Request $request, Company $company): RedirectResponse
    {
        abort_unless($company->owner_id === $request->user()->id, 403);
        abort_unless($company->extraction_status === Company::EXTRACTION_FAILED, 409);

        $company->update(['extraction_status' => Company::EXTRACTION_PENDING, 'extraction_reference' => null, 'extraction_error' => null]);
        ExtractCompanyProfile::dispatch($company);

        return back()->with('success', 'Trying again.');
    }

    public function crPdf(Request $request, Company $company): StreamedResponse
    {
        abort_unless($company->owner_id === $request->user()->id || $request->user()->is_admin, 403);

        return Storage::disk(config('clerko.documents.disk'))->response($company->cr_pdf_path, 'cr-profile.pdf', [
            'Cache-Control' => 'private, no-store',
        ]);
    }
}
