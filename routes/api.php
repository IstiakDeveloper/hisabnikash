<?php

use App\Http\Controllers\Mobile\SyncController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::prefix('mobile/v1')->group(function () {
    Route::post('login', [SyncController::class, 'login'])->middleware('throttle:5,1');
    Route::middleware(['auth:sanctum', 'throttle:60,1'])->group(function () {
        Route::post('logout', [SyncController::class, 'logout']);
        Route::post('sync/push', [SyncController::class, 'push']);
        Route::get('sync/pull', [SyncController::class, 'pull']);
    });
});
