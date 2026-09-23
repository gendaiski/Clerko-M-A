<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Seller\DocumentController;
use App\Models\AuditEvent;
use App\Models\DealRoom;
use App\Models\DealRoomQuestion;
use App\Models\Engagement;
use App\Models\HeadlineTerms;
use App\Models\Listing;
use App\Models\ListingDocument;
use App\Models\Offer;
use App\Services\Agent\ClerkoAgent;
use App\Services\DealRoom\DealRoomService;
use App\Services\Documents\DocumentServer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;
use Throwable;

class DealRoomController extends Controller
{
    public function __construct(private readonly DealRoomService $rooms) {}

    public function open(Request $request, Engagement $engagement): RedirectResponse
    {
        Gate::authorize('viewPack', $engagement);

        $room = $this->rooms->open($engagement, $request->user());

        return redirect()->route('deal-rooms.show', $room);
    }

    public function show(Request $request, DealRoom $dealRoom): Response
    {
        Gate::authorize('view', $dealRoom);

        $user = $request->user();
        $room = $dealRoom->load([
            'engagement.listing.company', 'engagement.listing.documents', 'engagement.buyer',
            'questions.answers', 'offers', 'releasedDocuments', 'headlineTerms', 'latestAgentSummary',
        ]);
        $engagement = $room->engagement;
        $listing = $engagement->listing;
        $party = $room->partyOf($user);
        $who = fn (int $userId) => $userId === $listing->seller_id ? 'seller' : 'buyer';

        $packDocuments = $listing->documents->where('visibility', ListingDocument::VISIBILITY_PACK);
        $releasedIds = $room->releasedDocuments->pluck('id');
        $documentRow = fn (ListingDocument $d, string $source) => [
            'id' => $d->id,
            'title' => $d->title,
            'category' => Listing::DOCUMENT_CATEGORIES[$d->category] ?? $d->category,
            'is_pdf' => $d->isPdf(),
            'source' => $source,
            'released_at' => $d->pivot?->created_at?->toIso8601String(),
        ];

        return Inertia::render('deal-room/show', [
            'room' => [
                'id' => $room->id,
                'status' => $room->status,
                'is_open' => $room->isOpen(),
                'created_at' => $room->created_at->toIso8601String(),
            ],
            'viewer' => [
                'party' => $party,
                'is_admin_observer' => $party === null,
            ],
            'deal' => [
                'engagement_id' => $engagement->id,
                'stage' => $engagement->stage->value,
                'stage_label' => $engagement->stage->label(),
                'company_name' => $listing->company->name_en,
                'listing_reference' => $listing->reference,
                'buyer_label' => $engagement->buyer->buyerLabel(),
                'buyer_type' => $engagement->buyer->buyer_type,
                'asking_price' => (float) $listing->asking_price,
                'deal_preference' => $listing->deal_preference,
            ],
            'questions' => $room->questions->sortByDesc('id')->values()->map(fn (DealRoomQuestion $q) => [
                'id' => $q->id,
                'from' => $who($q->asked_by),
                'category' => $q->category,
                'body' => $q->body,
                'status' => $q->status,
                'created_at' => $q->created_at->toIso8601String(),
                'answers' => $q->answers->map(fn ($a) => [
                    'id' => $a->id,
                    'from' => $who($a->user_id),
                    'body' => $a->body,
                    'created_at' => $a->created_at->toIso8601String(),
                ]),
            ]),
            'documents' => [
                'pack' => $packDocuments->values()->map(fn ($d) => $documentRow($d, 'pack')),
                'released' => $room->releasedDocuments->map(fn ($d) => $documentRow($d, 'released')),
                // Staged documents the seller has not yet released to this buyer.
                'staged' => $party === 'seller'
                    ? $listing->documents->where('visibility', ListingDocument::VISIBILITY_STAGED)
                        ->whereNotIn('id', $releasedIds)->values()->map(fn ($d) => $documentRow($d, 'staged'))
                    : [],
            ],
            'offers' => $room->offers->sortByDesc('id')->values()->map(fn (Offer $o) => [
                'id' => $o->id,
                'from' => $o->party,
                'price' => (float) $o->price,
                'structure' => $o->structure,
                'stake_pct' => (float) $o->stake_pct,
                'deposit_pct' => (float) $o->deposit_pct,
                'conditions' => $o->conditions,
                'valid_until' => $o->valid_until?->toDateString(),
                'status' => $o->status->value,
                'is_counter' => $o->parent_offer_id !== null,
                'created_at' => $o->created_at->toIso8601String(),
            ]),
            'terms' => $room->headlineTerms ? [
                'id' => $room->headlineTerms->id,
                'price' => (float) $room->headlineTerms->price,
                'structure' => $room->headlineTerms->structure,
                'stake_pct' => (float) $room->headlineTerms->stake_pct,
                'deposit_pct' => (float) $room->headlineTerms->deposit_pct,
                'conditions' => $room->headlineTerms->conditions,
                'buyer_acknowledged_at' => $room->headlineTerms->buyer_acknowledged_at?->toIso8601String(),
                'seller_acknowledged_at' => $room->headlineTerms->seller_acknowledged_at?->toIso8601String(),
                'agreed' => $room->headlineTerms->isAgreed(),
            ] : null,
            'agent' => [
                'available' => (bool) config('clerko.agent.enabled'),
                'buyer_opted_in' => $room->agent_opt_in_buyer_at !== null,
                'seller_opted_in' => $room->agent_opt_in_seller_at !== null,
                'enabled' => $room->agentEnabled(),
                'summary' => $room->latestAgentSummary ? [
                    'summary' => $room->latestAgentSummary->summary,
                    'open_points' => $room->latestAgentSummary->open_points,
                    'buyer_focus' => $room->latestAgentSummary->buyer_focus,
                    'seller_focus' => $room->latestAgentSummary->seller_focus,
                    'created_at' => $room->latestAgentSummary->created_at->toIso8601String(),
                ] : null,
            ],
            'audit' => AuditEvent::query()
                ->where('deal_room_id', $room->id)
                ->latest('id')
                ->limit(200)
                ->get()
                ->map(fn (AuditEvent $e) => [
                    'id' => $e->id,
                    'event' => $e->event,
                    'by' => $e->actor_id ? $who($e->actor_id) : 'system',
                    'properties' => collect($e->properties ?? [])->except('reason')->all(),
                    'created_at' => $e->created_at->toIso8601String(),
                ]),
            'options' => [
                'question_categories' => DealRoom::QUESTION_CATEGORIES,
                'structures' => Offer::STRUCTURES,
                'document_categories' => Listing::DOCUMENT_CATEGORIES,
            ],
        ]);
    }

