<?php

namespace App\Http\Controllers\Admin;

use App\Enums\VerificationStatus;
use App\Http\Controllers\Controller;
use App\Models\KycSubmission;
use App\Notifications\ClerkoNotification;
use App\Services\Audit\AuditLog;
use App\Support\PrivateFiles;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class KycController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->query('status', VerificationStatus::Pending->value);

        return Inertia::render('admin/kyc/index', [
            'submissions' => KycSubmission::query()
                ->with('user')
                ->when($status !== 'all', fn ($q) => $q->where('status', $status))
                ->latest()
                ->paginate(25)
                ->withQueryString()
                ->through(fn (KycSubmission $s) => [
                    'id' => $s->id,
                    'name' => $s->full_legal_name,
                    'email' => $s->user->email,
                    'id_type' => $s->id_type,
                    'status' => $s->status->value,
                    'created_at' => $s->created_at->toIso8601String(),
                ]),
            'status' => $status,
        ]);
    }

    public function show(KycSubmission $submission): Response
    {
        $submission->load('user', 'reviewer');

        return Inertia::render('admin/kyc/show', [
            'submission' => [
                ...$submission->only('id', 'full_legal_name', 'nationality', 'id_type', 'id_number', 'review_notes'),
                'id_expiry' => $submission->id_expiry->toDateString(),
                'status' => $submission->status->value,
                'reviewer' => $submission->reviewer?->name,
                'reviewed_at' => $submission->reviewed_at?->toIso8601String(),
                'created_at' => $submission->created_at->toIso8601String(),
                'user' => $submission->user->only('name', 'email', 'alias'),
            ],
        ]);
    }

    public function file(KycSubmission $submission, string $type): StreamedResponse
    {
        $path = match ($type) {
            'id' => $submission->id_document_path,
            'selfie' => $submission->selfie_path,
            default => abort(404),
        };

        return PrivateFiles::inline($path, null, ['Cache-Control' => 'private, no-store']);
    }

    public function decide(Request $request, KycSubmission $submission, AuditLog $audit): RedirectResponse
    {
        abort_unless($submission->status === VerificationStatus::Pending, 409);

        $data = $request->validate([
            'decision' => ['required', 'in:verified,rejected'],
            'notes' => ['nullable', 'required_if:decision,rejected', 'string', 'max:2000'],
        ]);

        $submission->update([
            'status' => $data['decision'],
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'review_notes' => $data['notes'] ?? null,
        ]);

        $user = $submission->user;
        $user->forceFill([
            'kyc_status' => $data['decision'],
            'kyc_verified_at' => $data['decision'] === 'verified' ? now() : null,
        ])->save();

        $audit->record('kyc.'.$data['decision'], $submission, $request->user(), ['user_id' => $user->id]);

        $user->notify(new ClerkoNotification(
            $data['decision'] === 'verified' ? 'Identity verified' : 'Identity verification unsuccessful',
            $data['decision'] === 'verified'
                ? 'Your identity has been verified. You now have full access to Clerko M&A.'
                : 'We could not verify your identity: '.$data['notes'].' You can submit new documents.',
            route('verification.show'),
        ));

        return redirect()->route('admin.kyc.index')->with('success', 'Decision recorded.');
    }
}
