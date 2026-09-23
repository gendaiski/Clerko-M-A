<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\Buyer;
use App\Http\Controllers\DealRoomController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\MarketplaceController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\PricingController;
use App\Http\Controllers\Seller;
use App\Http\Controllers\VerificationController;
use App\Http\Controllers\WorkspaceController;
use Illuminate\Support\Facades\Route;

// --- Public -------------------------------------------------------------------
Route::get('/', HomeController::class)->name('home');
Route::get('pricing', PricingController::class)->name('pricing');
Route::get('marketplace', [MarketplaceController::class, 'index'])->name('marketplace.index');
Route::get('marketplace/{listing:reference}', [MarketplaceController::class, 'show'])->name('marketplace.show');

// Tap server-to-server notification (CSRF-exempt, see bootstrap/app.php).
Route::post('payments/webhook', [PaymentController::class, 'webhook'])->name('payments.webhook');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', WorkspaceController::class)->name('dashboard');

    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('notifications/{id}', [NotificationController::class, 'open'])->name('notifications.open');
    Route::post('notifications/read-all', [NotificationController::class, 'readAll'])->name('notifications.read-all');

    // Identity verification (KYC)
    Route::get('verification', [VerificationController::class, 'show'])->name('verification.show');
    Route::post('verification', [VerificationController::class, 'store'])->name('verification.store');

    // Payments
    Route::get('payments/{payment}/return', [PaymentController::class, 'return'])->name('payments.return');
    Route::get('payments/{payment}/fake-checkout', [PaymentController::class, 'fakeCheckout'])->name('payments.fake-checkout');
    Route::post('payments/{payment}/fake-checkout', [PaymentController::class, 'fakeComplete'])->name('payments.fake-complete');

    // --- Scenario 1: Seller ---------------------------------------------------
    Route::prefix('seller')->name('seller.')->group(function () {
        Route::get('/', Seller\DashboardController::class)->name('dashboard');

        Route::get('companies/create', [Seller\CompanyController::class, 'create'])->name('companies.create');
        Route::post('companies', [Seller\CompanyController::class, 'store'])->name('companies.store');
        Route::get('companies/{company}', [Seller\CompanyController::class, 'show'])->name('companies.show');
        Route::post('companies/{company}/retry', [Seller\CompanyController::class, 'retry'])->name('companies.retry');
        Route::get('companies/{company}/cr-pdf', [Seller\CompanyController::class, 'crPdf'])->name('companies.cr-pdf');

        Route::get('listings/create', [Seller\ListingController::class, 'create'])->name('listings.create');
        Route::post('listings', [Seller\ListingController::class, 'store'])->name('listings.store');
        Route::get('listings/{listing}', [Seller\ListingController::class, 'show'])->name('listings.show');
        Route::get('listings/{listing}/edit', [Seller\ListingController::class, 'edit'])->name('listings.edit');
        Route::put('listings/{listing}', [Seller\ListingController::class, 'update'])->name('listings.update');
        Route::post('listings/{listing}/submit', [Seller\ListingController::class, 'submit'])->name('listings.submit');
        Route::get('listings/{listing}/tier', [Seller\TierController::class, 'show'])->name('listings.tier');
        Route::post('listings/{listing}/tier', [Seller\TierController::class, 'store'])->name('listings.tier.store');

        Route::post('listings/{listing}/documents', [Seller\DocumentController::class, 'store'])->name('listings.documents.store');
        Route::get('listings/{listing}/documents/{document}', [Seller\DocumentController::class, 'show'])->name('listings.documents.show');
        Route::delete('listings/{listing}/documents/{document}', [Seller\DocumentController::class, 'destroy'])->name('listings.documents.destroy');
    });

    // --- Scenario 2: Buyer ----------------------------------------------------
    Route::prefix('buyer')->name('buyer.')->group(function () {
        Route::get('/', Buyer\DashboardController::class)->name('dashboard');
        Route::get('preferences', [Buyer\PreferenceController::class, 'edit'])->name('preferences.edit');
        Route::put('preferences', [Buyer\PreferenceController::class, 'update'])->name('preferences.update');
        Route::post('premium', [Buyer\UnlockController::class, 'subscribe'])->name('premium.subscribe');
    });

    Route::post('marketplace/{listing:reference}/access', [Buyer\EngagementController::class, 'store'])->name('engagements.store');

    Route::prefix('engagements/{engagement}')->name('engagements.')->group(function () {
        Route::get('nda', [Buyer\NdaController::class, 'show'])->name('nda');
        Route::post('nda', [Buyer\NdaController::class, 'sign'])->name('nda.sign');
        Route::get('nda/pdf', [Buyer\NdaController::class, 'pdf'])->name('nda.pdf');
        Route::get('unlock', [Buyer\UnlockController::class, 'show'])->name('unlock');
        Route::post('unlock/pay', [Buyer\UnlockController::class, 'pay'])->name('unlock.pay');
        Route::post('unlock/premium', [Buyer\UnlockController::class, 'usePremium'])->name('unlock.premium');
        Route::get('pack', [Buyer\PackController::class, 'show'])->name('pack');
        Route::get('pack/documents/{document}', [Buyer\PackController::class, 'document'])->name('pack.document');
        Route::post('deal-room', [DealRoomController::class, 'open'])->name('deal-room');
    });

    // --- Scenario 3: Deal Room ------------------------------------------------
    Route::prefix('deal-rooms/{dealRoom}')->name('deal-rooms.')->group(function () {
        Route::get('/', [DealRoomController::class, 'show'])->name('show');
        Route::post('questions', [DealRoomController::class, 'ask'])->name('questions.store');
        Route::post('questions/{question}/answers', [DealRoomController::class, 'answer'])->name('questions.answer');
        Route::post('questions/{question}/close', [DealRoomController::class, 'closeQuestion'])->name('questions.close');
        Route::post('documents', [DealRoomController::class, 'upload'])->name('documents.upload');
        Route::get('documents/{document}', [DealRoomController::class, 'document'])->name('documents.show');
        Route::post('documents/{document}/release', [DealRoomController::class, 'release'])->name('documents.release');
        Route::post('offers', [DealRoomController::class, 'offer'])->name('offers.store');
        Route::post('offers/{offer}/counter', [DealRoomController::class, 'counter'])->name('offers.counter');
        Route::post('offers/{offer}/respond', [DealRoomController::class, 'respond'])->name('offers.respond');
        Route::post('terms/acknowledge', [DealRoomController::class, 'acknowledge'])->name('terms.acknowledge');
        Route::post('withdraw', [DealRoomController::class, 'withdraw'])->name('withdraw');
        Route::post('agent/opt-in', [DealRoomController::class, 'agentOptIn'])->name('agent.opt-in');
        Route::post('agent/summaries', [DealRoomController::class, 'agentSummary'])->name('agent.summary');
    });

    // --- Admin console --------------------------------------------------------
    Route::prefix('admin')->name('admin.')->middleware('can:admin')->group(function () {
        Route::get('/', Admin\DashboardController::class)->name('dashboard');
        Route::get('listings', [Admin\ListingController::class, 'index'])->name('listings.index');
        Route::get('listings/{listing}', [Admin\ListingController::class, 'show'])->name('listings.show');
        Route::post('listings/{listing}/review', [Admin\ListingController::class, 'review'])->name('listings.review');
        Route::get('companies', [Admin\CompanyController::class, 'index'])->name('companies.index');
        Route::get('companies/{company}', [Admin\CompanyController::class, 'show'])->name('companies.show');
        Route::put('companies/{company}', [Admin\CompanyController::class, 'update'])->name('companies.update');
        Route::post('companies/{company}/verify', [Admin\CompanyController::class, 'verify'])->name('companies.verify');
        Route::get('companies/{company}/authority-document', [Admin\CompanyController::class, 'authorityDocument'])->name('companies.authority-document');
        Route::get('kyc', [Admin\KycController::class, 'index'])->name('kyc.index');
        Route::get('kyc/{submission}', [Admin\KycController::class, 'show'])->name('kyc.show');
        Route::get('kyc/{submission}/files/{type}', [Admin\KycController::class, 'file'])->name('kyc.file');
        Route::post('kyc/{submission}/decide', [Admin\KycController::class, 'decide'])->name('kyc.decide');
        Route::get('compliance', [Admin\ComplianceController::class, 'index'])->name('compliance.index');
        Route::post('compliance/{flag}', [Admin\ComplianceController::class, 'update'])->name('compliance.update');
        Route::get('deals', [Admin\DealController::class, 'index'])->name('deals.index');
        Route::get('audit', [Admin\AuditController::class, 'index'])->name('audit.index');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
