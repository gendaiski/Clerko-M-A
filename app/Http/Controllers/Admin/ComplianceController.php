<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ComplianceFlag;
use App\Services\Audit\AuditLog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ComplianceController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->query('status', ComplianceFlag::STATUS_OPEN);

        return Inertia::render('admin/compliance', [
            'flags' => ComplianceFlag::query()
                ->with(['user', 'dealRoom.engagement.listing.company', 'dealRoom.engagement.buyer'])
                ->when($status !== 'all', fn ($q) => $q->where('status', $status))
                ->latest()
                ->paginate(25)
                ->withQueryString()
                ->through(fn (ComplianceFlag $f) => [
                    'id' => $f->id,
                    'rule' => $f->rule,
                    'excerpt' => $f->excerpt,
                    'status' => $f->status,
                    'user' => $f->user?->only('name', 'email'),
                    'deal_room_id' => $f->deal_room_id,
                    'deal' => $f->dealRoom ? $f->dealRoom->engagement->listing->company->name_en.' × '.$f->dealRoom->engagement->buyer->buyerLabel() : null,
                    'created_at' => $f->created_at->toIso8601String(),
                ]),
            'status' => $status,
        ]);
    }

    public function update(Request $request, ComplianceFlag $flag, AuditLog $audit): RedirectResponse
    {
        $data = $request->validate(['status' => ['required', 'in:cleared,actioned']]);

        $flag->update([
            'status' => $data['status'],
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);
        $audit->record('compliance.'.$data['status'], $flag, $request->user(), dealRoomId: $flag->deal_room_id);

        return back()->with('success', 'Flag updated.');
    }
}
