<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/** Send each user to the workspace that fits what they are doing. */
class WorkspaceController extends Controller
{
    public function __invoke(Request $request): RedirectResponse
    {
        $user = $request->user();

        return match (true) {
            $user->is_admin => redirect()->route('admin.dashboard'),
            $user->companies()->exists() => redirect()->route('seller.dashboard'),
            default => redirect()->route('buyer.dashboard'),
        };
    }
}
