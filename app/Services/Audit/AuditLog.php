<?php

namespace App\Services\Audit;

use App\Models\AuditEvent;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

class AuditLog
{
    /**
     * Append an event to the hash-chained audit trail.
     *
     * @param  array<string, mixed>  $properties
     */
    public function record(
        string $event,
        ?Model $subject = null,
        ?User $actor = null,
        array $properties = [],
        ?int $listingId = null,
        ?int $dealRoomId = null,
    ): AuditEvent {
        $actor ??= auth()->user();

        for ($attempt = 1; ; $attempt++) {
            try {
                return $this->append($event, $subject, $actor, $properties, $listingId, $dealRoomId);
            } catch (UniqueConstraintViolationException $e) {
                // Another writer took the same predecessor first; re-read the tip and retry.
                if ($attempt >= 5) {
                    throw $e;
                }
                usleep(random_int(5_000, 25_000));
            }
        }
    }

    /**
     * @param  array<string, mixed>  $properties
     */
    private function append(string $event, ?Model $subject, ?User $actor, array $properties, ?int $listingId, ?int $dealRoomId): AuditEvent
    {
        return DB::transaction(function () use ($event, $subject, $actor, $properties, $listingId, $dealRoomId) {
            $previous = AuditEvent::query()->latest('id')->lockForUpdate()->first();

            $attributes = [
                'actor_id' => $actor?->id,
                'event' => $event,
                'subject_type' => $subject?->getMorphClass(),
                'subject_id' => $subject?->getKey(),
                'listing_id' => $listingId,
                'deal_room_id' => $dealRoomId,
                'properties' => $properties ?: null,
                'ip_address' => request()?->ip(),
                'previous_hash' => $previous?->hash,
                'created_at' => now(),
            ];
            $attributes['hash'] = self::hash($attributes);

            return AuditEvent::create($attributes);
        });
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public static function hash(array $attributes): string
    {
        return hash('sha256', json_encode([
            $attributes['previous_hash'],
            $attributes['event'],
            $attributes['actor_id'],
            $attributes['subject_type'],
            $attributes['subject_id'],
            $attributes['listing_id'],
            $attributes['deal_room_id'],
            $attributes['properties'],
            $attributes['created_at'] instanceof \DateTimeInterface
                ? $attributes['created_at']->format('Y-m-d H:i:s')
                : (string) $attributes['created_at'],
        ]));
    }

    /**
     * Recompute the chain and return the id of the first broken event, or null
     * when the whole trail is intact.
     */
    public function verifyChain(): ?int
    {
        $previousHash = null;

        foreach (AuditEvent::query()->orderBy('id')->lazy() as $event) {
            $attributes = $event->getAttributes();
            $attributes['properties'] = $event->properties;
            $attributes['created_at'] = $event->created_at;

            if ($event->previous_hash !== $previousHash || self::hash($attributes) !== $event->hash) {
                return $event->id;
            }
            $previousHash = $event->hash;
        }

        return null;
    }
}
