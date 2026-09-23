<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Services\Audit\AuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditController extends Controller
{
    public function index(Request $request, AuditLog $audit): Response
    {
        return Inertia::render('admin/audit', [
            'events' => AuditEvent::query()
                ->with('actor')
                ->when($request->query('event'), fn ($q, $e) => $q->where('event', 'like', $e.'%'))
                ->latest('id')
                ->paginate(50)
                ->appends($request->only('event'))
                ->through(fn (AuditEvent $e) => [
                    'id' => $e->id,
                    'event' => $e->event,
                    'actor' => $e->actor?->name,
                    'subject' => $e->subject_type ? class_basename($e->subject_type).' #'.$e->subject_id : null,
                    'properties' => $e->properties,
                    'ip_address' => $e->ip_address,
                    'hash' => substr($e->hash, 0, 12),
                    'created_at' => $e->created_at->toIso8601String(),
                ]),
            'chainBrokenAt' => $request->boolean('verify') ? ($audit->verifyChain() ?? 0) : null,
            'filter' => $request->query('event'),
        ]);
    }
}
