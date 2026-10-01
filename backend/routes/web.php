<?php

use Illuminate\Support\Facades\Route;

// Backend hanya API — arahkan akses browser ke halaman login frontend (React).
// Halaman pertama yang muncul saat web dibuka = login.
Route::get('/', function () {
    $frontend = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');
    return redirect($frontend.'/login');
});

Route::get('/login', function () {
    $frontend = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');
    return redirect($frontend.'/login');
})->name('login');
