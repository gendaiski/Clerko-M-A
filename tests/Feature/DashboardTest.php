<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_users_are_sent_to_the_workspace_that_fits_them()
    {
        $this->actingAs(User::factory()->create())->get('/dashboard')->assertRedirect(route('buyer.dashboard'));

        $seller = Company::factory()->create()->owner;
        $this->actingAs($seller)->get('/dashboard')->assertRedirect(route('seller.dashboard'));

        $this->actingAs(User::factory()->admin()->create())->get('/dashboard')->assertRedirect(route('admin.dashboard'));
    }

    public function test_workspaces_render()
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('buyer.dashboard'))->assertOk();
        $this->actingAs($user)->get(route('seller.dashboard'))->assertOk();
        $this->actingAs($user)->get(route('admin.dashboard'))->assertForbidden();
        $this->actingAs(User::factory()->admin()->create())->get(route('admin.dashboard'))->assertOk();
    }
}
