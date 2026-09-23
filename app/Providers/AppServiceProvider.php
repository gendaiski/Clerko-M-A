<?php

namespace App\Providers;

use App\Models\DealRoom;
use App\Models\User;
use App\Policies\DealRoomPolicy;
use App\Services\Extraction\ExtractaExtractor;
use App\Services\Extraction\FakeExtractor;
use App\Services\Extraction\ProfileExtractor;
use App\Services\Payments\FakeGateway;
use App\Services\Payments\PaymentGateway;
use App\Services\Payments\TapGateway;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use RuntimeException;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(PaymentGateway::class, function ($app) {
            return match (config('clerko.payments.driver')) {
                'tap' => new TapGateway(
                    (string) config('clerko.payments.tap.secret_key'),
                    (string) config('clerko.payments.tap.base_url'),
                ),
                'fake' => $app->isProduction()
                    ? throw new RuntimeException('The fake payment driver cannot be used in production.')
                    : new FakeGateway,
            };
        });

        $this->app->bind(ProfileExtractor::class, function () {
            return match (config('clerko.extraction.driver')) {
                'extracta' => new ExtractaExtractor(
                    (string) config('clerko.extraction.extracta.api_key'),
                    (string) config('clerko.extraction.extracta.base_url'),
                    (string) config('clerko.extraction.extracta.extraction_id'),
                ),
                'fake' => new FakeExtractor,
            };
        });
    }

    public function boot(): void
    {
        Model::preventAccessingMissingAttributes(! $this->app->isProduction());

        Gate::define('admin', fn (User $user) => $user->is_admin);
        Gate::policy(DealRoom::class, DealRoomPolicy::class);
    }
}
