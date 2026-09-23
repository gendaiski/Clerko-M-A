<?php

use Illuminate\Support\Facades\Schedule;

// Runs from the Cloudways cron: * * * * * php /path/to/artisan schedule:run
Schedule::command('clerko:subscriptions')->timezone('Asia/Bahrain')->dailyAt('06:00')->withoutOverlapping();
Schedule::command('queue:prune-failed --hours=720')->weekly();
