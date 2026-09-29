<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Eskalasi otomatis tiket yang melewati SLA, jalan tiap hari jam 07:00.
// Catatan: di server produksi aktifkan cron Laravel agar scheduler berjalan.
Schedule::command('tickets:escalate')->dailyAt('07:00');
