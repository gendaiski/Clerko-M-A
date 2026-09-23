# Company profile extraction (Xtracta)

A seller downloads their company's CR profile from Sijilat as a PDF and uploads it to Clerko M&A. An extraction service reads the PDF and fills in the company profile. An admin then checks the profile against the PDF before the company counts as verified (KYB).

The platform is ready for **Xtracta**. Everything specific to their API is in configuration, so connecting it should not need code changes. The platform also works **without** any extraction service (the `manual` driver), so onboarding can start now.

## How it fits together

```
Seller uploads CR PDF
        │
        ▼
ExtractCompanyProfile (queued job)
        │  submit(pdf) ──────────────► provider   (run logged: "submit")
        │  fetch(reference) every 15 s ◄── provider   (run logged: "poll")
        │        …or the provider POSTs to /webhooks/extraction/{token}   (run logged: "webhook")
        ▼
FieldNormaliser  → any JSON / XML / field-list shape becomes flat keys ("CR No." → "cr_no")
ProfileMapper    → config field_map → company profile (dates are read day-first, as Sijilat prints them)
        ▼
Admin KYB screen: the CR PDF beside the editable profile, the run log, unmapped fields,
Re-run extraction / Enter manually, then Verify or Reject
```

| Piece | File |
|---|---|
| Provider contract | `app/Services/Extraction/ProfileExtractor.php` (+ `ReceivesWebhooks.php` for push) |
| Xtracta driver | `app/Services/Extraction/XtractaExtractor.php` |
| Other drivers | `ExtractaExtractor` (Extracta.ai), `ManualExtractor` (no API), `FakeExtractor` (local sample) |
| Orchestration and run log | `app/Services/Extraction/CompanyProfileExtraction.php`, table `extraction_runs` |
| Result shape → keys | `app/Services/Extraction/FieldNormaliser.php` |
| Keys → profile | `app/Services/Extraction/ProfileMapper.php` + `config/clerko.php` → `extraction.field_map` |
| Queue job | `app/Jobs/ExtractCompanyProfile.php` |
| Webhook | `POST /webhooks/extraction/{token}` → `ExtractionWebhookController` |

## Connecting Xtracta

1. **Credentials** (`.env`):
   ```dotenv
   CLERKO_EXTRACTION_DRIVER=xtracta
   XTRACTA_API_KEY=...
   XTRACTA_WORKFLOW_ID=...      # the workflow set up for Sijilat CR profiles
   ```
2. **Check the API details against Xtracta's documentation.** Everything is in `config/clerko.php` → `extraction.xtracta`. The defaults are:

   | Setting | Default | Meaning |
   |---|---|---|
   | `base_url` | `https://api-app.xtracta.com/v1` | API base (env `XTRACTA_BASE_URL`) |
   | `upload_path` | `/documents/upload` | Multipart upload with `api_key`, `workflow_id` and the file |
   | `file_field` | `userfile` | Name of the file field in the upload |
   | `status_path` | `/documents` | Form POST with `api_key` and the document id |
   | `reference_key` | `document_id` | Where the upload response puts the document id |
   | `status_key` | `document_status` | Where the status response puts the status |
   | `fields_key` | `field_data` | Where the extracted fields are |
   | `completed_statuses` | `output`, `completed`, `complete` | Status values that mean "done" |
   | `failed_statuses` | `reject`, `rejected`, `error`, `failed` | Status values that mean "failed" |

   Responses may be **XML or JSON**; both are parsed.
3. **Run a real Sijilat PDF through it**. This saves nothing:
   ```bash
   php artisan clerko:extraction:test storage/cr-sample.pdf --driver=xtracta --raw
   ```
   The command prints:
   - the raw response;
   - every field as a normalised key (these are the names to use in the field map);
   - the company profile it would produce;
   - which profile fields were not found;
   - which returned fields are not mapped.
4. **Adjust the field map** if needed (`extraction.field_map`). Each profile field lists candidate field names, tried in order. Names are compared after normalising, so `CR No.`, `cr_no` and `CR NO` all match. The defaults already follow the Sijilat labels: CR No., Commercial Name (EN/AR), CR Type, Status, Registration/Expiration Date, Issued Capital, the address parts, Business Activities, Partners and Shareholders, and Authorized Signatories. Tables such as shareholders keep all their columns.
5. **Optional: push instead of polling.** Set `CLERKO_EXTRACTION_WEBHOOK_TOKEN` to a long random string, then configure Xtracta's output or callback to POST to `https://<domain>/webhooks/extraction/<token>`. The result is matched to the company by document id. Polling keeps running as a fallback, and a result applied twice has no extra effect.

## Running without an extraction service

Set `CLERKO_EXTRACTION_DRIVER=manual`. Uploaded CR PDFs go straight to the admin KYB queue marked **Manual entry**. The admin types the profile from the PDF beside it and verifies it. The seller sees "Our compliance team is entering your company details" and can build a listing in the meantime.

## When something goes wrong

- Every call to the provider is recorded: submit, poll and webhook, with status, error, the provider's response (truncated) and timing. Admins can read it on the company's KYB page.
- Temporary errors are retried by the queue (3 times, with backoff). If there is still no result after `CLERKO_EXTRACTION_MAX_POLLS` × `CLERKO_EXTRACTION_POLL_SECONDS` (default 40 × 15 s), the company is marked **failed** and admins are notified.
- From the KYB page an admin can **Re-run extraction** or **Enter manually**. The seller can also retry a failed extraction.
- The raw extracted data is always stored, and anything not mapped is listed on the KYB page, so nothing is lost.

## Adding a different provider

1. Implement `ProfileExtractor`: `name()`, `submit(pdf, filename)` returning a reference, and `fetch(reference)` returning an `ExtractionResult`. Implement `ReceivesWebhooks` too if the provider pushes results.
2. Register it in `AppServiceProvider` under a new driver name.
3. Set `CLERKO_EXTRACTION_DRIVER` to that name.

Nothing else in the platform changes. The tests in `tests/Feature/Services/ExtractionTest.php` show the expected behaviour.
