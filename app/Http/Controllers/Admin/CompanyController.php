<?php

namespace App\Http\Controllers\Admin;

use App\Enums\VerificationStatus;
use App\Http\Controllers\Controller;
use App\Jobs\ExtractCompanyProfile;
use App\Models\Company;
use App\Notifications\ClerkoNotification;
use App\Services\Audit\AuditLog;
use App\Services\Extraction\CompanyProfileExtraction;
use App\Support\PrivateFiles;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * KYB: an admin checks the extracted profile against the Sijilat CR PDF,
 * corrects anything the extraction got wrong, and verifies or rejects it.
 */
class CompanyController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->query('status', VerificationStatus::Pending->value);

        return Inertia::render('admin/companies/index', [
            'companies' => Company::query()
                ->with('owner')
                ->when($status !== 'all', fn ($q) => $q->where('verification_status', $status))
                ->latest()
                ->paginate(25)
                ->withQueryString()
                ->through(fn (Company $c) => [
                    'id' => $c->id,
                    'name' => $c->name_en,
                    'cr_number' => $c->cr_number,
                    'owner' => $c->owner->name,
                    'extraction_status' => $c->extraction_status,
                    'verification_status' => $c->verification_status->value,
                    'expiry_date' => $c->expiry_date?->toDateString(),
                    'cr_expires_soon' => $c->crExpiresSoon(),
                    'created_at' => $c->created_at->toIso8601String(),
                ]),
            'status' => $status,
        ]);
    }

    public function show(Company $company, CompanyProfileExtraction $extraction): Response
    {
        $company->load('owner');
        $preview = $company->extracted_data ? $extraction->preview($company->extracted_data) : null;

        return Inertia::render('admin/companies/show', [
            'company' => [
                ...$company->only('id', 'extraction_status', 'extraction_error', 'cr_number', 'name_en', 'name_ar', 'legal_form',
                    'cr_status', 'address', 'activities', 'shareholders', 'signatories', 'seller_capacity', 'verification_notes'),
                'registration_date' => $company->registration_date?->toDateString(),
                'expiry_date' => $company->expiry_date?->toDateString(),
                'capital' => $company->capital !== null ? (float) $company->capital : null,
                'verification_status' => $company->verification_status->value,
                'seller_capacity_label' => Company::SELLER_CAPACITIES[$company->seller_capacity] ?? $company->seller_capacity,
                'has_authority_document' => $company->authority_document_path !== null,
                'extracted_data' => $company->extracted_data,
                'extraction_provider' => $company->extraction_provider,
                'extraction_reference' => $company->extraction_reference,
                'unmapped_keys' => $preview['unmapped_keys'] ?? [],
                'cr_expires_soon' => $company->crExpiresSoon(),
                'verified_at' => $company->verified_at?->toIso8601String(),
                'owner' => [
                    'name' => $company->owner->name,
                    'email' => $company->owner->email,
                    'kyc_status' => $company->owner->kyc_status->value,
                ],
            ],
            'extraction' => [
                'driver' => $extraction->provider(),
                'runs' => $company->extractionRuns()->limit(20)->get()->map(fn ($run) => [
                    'id' => $run->id,
                    'provider' => $run->provider,
                    'action' => $run->action,
                    'status' => $run->status,
                    'reference' => $run->reference,
                    'error' => $run->error,
                    'response' => $run->response,
                    'duration_ms' => $run->duration_ms,
                    'created_at' => $run->created_at->toIso8601String(),
                ]),
            ],
        ]);
    }

    /** Run the extraction again with the configured provider. */
    public function retryExtraction(Request $request, Company $company, CompanyProfileExtraction $extraction, AuditLog $audit): RedirectResponse
    {
        abort_if($company->isVerified(), 409, 'This company is already verified.');

        $extraction->restart($company);
        ExtractCompanyProfile::dispatch($company);
        $audit->record('company.extraction_retried', $company, $request->user());

        return back()->with('success', 'Extraction restarted with '.$extraction->provider().'.');
    }

    /** Stop automatic extraction; the admin enters the profile from the PDF. */
    public function manualEntry(Request $request, Company $company, CompanyProfileExtraction $extraction, AuditLog $audit): RedirectResponse
    {
        abort_if($company->extraction_status === Company::EXTRACTION_COMPLETED, 409);

        $extraction->markManual($company, 'Entered manually by an admin.');
        $audit->record('company.extraction_manual', $company, $request->user());

        return back()->with('success', 'Enter the profile from the CR PDF, then verify it.');
    }

    public function update(Request $request, Company $company, AuditLog $audit): RedirectResponse
    {
        $data = $request->validate([
            'cr_number' => ['nullable', 'string', 'max:40'],
            'name_en' => ['nullable', 'string', 'max:200'],
            'name_ar' => ['nullable', 'string', 'max:200'],
            'legal_form' => ['nullable', 'string', 'max:120'],
            'cr_status' => ['nullable', 'string', 'max:60'],
            'registration_date' => ['nullable', 'date'],
            'expiry_date' => ['nullable', 'date'],
            'capital' => ['nullable', 'numeric', 'min:0'],
            'address' => ['nullable', 'string', 'max:500'],
            'activities' => ['nullable', 'array'],
            'shareholders' => ['nullable', 'array'],
            'signatories' => ['nullable', 'array'],
        ]);

        $changed = array_keys(array_diff_assoc(
            array_map(fn ($v) => json_encode($v), $data),
            array_map(fn ($v) => json_encode($v), $company->only(array_keys($data))),
        ));

        $company->update($data);
        $audit->record('company.profile_corrected', $company, $request->user(), ['fields' => $changed]);

        return back()->with('success', 'Company profile updated.');
    }

    public function verify(Request $request, Company $company, AuditLog $audit): RedirectResponse
    {
        $data = $request->validate([
            'decision' => ['required', 'in:verified,rejected'],
            'notes' => ['nullable', 'required_if:decision,rejected', 'string', 'max:2000'],
        ]);

        $company->update([
            'verification_status' => $data['decision'],
            'verified_by' => $request->user()->id,
            'verified_at' => now(),
            'verification_notes' => $data['notes'] ?? null,
        ]);

        $audit->record('company.'.$data['decision'], $company, $request->user());

        $company->owner->notify(new ClerkoNotification(
            $data['decision'] === 'verified' ? 'Company verified' : 'Company verification unsuccessful',
            $data['decision'] === 'verified'
                ? "{$company->name_en} has been verified."
                : "We could not verify {$company->name_en}: {$data['notes']}",
            route('seller.companies.show', $company),
        ));

        return redirect()->route('admin.companies.index')->with('success', 'Decision recorded.');
    }

    public function authorityDocument(Company $company): StreamedResponse
    {
        abort_unless($company->authority_document_path, 404);

        return PrivateFiles::inline($company->authority_document_path);
    }
}
