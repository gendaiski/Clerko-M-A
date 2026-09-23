<?php

namespace App\Http\Controllers\Buyer;

use App\Http\Controllers\Controller;
use App\Models\Engagement;
use App\Services\Nda\NdaSigner;
use App\Services\Nda\NdaTemplate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class NdaController extends Controller
{
    public function show(Request $request, Engagement $engagement, NdaTemplate $template): Response|RedirectResponse
    {
        Gate::authorize('view', $engagement);

        if ($engagement->hasSignedNda()) {
            return redirect()->route($engagement->hasUnlockedPack() ? 'engagements.pack' : 'engagements.unlock', $engagement);
        }

        $user = $request->user();

        return Inertia::render('buyer/nda', [
            'engagement' => ['id' => $engagement->id],
            'listing' => $engagement->listing->load('company')->toTeaser(),
            'nda' => $template->render($engagement->listing, $user),
            'kycStatus' => $user->kyc_status->value,
        ]);
    }

    public function sign(Request $request, Engagement $engagement, NdaSigner $signer): RedirectResponse
    {
        Gate::authorize('view', $engagement);

        $user = $request->user();
        if (! $user->isKycVerified()) {
            return back()->with('error', 'Your identity must be verified before you can sign the NDA.');
        }
        if ($engagement->hasSignedNda()) {
            return redirect()->route('engagements.unlock', $engagement);
        }

        $data = $request->validate([
            'signed_name' => ['required', 'string', 'max:150'],
            'agree' => ['accepted'],
        ]);

        $legalName = $user->latestKycSubmission?->full_legal_name;
        if ($legalName && mb_strtolower(trim($data['signed_name'])) !== mb_strtolower(trim($legalName))) {
            return back()->withErrors(['signed_name' => 'Please type your full legal name exactly as verified: '.$legalName.'.']);
        }

        $signer->sign($engagement, trim($data['signed_name']), $request);

        return redirect()->route('engagements.unlock', $engagement)
            ->with('success', 'NDA signed. The company\'s identity is now revealed to you.');
    }

    public function pdf(Engagement $engagement): StreamedResponse
    {
        Gate::authorize('view', $engagement);
        $signature = $engagement->ndaSignature;
        abort_unless($signature, 404);

        return Storage::disk(config('clerko.documents.disk'))
            ->download($signature->pdf_path, "Clerko-NDA-{$engagement->listing->reference}.pdf");
    }
}
