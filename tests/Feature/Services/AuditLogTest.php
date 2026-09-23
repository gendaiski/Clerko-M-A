<?php

namespace Tests\Feature\Services;

use App\Models\AuditEvent;
use App\Services\Audit\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use LogicException;
use Tests\TestCase;

class AuditLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_events_form_a_verifiable_chain_and_tampering_is_detected(): void
    {
        $audit = app(AuditLog::class);
        $first = $audit->record('one', properties: ['a' => 1]);
        $second = $audit->record('two', properties: ['b' => 2]);
        $audit->record('three');

        $this->assertNull($first->previous_hash);
        $this->assertSame($first->hash, $second->previous_hash);
        $this->assertNull($audit->verifyChain());

        // Editing through the model is refused outright…
        $this->expectException(LogicException::class);
        try {
            $second->update(['event' => 'edited']);
        } finally {
            // …and editing the table directly breaks the chain at that event.
            DB::table('audit_events')->where('id', $second->id)->update(['properties' => json_encode(['b' => 3])]);
            $this->assertSame($second->id, $audit->verifyChain());
        }
    }

    public function test_events_cannot_be_deleted(): void
    {
        $event = app(AuditLog::class)->record('one');

        $this->expectException(LogicException::class);
        $event->delete();
    }

    public function test_two_events_can_never_claim_the_same_predecessor(): void
    {
        $first = app(AuditLog::class)->record('one');

        $this->expectException(\Illuminate\Database\UniqueConstraintViolationException::class);
        AuditEvent::create([
            'event' => 'fork', 'previous_hash' => $first->previous_hash ?? 'x', 'hash' => 'y', 'created_at' => now(),
        ]);
        AuditEvent::create([
            'event' => 'fork-2', 'previous_hash' => $first->previous_hash ?? 'x', 'hash' => 'z', 'created_at' => now(),
        ]);
    }
}