    public function ask(Request $request, DealRoom $dealRoom): RedirectResponse
    {
        Gate::authorize('participate', $dealRoom);

        $data = $request->validate([
            'category' => ['required', Rule::in(array_keys(DealRoom::QUESTION_CATEGORIES))],
            'body' => ['required', 'string', 'max:4000'],
        ]);

        $this->rooms->ask($dealRoom, $request->user(), $data['category'], $data['body']);

        return back()->with('success', 'Question posted.');
    }

    public function answer(Request $request, DealRoom $dealRoom, DealRoomQuestion $question): RedirectResponse
    {
        Gate::authorize('participate', $dealRoom);
        abort_unless($question->deal_room_id === $dealRoom->id, 404);

        $data = $request->validate(['body' => ['required', 'string', 'max:4000']]);
        $this->rooms->answer($dealRoom, $question, $request->user(), $data['body']);

        return back()->with('success', 'Reply posted.');
    }

    public function closeQuestion(Request $request, DealRoom $dealRoom, DealRoomQuestion $question): RedirectResponse
    {
        Gate::authorize('participate', $dealRoom);
        abort_unless($question->deal_room_id === $dealRoom->id, 404);
        abort_unless($question->asked_by === $request->user()->id, 403, 'Only the person who asked can close a question.');

        $this->rooms->closeQuestion($dealRoom, $question, $request->user());

        return back();
    }

    public function release(Request $request, DealRoom $dealRoom, ListingDocument $document): RedirectResponse
    {
        Gate::authorize('releaseDocuments', $dealRoom);
        abort_unless($document->listing_id === $dealRoom->engagement->listing_id, 404);

        $this->rooms->release($dealRoom, $document, $request->user());

        return back()->with('success', 'Document released to the buyer.');
    }

