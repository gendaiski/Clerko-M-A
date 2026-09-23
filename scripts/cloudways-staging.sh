#!/usr/bin/env bash
#
# Sets up Clerko M&A as a private STAGING site with demo data on Cloudways.
# Run from the application's public_html folder after Cloudways "Deployment
# via Git" has pulled the code:
#
#   cd ~/applications/<app-folder>/public_html && bash scripts/cloudways-staging.sh https://<your-app-url>
#
# Staging only: SQLite database, demo accounts, fake payments and extraction.
# Do not use this for production (see docs/DEPLOYMENT-CLOUDWAYS.md).
set -euo pipefail

APP_URL="${1:-}"
if [[ -z "$APP_URL" ]]; then
  echo "Usage: bash scripts/cloudways-staging.sh https://<your-app-url>"
  exit 1
fi

step() { printf '\n\033[1;34m==> %s\033[0m\n' "$1"; }
fail() { printf '\n\033[1;31mSTOPPED: %s\033[0m\n' "$1"; exit 1; }

step "Checking PHP"
php -r 'exit(version_compare(PHP_VERSION, "8.3.0", ">=") ? 0 : 1);' \
  || fail "PHP $(php -r 'echo PHP_VERSION;') is too old. In Cloudways: Server → Settings & Packages → PHP 8.3 or later, then run this again."
php -m | grep -qi pdo_sqlite || fail "The PHP pdo_sqlite extension is missing. Contact Cloudways support to enable it."

step "Installing PHP packages"
composer install --no-dev --optimize-autoloader --no-interaction

step "Building the frontend"
if ! command -v npm >/dev/null 2>&1; then
  echo "npm not found — installing Node.js 20 into your home folder (no root needed)"
  export NVM_DIR="$HOME/.nvm"
  [[ -s "$NVM_DIR/nvm.sh" ]] || curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm install 20 >/dev/null
fi
npm ci --no-audit --no-fund
npm run build

step "Writing .env (staging)"
if [[ ! -f .env ]]; then
  cp .env.example .env
fi
set_env() { # key value
  if grep -q "^$1=" .env; then sed -i "s|^$1=.*|$1=$2|" .env; else echo "$1=$2" >> .env; fi
}
set_env APP_ENV staging
set_env APP_DEBUG false
set_env APP_URL "$APP_URL"
set_env DB_CONNECTION sqlite
set_env QUEUE_CONNECTION sync
set_env SESSION_DRIVER database
set_env CACHE_STORE database
set_env MAIL_MAILER log
set_env CLERKO_PAYMENT_DRIVER fake
set_env CLERKO_EXTRACTION_DRIVER fake
grep -q '^APP_KEY=base64' .env || php artisan key:generate --force

step "Creating the database with demo data"
touch database/database.sqlite
php artisan migrate:fresh --seed --force

step "Permissions and caches"
chmod -R ug+rwX storage bootstrap/cache database
php artisan storage:link >/dev/null 2>&1 || true
php artisan optimize

# If the Cloudways webroot still points at public_html (not public_html/public),
# send every request into public/ so the app works and .env is never served.
if [[ ! -f .htaccess ]]; then
  cat > .htaccess <<'HTACCESS'
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteRule ^(.*)$ public/$1 [L]
</IfModule>
HTACCESS
fi

step "Done"
cat <<DONE

Clerko M&A staging is ready at: $APP_URL

Sign in with (password: "password"):
  seller@clerko.test   buyer@clerko.test   admin@clerko.test

Payments open a development checkout; CR uploads return a sample profile.
To reset the demo data later:  php artisan migrate:fresh --seed --force
DONE
