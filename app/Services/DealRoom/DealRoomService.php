<?php

namespace App\Services\DealRoom;

use App\Enums\EngagementStage;
use App\Enums\OfferStatus;
use App\Models\ComplianceFlag;
use App\Models\DealRoom;
use App\Models\DealRoomAnswer;
use App\Models\DealRoomQuestion;
use App\Models\Engagement;
use App\Models\HeadlineTerms;
use App\Models\ListingDocument;
use App\Models\Offer;
use App\Models\User;
use App\Notifications\ClerkoNotification;
use App\Services\Audit\AuditLog;
use App\Services\Compliance\ContactPolicy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DealRoomService
{
    public function __construct(
        private readonly AuditLog $audit,
        private readonly ContactPolicy $contactPolicy,
    ) {}

    public function open(Engagement $engagement, User $buyer): DealRoom
    {
        $room = DealRoom::firstOrCreate(['engagement_id' => $engagement->id]);

        if ($room->wasRecentlyCreated) {
            $engagement->advanceTo(EngagementStage::DealRoom);
            $this->record($room, 'deal_room.opened', $room, $buyer);
            $this->notifyCounterparty($room, $buyer, 'Deal room opened',
                "{$buyer->buyerLabel()} opened a deal room for listing {$engagement->listing->reference}.");
        }

        return $room;
    }

    // --- Q&A -----------------------------------------------------------------

    public function ask(DealRoom $room, User $user, string $category, string $body): DealRoomQuestion
    {
        $this->assertOpen($room);

        $question = DealRoomQuestion::create([
            'deal_room_id' => $room->id,
            'asked_by' => $user->id,
            'category' => $category,
            'body' => $this->screen($body),
        ]);
        $this->flagIfNeeded($room, $user, $question, $body);

        $this->touch($room);
        $this->record($room, 'deal_room.question_asked', $question, $user, ['category' => $category]);
        $this->notifyCounterparty($room, $user, 'New question in your deal room', 'A new question is waiting for your answer.');

        return $question;
    }

    public function answer(DealRoom $room, DealRoomQuestion $question, User $user, string $body): DealRoomAnswer
    {
        $this->assertOpen($room);

        $answer = DealRoomAnswer::create([
            'deal_room_question_id' => $question->id,
            'user_id' => $user->id,
            'body' => $this->screen($body),
        ]);
        $this->flagIfNeeded($room, $user, $answer, $body);

        if ($question->asked_by !== $user->id && $question->status === DealRoomQuestion::STATUS_OPEN) {
            $question->update(['status' => DealRoomQuestion::STATUS_ANSWERED]);
        }

        $this->touch($room);
        $this->record($room, 'deal_room.question_answered', $question, $user);
        $this->notifyCounterparty($room, $user, 'New reply in your deal room', 'There is a new reply to a deal room question.');

        return $answer;
    }

    public function closeQuestion(DealRoom $room, DealRoomQuestion $question, User $user): void
    {
        $question->update(['status' => DealRoomQuestion::STATUS_CLOSED]);
        $this->record($room, 'deal_room.question_closed', $question, $user);
    }

    // --- Documents -----------------------------------------------------------

    public function release(DealRoom $room, ListingDocument $document, User $seller): void
    {
        $this->assertOpen($room);

        if ($room->releasedDocuments()->whereKey($document->id)->exists()) {
            return;
        }

        $room->releasedDocuments()->attach($document->id, ['released_by' => $seller->id]);
        $this->touch($room);
        $this->record($room, 'deal_room.document_released', $document, $seller, ['title' => $document->title]);
        $this->notifyCounterparty($room, $seller, 'Document released', 'The seller released a new document in your deal room.');
    }

    // --- Offers & headline terms ----------------------------------------------

    /**
     * @param  array{price: float|string, structure: string, stake_pct: float|string, deposit_pct: float|string, conditions?: ?string, valid_until?: ?string}  $terms
     */
    public function makeOffer(DealRoom $room, User $user, array $terms, ?Offer $parent = null): Offer
    {
        $this->assertOpen($room);

        if ($room->headlineTerms) {
            throw ValidationException::withMessages(['offer' => 'Headline terms are already recorded for this deal room.']);
        }

        return DB::transaction(function () use ($room, $user, $terms, $parent) {
            $open = $room->offers()->where('status', OfferStatus::Open)->lockForUpdate()->first();

            if ($parent === null && $open) {
                throw ValidationException::withMessages(['offer' => 'There is already an open offer. Respond to it or withdraw it first.']);
            }
            if ($parent !== null) {
                if (! $open || $open->id !== $parent->id || $parent->made_by === $user->id) {
                    throw ValidationException::withMessages(['offer' => 'Only the open offer from the other party can be countered.']);
                }
                $parent->update(['status' => OfferStatus::Countered, 'responded_at' => now()]);
            }

            $party = $room->partyOf($user);
            $offer = Offer::create([
                'deal_room_id' => $room->id,
                'made_by' => $user->id,
                'party' => $party,
                'parent_offer_id' => $parent?->id,
                'price' => $terms['price'],
                'structure' => $terms['structure'],
                'stake_pct' => $terms['stake_pct'],
                'deposit_pct' => $terms['deposit_pct'],
                'conditions' => isset($terms['conditions']) ? $this->screen($terms['conditions']) : null,
                'valid_until' => $terms['valid_until'] ?? null,
            ]);

            $room->engagement->advanceTo(EngagementStage::Offer);
            $this->touch($room);
            $this->record($room, $parent ? 'deal_room.offer_countered' : 'deal_room.offer_submitted', $offer, $user, [
                'price' => (float) $offer->price,
                'structure' => $offer->structure,
                'stake_pct' => (float) $offer->stake_pct,
                'deposit_pct' => (float) $offer->deposit_pct,
            ]);
            $this->notifyCounterparty($room, $user, $parent ? 'Counter-offer received' : 'Indicative offer received',
                'There is a new offer in your deal room awaiting your response.');

            return $offer;
        });
    }

    public function respondToOffer(DealRoom $room, Offer $offer, User $user, string $decision): void
    {
        $this->assertOpen($room);

        DB::transaction(function () use ($room, $offer, $user, $decision) {
            $offer = Offer::query()->lockForUpdate()->findOrFail($offer->id);

            if ($offer->status !== OfferStatus::Open) {
                throw ValidationException::withMessages(['offer' => 'This offer is no longer open.']);
            }

            if ($decision === 'withdraw') {
                if ($offer->made_by !== $user->id) {
                    throw ValidationException::withMessages(['offer' => 'Only the party who made the offer can withdraw it.']);
                }
                $offer->update(['status' => OfferStatus::Withdrawn, 'responded_at' => now()]);
                $this->record($room, 'deal_room.offer_withdrawn', $offer, $user);

                return;
            }

            if ($offer->made_by === $user->id) {
                throw ValidationException::withMessages(['offer' => 'You cannot respond to your own offer.']);
            }

            if ($decision === 'reject') {
                $offer->update(['status' => OfferStatus::Rejected, 'responded_at' => now()]);
                $this->record($room, 'deal_room.offer_rejected', $offer, $user);
                $this->notifyCounterparty($room, $user, 'Offer declined', 'Your offer was declined. You can submit a revised offer.');

                return;
            }

            $offer->update(['status' => OfferStatus::Accepted, 'responded_at' => now()]);
            $party = $room->partyOf($user);

            HeadlineTerms::create([
                'deal_room_id' => $room->id,
                'offer_id' => $offer->id,
                'price' => $offer->price,
                'structure' => $offer->structure,
                'stake_pct' => $offer->stake_pct,
                'deposit_pct' => $offer->deposit_pct,
                'conditions' => $offer->conditions,
                // Accepting counts as the accepting party's confirmation.
                $party.'_acknowledged_at' => now(),
            ]);

            $this->record($room, 'deal_room.offer_accepted', $offer, $user, ['price' => (float) $offer->price]);
            $this->notifyCounterparty($room, $user, 'Offer accepted',
                'Your offer was accepted. Please confirm the headline terms in the deal room.');
        });
    }

    public function acknowledgeTerms(DealRoom $room, HeadlineTerms $terms, User $user): void
    {
        $party = $room->partyOf($user);
        $column = $party.'_acknowledged_at';

        if ($terms->{$column} !== null) {
            return;
        }

        $terms->update([$column => now()]);
        $this->record($room, 'deal_room.terms_acknowledged', $terms, $user, ['party' => $party]);

        if ($terms->fresh()->isAgreed()) {
            $room->update(['status' => DealRoom::STATUS_TERMS_AGREED]);
            $room->engagement->advanceTo(EngagementStage::HeadlineTerms);
            $this->record($room, 'deal_room.headline_terms_agreed', $terms, $user, [
                'price' => (float) $terms->price,
                'structure' => $terms->structure,
                'deposit_pct' => (float) $terms->deposit_pct,
            ]);
            $this->notifyCounterparty($room, $user, 'Headline terms agreed', 'Both parties have confirmed the headline terms.');
        }
    }

    // --- Room lifecycle & agent ------------------------------------------------

    public function withdraw(DealRoom $room, User $user, string $reason): void
    {
        $this->assertOpen($room);

        DB::transaction(function () use ($room, $user, $reason) {
            $room->offers()->where('status', OfferStatus::Open)->update(['status' => OfferStatus::Withdrawn, 'responded_at' => now()]);
            $room->update(['status' => DealRoom::STATUS_CLOSED]);
            $room->engagement->update(['stage' => EngagementStage::Withdrawn, 'last_activity_at' => now()]);
            $this->record($room, 'deal_room.withdrawn', $room, $user, [
                'party' => $room->partyOf($user),
                'reason' => $reason,
            ]);
        });

        $this->notifyCounterparty($room, $user, 'Deal room closed', 'The other party has withdrawn from the deal room.');
    }

    public function setAgentOptIn(DealRoom $room, User $user, bool $optIn): void
    {
        $column = 'agent_opt_in_'.$room->partyOf($user).'_at';
        $room->update([$column => $optIn ? now() : null]);
        $this->record($room, $optIn ? 'deal_room.agent_opted_in' : 'deal_room.agent_opted_out', $room, $user);
    }

    // --- Helpers ----------------------------------------------------------------

    private function screen(string $text): string
    {
        return $this->contactPolicy->scan($text)['clean'];
    }

    private function flagIfNeeded(DealRoom $room, User $user, Model $subject, string $original): void
    {
        $matches = $this->contactPolicy->scan($original)['matches'];
        if ($matches === []) {
            return;
        }

        ComplianceFlag::create([
            'deal_room_id' => $room->id,
            'subject_type' => $subject->getMorphClass(),
            'subject_id' => $subject->getKey(),
            'user_id' => $user->id,
            'rule' => ComplianceFlag::RULE_OFF_PLATFORM_CONTACT,
            'excerpt' => mb_substr($original, 0, 1000),
        ]);
        $this->record($room, 'compliance.flagged', $subject, $user, ['rule' => ComplianceFlag::RULE_OFF_PLATFORM_CONTACT]);
    }

    private function assertOpen(DealRoom $room): void
    {
        if (! $room->isOpen()) {
            throw ValidationException::withMessages(['deal_room' => 'This deal room is closed.']);
        }
    }

    private function touch(DealRoom $room): void
    {
        $room->touch();
        $room->engagement->update(['last_activity_at' => now()]);
    }

    /**
     * @param  array<string, mixed>  $properties
     */
    private function record(DealRoom $room, string $event, ?Model $subject, User $user, array $properties = []): void
    {
        $this->audit->record($event, $subject, $user, $properties,
            listingId: $room->engagement->listing_id, dealRoomId: $room->id);
    }

    private function notifyCounterparty(DealRoom $room, User $actor, string $title, string $body): void
    {
        $counterparty = $room->partyOf($actor) === 'buyer' ? $room->seller() : $room->buyer();
        $counterparty->notify(new ClerkoNotification($title, $body, route('deal-rooms.show', $room)));
    }
}