    /** The seller uploads a document straight into this deal room. */
    public function upload(Request $request, DealRoom $dealRoom): RedirectResponse
    {
        Gate::authorize('releaseDocuments', $dealRoom);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'category' => ['required', Rule::in(array_keys(Listing::DOCUMENT_CATEGORIES))],
            'file' => ['required', 'file', 'mimes:pdf,xlsx,xls,csv,docx,doc,pptx,jpg,jpeg,png', 'max:'.config('clerko.documents.max_upload_kb')],
        ]);

        $document = DocumentController::storeDocument($request, $dealRoom->engagement->listing, [
            ...$data,
            'visibility' => ListingDocument::VISIBILITY_STAGED,
        ]);
        $this->rooms->release($dealRoom, $document, $request->user());

        return back()->with('success', 'Document uploaded and released to the buyer.');
    }

    public function document(Request $request, DealRoom $dealRoom, ListingDocument $document, DocumentServer $server): HttpResponse
    {
        Gate::authorize('view', $dealRoom);
        $engagement = $dealRoom->engagement;
        abort_unless($document->listing_id === $engagement->listing_id, 404);

        $party = $dealRoom->partyOf($request->user());
        $visible = $party === 'seller'
            || $document->visibility === ListingDocument::VISIBILITY_PACK
            || $dealRoom->releasedDocuments()->whereKey($document->id)->exists();
        abort_unless($visible, 403);

        return $server->serve($document, $request->user(), $party === 'buyer' ? $engagement : null, $request, $request->boolean('download'));
    }

    public function offer(Request $request, DealRoom $dealRoom): RedirectResponse
    {
        Gate::authorize('participate', $dealRoom);

        $this->rooms->makeOffer($dealRoom, $request->user(), $this->validatedOffer($request));

        return back()->with('success', 'Offer submitted.');
    }

    public function counter(Request $request, DealRoom $dealRoom, Offer $offer): RedirectResponse
    {
        Gate::authorize('participate', $dealRoom);
        abort_unless($offer->deal_room_id === $dealRoom->id, 404);

        $this->rooms->makeOffer($dealRoom, $request->user(), $this->validatedOffer($request), $offer);

        return back()->with('success', 'Counter-offer submitted.');
    }

    public function respond(Request $request, DealRoom $dealRoom, Offer $offer): RedirectResponse
    {
        Gate::authorize('participate', $dealRoom);
        abort_unless($offer->deal_room_id === $dealRoom->id, 404);

        $decision = $request->validate(['decision' => ['required', 'in:accept,reject,withdraw']])['decision'];
        $this->rooms->respondToOffer($dealRoom, $offer, $request->user(), $decision);

        return back()->with('success', match ($decision) {
            'accept' => 'Offer accepted. Headline terms are ready to confirm.',
            'reject' => 'Offer declined.',
            'withdraw' => 'Offer withdrawn.',
        });
    }

    public function acknowledge(Request $request, DealRoom $dealRoom): RedirectResponse
    {
        Gate::authorize('participate', $dealRoom);
        /** @var HeadlineTerms $terms */
        $terms = $dealRoom->headlineTerms()->firstOrFail();

        $this->rooms->acknowledgeTerms($dealRoom, $terms, $request->user());

        return back()->with('success', 'Headline terms confirmed.');
    }

    public function withdraw(Request $request, DealRoom $dealRoom): RedirectResponse
    {
        Gate::authorize('participate', $dealRoom);

        $data = $request->validate(['reason' => ['required', 'string', 'max:1000']]);
        $this->rooms->withdraw($dealRoom, $request->user(), $data['reason']);

        return back()->with('success', 'You have withdrawn from this deal room.');
    }

    public function agentOptIn(Request $request, DealRoom $dealRoom): RedirectResponse
    {
        Gate::authorize('participate', $dealRoom);

        $optIn = $request->validate(['opt_in' => ['required', 'boolean']])['opt_in'];
        $this->rooms->setAgentOptIn($dealRoom, $request->user(), $optIn);

        return back();
    }

    public function agentSummary(Request $request, DealRoom $dealRoom, ClerkoAgent $agent): RedirectResponse
    {
        Gate::authorize('participate', $dealRoom);

        if (! $dealRoom->agentEnabled()) {
            return back()->with('error', 'The Clerko Agent needs both parties to switch it on.');
        }

        $key = 'agent-summary:'.$dealRoom->id;
        if (RateLimiter::tooManyAttempts($key, 1)) {
            return back()->with('error', 'A summary was generated recently. Please try again in a few minutes.');
        }
        RateLimiter::hit($key, 300);

        try {
            $agent->summarise($dealRoom, $request->user());
        } catch (Throwable $e) {
            report($e);
            RateLimiter::clear($key);

            return back()->with('error', 'The Clerko Agent is unavailable right now. Please try again shortly.');
        }

        return back()->with('success', 'Clerko Agent summary updated.');
    }

    /**
     * @return array{price: string, structure: string, stake_pct: string, deposit_pct: string, conditions: ?string, valid_until: ?string}
     */
    private function validatedOffer(Request $request): array
    {
        return $request->validate([
            'price' => ['required', 'numeric', 'gt:0', 'max:999999999999'],
            'structure' => ['required', Rule::in(array_keys(Offer::STRUCTURES))],
            'stake_pct' => ['required', 'numeric', 'gt:0', 'max:100'],
            'deposit_pct' => ['required', 'numeric', 'min:0', 'max:100'],
            'conditions' => ['nullable', 'string', 'max:2000'],
            'valid_until' => ['nullable', 'date', 'after_or_equal:today'],
        ]);
    }
}
