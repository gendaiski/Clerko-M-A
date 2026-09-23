<?php

namespace App\Http\Controllers;

use App\Enums\VerificationStatus;
use App\Models\KycSubmission;
use App\Models\User;
use App\Notifications\ClerkoNotification;
use App\Services\Audit\AuditLog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Identity verification (KYC). Documents are reviewed manually by an admin.
 */
class VerificationController extends Controller
{
    public function show(Request $request): Response
    {
        $user = $request->user();
        $submission = $user->latestKycSubmission;

        return Inertia::render('verification/show', [
            'status' => $user->kyc_status->value,
            'submission' => $submission?->only('full_legal_name', 'nationality', 'id_type', 'status', 'review_notes', 'created_at'),
            'redirectTo' => $request->query('redirect'),
        ]);
    }

    public function store(Request $request, AuditLog $audit): RedirectResponse
    {
        $user = $request->user();
        abort_if(in_array($user->kyc_status, [VerificationStatus::Pending, VerificationStatus::Verified], true), 409);

        $data = $request->validate([
            'full_legal_name' => ['required', 'string', 'max:150'],
            'nationality' => ['required', 'string', 'max:80'],
            'id_type' => ['required', 'in:cpr,passport,gcc_id'],
            'id_number' => ['required', 'string', 'max:40'],
            'id_expiry' => ['required', 'date', 'after:today'],
            'id_document' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
            'selfie' => ['required', 'file', 'mimes:jpg,jpeg,png', 'max:10240'],
            'redirect' => ['nullable', 'string', 'starts_with:/'],
        ]);

        $disk = config('clerko.documents.disk');
        $submission = KycSubmission::create([
            'user_id' => $user->id,
            'full_legal_name' => $data['full_legal_name'],
            'nationality' => $data['nationality'],
            'id_type' => $data['id_type'],
            'id_number' => $data['id_number'],
            'id_expiry' => $data['id_expiry'],
            'id_document_path' => $request->file('id_document')->store("kyc/{$user->id}", $disk),
            'selfie_path' => $request->file('selfie')->store("kyc/{$user->id}", $disk),
            'status' => VerificationStatus::Pending,
        ]);

        $user->forceFill(['kyc_status' => VerificationStatus::Pending])->save();
        $audit->record('kyc.submitted', $submission, $user);

        Notification::send(
            User::where('is_admin', true)->get(),
            new ClerkoNotification('Identity verification to review', "{$user->name} submitted identity documents.", route('admin.kyc.show', $submission)),
        );

        return redirect($data['redirect'] ?? route('verification.show'))
            ->with('success', 'Thanks — your documents are with our compliance team. We usually verify within one business day.');
    }
}
