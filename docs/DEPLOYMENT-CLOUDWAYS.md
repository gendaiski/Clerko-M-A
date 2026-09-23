# Deploying Clerko M&A on Cloudways

Clerko M&A is a standard Laravel application. Cloudways' PHP stack provides everything it needs: Nginx/Apache, PHP-FPM, MySQL/MariaDB, Redis, cron and Supervisor.

## 1. Server and application

1. **Server location.** Pick the region closest to Bahrain that your cloud provider offers. Deal documents and identity documents are personal data under Bahrain's PDPL, so record where the data is stored.
2. **Application.** Add a PHP application, choosing Laravel or Custom PHP.
3. **PHP.** Under *Server → Settings & Packages*, choose PHP **8.3 or later**. Enable **Redis**.
4. **Webroot.** Under *Application → Application Settings*, set the webroot to `public_html/public`.
5. **PHP settings.** Set `upload_max_filesize = 25M`, `post_max_size = 30M` and `memory_limit = 512M`. Documents can be up to 20 MB.
6. **SSL.** Install a Let's Encrypt certificate and force HTTPS.

## 2. Code

Use *Deployment via Git* for this repository, deploying into `public_html`, or clone it over SSH. Then run:

```bash
cd ~/applications/<app>/public_html
composer install --no-dev --optimize-autoloader
npm ci && npm run build        # if npm is unavailable on the server, build in CI and upload public/build
cp .env.example .env           # first deploy only — then edit .env (below)
php artisan key:generate       # first deploy only
php artisan migrate --force
php artisan storage:link
php artisan optimize
```

**Never run the seeders in production.** The `DemoSeeder` refuses to run when `APP_ENV=production`.

## 3. `.env` (production)

```dotenv
APP_NAME="Clerko M&A"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://<your-domain>
APP_TIMEZONE=UTC

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=<from Cloudways Access Details>
DB_USERNAME=<from Cloudways Access Details>
DB_PASSWORD=<from Cloudways Access Details>

SESSION_DRIVER=redis
SESSION_ENCRYPT=true
SESSION_SECURE_COOKIE=true
CACHE_STORE=redis
QUEUE_CONNECTION=redis
REDIS_CLIENT=phpredis

MAIL_MAILER=smtp               # an SMTP provider, e.g. via Cloudways' Elastic Email add-on
MAIL_FROM_ADDRESS="no-reply@<your-domain>"

CLERKO_DOCUMENTS_DISK=local     # files stay in storage/app/private, outside the webroot
CLERKO_PAYMENT_DRIVER=tap
TAP_SECRET_KEY=sk_live_...
CLERKO_EXTRACTION_DRIVER=xtracta   # or "manual" until Xtracta is connected
XTRACTA_API_KEY=...
XTRACTA_WORKFLOW_ID=...
CLERKO_EXTRACTION_WEBHOOK_TOKEN=<long random string, only if Xtracta pushes results>
CLERKO_AGENT_ENABLED=true
CLERKO_AGENT_MODEL=claude-opus-5
ANTHROPIC_API_KEY=...
```

The fake payment driver refuses to start in production. Payments cannot silently fall back to it.

## 4. Queue worker (Supervisor)

Add a Supervisor job for the queue worker. CR extraction, emails, buyer alerts and notifications all run on the queue.

```
php /home/master/applications/<app>/public_html/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
```

In Cloudways this is under *Application Management → Cron Job Management → Supervisor Jobs*. Restart the worker after each deploy with `php artisan queue:restart`.

## 5. Scheduler (cron)

Add one cron entry:

```
* * * * * cd /home/master/applications/<app>/public_html && php artisan schedule:run >> /dev/null 2>&1
```

It runs the daily subscription expiry and renewal reminders (06:00 Bahrain time) and prunes failed jobs.

## 6. Tap Payments

- In the Tap dashboard, add the webhook URL `https://<your-domain>/payments/webhook`.
- The platform never trusts the redirect or the webhook body. It always fetches the charge from Tap and checks the status, amount and currency before fulfilling a payment.

## 7. After deploying

1. Register your own account, then promote it to admin:
   `php artisan tinker --execute "App\Models\User::where('email','you@…')->update(['is_admin'=>true]);"`
2. Run `php artisan clerko:extraction:test <a real Sijilat CR PDF> --driver=xtracta` and follow [EXTRACTION-INTEGRATION.md](EXTRACTION-INTEGRATION.md) to align the field map.
3. Make a small live Tap payment and refund it.
4. Back up `storage/app/private` as well as the database. It holds CR PDFs, identity documents, signed NDAs and deal documents. Cloudways application backups include it.
