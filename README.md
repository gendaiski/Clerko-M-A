# Clerko M&A

Clerko M&A is a marketplace for buying and selling businesses in Bahrain. Sellers list an anonymised teaser. Verified buyers sign an NDA, unlock a Company Details Pack, and negotiate in a confidential Deal Room until both sides agree headline terms.

The build follows the interactive prototype in [`prototype/clerko-ma-site.html`](prototype/clerko-ma-site.html) (Dropbox `/Wireframes/The Law Tech Labs/Ventures/clerko-ma/`, version of 22 Jul 2026).

## What is built

| Scenario | Flow |
|---|---|
| **1 — Seller** | Identity check (KYC) → upload the company's CR profile PDF saved from Sijilat → the profile is read automatically (Extracta) and checked by an admin (KYB) → build the anonymised teaser and the Details Pack → choose a tier and pay (Tap) → admin review, with revision requests → live on the marketplace → interest pipeline |
| **2 — Buyer** | Preferences and alerts → browse teasers for free → request access → KYC → sign the NDA (a signed PDF is stored with a SHA-256 hash) → unlock the pack (BD 250 per company, or Buyer Premium) → Company Details Pack with watermarked, logged documents |
| **3 — Deal Room** | Q&A by topic → documents the seller releases to this buyer only → indicative offers and counter-offers → headline terms confirmed by both parties → audit trail. The **Clerko Agent** (Claude) summarises the room for both sides once both have opted in; it never advises or decides |
| **Admin console** | Listing moderation, company verification side by side with the CR PDF, KYC review, compliance flags for off-platform contact attempts, deal rooms, and an audit trail with a hash-chain integrity check |
| Scenario 4 | Escrow, ownership transfer and completion are deferred, as agreed. Payments sit behind an interface, so an escrow provider can be added later |

### Safeguards
- The public teaser can never name the company. The server rejects a headline or summary that contains the company name or CR number.
- Buyers stay anonymous to sellers (e.g. "Buyer #A7"). The company's identity is only released after the NDA.
- Every PDF a buyer opens is stamped with their account, email and the time. Every view and download is logged.
- Email addresses, phone numbers, links and messaging-app mentions are removed from Deal Room messages. An admin sees a compliance flag with the original text.
- The audit trail is append-only. Each entry stores the hash of the one before it, so editing or deleting any entry is detectable.
- The Clerko Agent reads only what both parties can already see in the room (questions, answers, offers and document titles, never document contents). It runs only after **both** parties opt in.

## Stack

- **Laravel 12** (PHP 8.3+) with **MySQL/MariaDB** and **Redis** queues. This matches Cloudways hosting.
- **Inertia 2 + React 19 + TypeScript + Tailwind 4**, with the prototype's colours.
- Integrations, each with a fake driver for local work:
  - Tap Payments: `app/Services/Payments/TapGateway.php`
  - Extracta: `app/Services/Extraction/ExtractaExtractor.php`
  - Claude API: `app/Services/Agent/ClerkoAgent.php`
- PDF: dompdf for the signed NDA, FPDI for watermarks.

## Running it locally

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate --seed      # seeds demo data (see below)
composer run dev                # app server, queue worker, logs and Vite
```

Open http://localhost:8000. The demo accounts all use the password `password`:

| Account | What you see |
|---|---|
| `seller@clerko.test` | Six live listings, a buyer pipeline, and a live Deal Room |
| `buyer@clerko.test` | A verified buyer with an unlocked pack and an open offer in the Deal Room |
| `admin@clerko.test` | The admin console, with a listing, a company and a KYC submission waiting for review |

Locally, payments go to a **development checkout page** where you choose to pay or fail, and CR extraction returns a sample Sijilat profile. Set `CLERKO_PAYMENT_DRIVER=tap` and `CLERKO_EXTRACTION_DRIVER=extracta` (with their keys) to use the real services.

## Tests

```bash
php artisan test
```

The feature tests cover all three scenarios end to end through HTTP. They also cover the integrations (Tap, Extracta, field mapping, watermarking) and render every page as each role against the demo data.

## Configuration

Everything Clerko-specific is in [`config/clerko.php`](config/clerko.php): tier prices, the pack price, Buyer Premium, the NDA version, drivers, and the **Extracta field map**. The field map pairs each company profile field with the name used in your Extracta template for the Sijilat CR profile. Set these names to match the template exactly.

## Deployment

See [`docs/DEPLOYMENT-CLOUDWAYS.md`](docs/DEPLOYMENT-CLOUDWAYS.md).

## Open items

- **Extracta template field names.** Confirm them with the team that built the template, and update `clerko.extraction.field_map`. The Extracta endpoints (`uploadFiles` / `getBatchResults`) should also be checked against your account.
- **Tap.** A merchant account is needed, with the webhook set to `https://<domain>/payments/webhook`. Plans are charged one month at a time. Automatic recurring billing (saved cards) is still to do.
- **NDA wording** (`app/Services/Nda/NdaTemplate.php`) needs legal review before launch.
- **Scenario 4** (escrow, transfer, completion) is deferred.
- **Arabic / right-to-left** interface is not done yet.
