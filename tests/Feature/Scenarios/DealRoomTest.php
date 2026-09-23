<?php

namespace Tests\Feature\Scenarios;

use App\Enums\EngagementStage;
use App\Models\ComplianceFlag;
use App\Models\DealRoom;
use App\Models\Engagement;
use App\Models\Listing;
use App\Models\ListingDocument;
use App\Models\Offer;
use App\Models\User;
use App\Services\Audit\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Scenario 3: Q&A, staged documents, offers and counter-offers, to headline
 * terms confirmed by both parties.
 */
class DealRoomTest extends TestCase
{
    use RefreshDatabase;

    private User $buyer;

    private User $seller;

    private Engagement $engagement;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');

        $listing = Listing::factory()->live()->create();
        $this->seller = $listing->seller;
        $this->buyer = User::factory()->kycVerified()->create();
        $this->engagement = Engagement::create([
            'listing_id' => $listing->id,
            'buyer_id' => $this->buyer->id,
            'stage' => EngagementStage::PackUnlocked,
            'nda_signed_at' => now(),
            'pack_unlocked_at' => now(),
            'unlock_method' => 'per_company',
        ]);
    }

    public function test_parties_reach_agreed_headline_terms(): void
    {
        $this->actingAs($this->buyer)->post(route('engagements.deal-room', $this->engagement))->assertRedirect();
        $room = DealRoom::sole();
        $this->get(route('deal-rooms.show', $room))->assertOk();

        // Q&A.
        $this->post(route('deal-rooms.questions.store', $room), [
            'category' => 'financial',
            'body' => 'Can you confirm churn over the last 12 months?',
        ])->assertRedirect();
        $question = $room->questions()->sole();

        $this->actingAs($this->seller)->post(route('deal-rooms.questions.answer', [$room, $question]), [
            'body' => 'Gross churn was 6%. I have released the cohort analysis.',
        ])->assertRedirect();
        $this->assertSame('answered', $question->fresh()->status);

        // Seller uploads a staged document straight into the room.
        $this->post(route('deal-rooms.documents.upload', $room), [
            'title' => 'Cohort & churn analysis',
            'category' => 'financials',
            'file' => UploadedFile::fake()->create('cohort.xlsx', 20),
        ])->assertRedirect();
        $document = ListingDocument::where('visibility', 'staged')->sole();
        $this->actingAs($this->buyer)->get(route('deal-rooms.documents.show', [$room, $document]))->assertOk();

        // Buyer offers, seller counters, buyer accepts.
        $this->post(route('deal-rooms.offers.store', $room), [
            'price' => 8000000, 'structure' => 'full_acquisition', 'stake_pct' => 100, 'deposit_pct' => 50,
            'conditions' => 'Subject to due diligence',
        ])->assertRedirect();
        $offer = Offer::sole();

        // A second open offer is not allowed.
        $this->post(route('deal-rooms.offers.store', $room), [
            'price' => 8100000, 'structure' => 'full_acquisition', 'stake_pct' => 100, 'deposit_pct' => 50,
        ])->assertSessionHasErrors('offer');

        // The buyer cannot accept their own offer.
        $this->post(route('deal-rooms.offers.respond', [$room, $offer]), ['decision' => 'accept'])
            ->assertSessionHasErrors('offer');

        $this->actingAs($this->seller)->post(route('deal-rooms.offers.counter', [$room, $offer]), [
            'price' => 8250000, 'structure' => 'full_acquisition', 'stake_pct' => 100, 'deposit_pct' => 50,
        ])->assertRedirect();
        $counter = Offer::where('parent_offer_id', $offer->id)->sole();
        $this->assertSame('countered', $offer->fresh()->status->value);

        $this->actingAs($this->buyer)->post(route('deal-rooms.offers.respond', [$room, $counter]), ['decision' => 'accept'])
            ->assertRedirect();

        $terms = $room->fresh()->headlineTerms;
        $this->assertEquals(8250000, (float) $terms->price);
        $this->assertNotNull($terms->buyer_acknowledged_at);
        $this->assertFalse($terms->isAgreed());

        $this->actingAs($this->seller)->post(route('deal-rooms.terms.acknowledge', $room))->assertRedirect();

        $this->assertTrue($terms->fresh()->isAgreed());
        $this->assertSame(DealRoom::STATUS_TERMS_AGREED, $room->fresh()->status);
        $this->assertSame(EngagementStage::HeadlineTerms, $this->engagement->fresh()->stage);

        // The audit trail recorded it all and the hash chain is intact.
        $this->assertDatabaseHas('audit_events', ['event' => 'deal_room.headline_terms_agreed', 'deal_room_id' => $room->id]);
        $this->assertNull(app(AuditLog::class)->verifyChain());
    }

    public function test_off_platform_contact_is_redacted_and_flagged(): void
    {
        $this->actingAs($this->buyer)->post(route('engagements.deal-room', $this->engagement));
        $room = DealRoom::sole();

        $this->post(route('deal-rooms.questions.store', $room), [
            'category' => 'other',
            'body' => 'Easier to talk directly — email me at buyer@example.com or WhatsApp +973 3312 3456.',
        ]);

        $question = $room->questions()->sole();
        $this->assertStringNotContainsString('buyer@example.com', $question->body);
        $this->assertStringNotContainsString('3312 3456', $question->body);
        $this->assertSame(1, ComplianceFlag::count());
    }

    public function test_outsiders_cannot_enter_and_admins_can_only_observe(): void
    {
        $this->actingAs($this->buyer)->post(route('engagements.deal-room', $this->engagement));
        $room = DealRoom::sole();

        $this->actingAs(User::factory()->create())->get(route('deal-rooms.show', $room))->assertForbidden();

        $admin = User::factory()->admin()->create();
        $this->actingAs($admin)->get(route('deal-rooms.show', $room))->assertOk();
        $this->post(route('deal-rooms.questions.store', $room), ['category' => 'other', 'body' => 'Hi'])->assertForbidden();
    }

    public function test_agent_needs_both_parties_to_opt_in(): void
    {
        $this->actingAs($this->buyer)->post(route('engagements.deal-room', $this->engagement));
        $room = DealRoom::sole();

        $this->post(route('deal-rooms.agent.opt-in', $room), ['opt_in' => true]);
        $this->assertFalse($room->fresh()->agentEnabled());
        $this->post(route('deal-rooms.agent.summary', $room))->assertSessionHas('error');

        $this->actingAs($this->seller)->post(route('deal-rooms.agent.opt-in', $room), ['opt_in' => true]);
        $this->assertTrue($room->fresh()->agentEnabled());
    }

    public function test_withdrawing_closes_the_room(): void
    {
        $this->actingAs($this->buyer)->post(route('engagements.deal-room', $this->engagement));
        $room = DealRoom::sole();

        $this->post(route('deal-rooms.withdraw', $room), ['reason' => 'Not a strategic fit'])->assertRedirect();

        $this->assertSame(DealRoom::STATUS_CLOSED, $room->fresh()->status);
        $this->post(route('deal-rooms.questions.store', $room), ['category' => 'other', 'body' => 'Still there?'])
            ->assertSessionHasErrors('deal_room');
    }
}
