<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\MenuController;
use App\Http\Controllers\Api\V1\PermissionController;
use App\Http\Controllers\Api\V1\RoleController;
use App\Http\Controllers\Api\V1\SettingController;
use App\Http\Controllers\Api\V1\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('health', HealthController::class);
    Route::get('settings/public', [SettingController::class, 'public']);

    Route::prefix('auth')->group(function (): void {
        Route::post('login', [AuthController::class, 'login']);
        Route::post('refresh', [AuthController::class, 'refresh']);

        // Reachable while a password change is pending: that is how it gets changed.
        Route::middleware(['auth:api', 'account.active'])->group(function (): void {
            Route::post('logout', [AuthController::class, 'logout']);
            Route::get('me', [AuthController::class, 'me']);
            Route::put('password', [AuthController::class, 'changePassword']);
            // Multipart clients send POST with _method=PATCH (PHP does not parse multipart on PATCH).
            Route::patch('profile', [AuthController::class, 'updateProfile']);
        });
    });

    Route::middleware(['auth:api', 'account.active', 'password.changed'])->group(function (): void {
        Route::get('menus/my', [MenuController::class, 'my']);

        Route::middleware('permission:users.view')->group(function (): void {
            Route::get('users', [UserController::class, 'index']);
            Route::get('users/{user}', [UserController::class, 'show']);
        });
        Route::post('users', [UserController::class, 'store'])->middleware('permission:users.create');
        Route::match(['put', 'patch'], 'users/{user}', [UserController::class, 'update'])->middleware('permission:users.update');
        Route::patch('users/{user}/status', [UserController::class, 'status'])->middleware('permission:users.update');
        Route::post('users/{user}/reset-password', [UserController::class, 'resetPassword'])->middleware('permission:users.reset_password');
        Route::delete('users/{user}', [UserController::class, 'destroy'])->middleware('permission:users.delete');

        Route::middleware('permission:roles.view')->group(function (): void {
            Route::get('roles', [RoleController::class, 'index']);
            Route::get('roles/{role}', [RoleController::class, 'show']);
        });
        Route::post('roles', [RoleController::class, 'store'])->middleware('permission:roles.create');
        Route::match(['put', 'patch'], 'roles/{role}', [RoleController::class, 'update'])->middleware('permission:roles.update');
        Route::delete('roles/{role}', [RoleController::class, 'destroy'])->middleware('permission:roles.delete');

        Route::get('permissions', [PermissionController::class, 'index'])->middleware('permission:permissions.view');

        Route::middleware('permission:menus.view')->group(function (): void {
            Route::get('menus', [MenuController::class, 'index']);
            Route::get('menus/icons', [MenuController::class, 'icons']);
        });
        Route::post('menus', [MenuController::class, 'store'])->middleware('permission:menus.create');
        Route::put('menus/reorder', [MenuController::class, 'reorder'])->middleware('permission:menus.update');
        Route::match(['put', 'patch'], 'menus/{menu}', [MenuController::class, 'update'])->middleware('permission:menus.update');
        Route::delete('menus/{menu}', [MenuController::class, 'destroy'])->middleware('permission:menus.delete');
    });
});
