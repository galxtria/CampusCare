<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TicketController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::put('/users/{id}', [UserController::class, 'update']);
    Route::delete('/users/{id}', [UserController::class, 'destroy']);

    Route::get('/tickets', [TicketController::class, 'index']);
    Route::post('/tickets', [TicketController::class, 'store']);
    Route::get('/tickets/active', [TicketController::class, 'active']);
    Route::get('/tickets/stats', [TicketController::class, 'stats']);
    Route::get('/tickets/{id}', [TicketController::class, 'show']);
    Route::put('/tickets/{id}', [TicketController::class, 'update']);
    Route::delete('/tickets/{id}', [TicketController::class, 'destroy']);
    Route::post('/tickets/{id}/support', [TicketController::class, 'support']);
    Route::delete('/tickets/{id}/support', [TicketController::class, 'unsupport']);
    Route::get('/tickets/{id}/comments', [TicketController::class, 'comments']);
    Route::post('/tickets/{id}/comments', [TicketController::class, 'addComment']);
    Route::put('/tickets/{id}/rating', [TicketController::class, 'rate']);
});
