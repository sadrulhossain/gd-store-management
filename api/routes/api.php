<?php

use App\Helpers\RouteHelper;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\MenuController;
use App\Http\Controllers\Api\V1\PermissionController;
use App\Http\Controllers\Api\V1\RoleController;
use App\Http\Controllers\Api\V1\SettingController;
use App\Http\Controllers\Api\V1\UserController;
use Illuminate\Support\Facades\Route;

// Route names follow Laravel's resource convention: api.v1.{resource}.{index|create|store|show|edit|update|destroy}.
Route::prefix('v1')->name('api.v1.')->group(function (): void {
    Route::get('health', HealthController::class)->name('health');
    Route::get('settings/public', [SettingController::class, 'public'])->name('settings.public');

    Route::prefix('auth')->name('auth.')->group(function (): void {
        Route::post('login', [AuthController::class, 'login'])->name('login');
        Route::post('refresh', [AuthController::class, 'refresh'])->name('refresh');

        // Reachable while a password change is pending: that is how it gets changed.
        Route::middleware(['auth:api', 'account.active'])->group(function (): void {
            Route::post('logout', [AuthController::class, 'logout'])->name('logout');
            Route::get('me', [AuthController::class, 'me'])->name('me');
            Route::put('password', [AuthController::class, 'changePassword'])->name('password');
            // Multipart clients send POST with _method=PATCH (PHP does not parse multipart on PATCH).
            Route::patch('profile', [AuthController::class, 'updateProfile'])->name('profile');
        });
    });

    Route::middleware(['auth:api', 'account.active', 'password.changed'])->group(function (): void {
        Route::get('menus/my', [MenuController::class, 'my'])->name('menus.my');

        Route::prefix('users')
            ->controller(UserController::class)
            ->group(function (): void {
                $permission = RouteHelper::permissionPrefix('users');

                Route::get('create', 'create')->name('create')->middleware($permission . 'create');
                Route::middleware($permission . 'view')->group(function (): void {
                    Route::get('', 'index')->name('index');
                    Route::get('{user}', 'show')->name('show');
                });
                Route::get('{user}/edit', 'edit')->name('edit')->middleware($permission . 'update');
                Route::post('', 'store')->name('store')->middleware($permission . 'create');
                Route::match(['put', 'patch'], '{user}', 'update')
                    ->name('update')
                    ->middleware($permission . 'update');
                Route::patch('{user}/status', 'status')->name('status')->middleware($permission . 'update');
                Route::post('{user}/reset-password', 'resetPassword')
                    ->name('reset-password')
                    ->middleware($permission . 'reset_password');
                Route::delete('{user}', 'destroy')->name('destroy')->middleware($permission . 'delete');
            });

        Route::prefix('roles')
            ->controller(RoleController::class)
            ->group(function (): void {
                $permission = RouteHelper::permissionPrefix('roles');

                Route::get('create', 'create')->name('create')->middleware($permission . 'create');
                Route::middleware($permission . 'view')->group(function (): void {
                    Route::get('', 'index')->name('index');
                    Route::get('{role}', 'show')->name('show');
                });
                Route::get('{role}/edit', 'edit')->name('edit')->middleware($permission . 'update');
                Route::post('', 'store')->name('store')->middleware($permission . 'create');
                Route::match(['put', 'patch'], '{role}', 'update')
                    ->name('update')
                    ->middleware($permission . 'update');
                Route::delete('{role}', 'destroy')->name('destroy')->middleware($permission . 'delete');
            });

        Route::prefix('permissions')
            ->controller(PermissionController::class)
            ->group(function (): void {
                $permission = RouteHelper::permissionPrefix('permissions');

                Route::get('', 'index')->name('index')->middleware($permission . 'view');
                Route::get('create', 'create')->name('create')->middleware($permission . 'create');
                Route::get('{permission}/edit', 'edit')->name('edit')->middleware($permission . 'update');
                Route::post('', 'store')->name('store')->middleware($permission . 'create');
                Route::match(['put', 'patch'], '{permission}', 'update')
                    ->name('update')
                    ->middleware($permission . 'update');
            });

        Route::prefix('menus')
            ->controller(MenuController::class)
            ->group(function (): void {
                $permission = RouteHelper::permissionPrefix('menus');

                Route::get('', 'index')->name('index')->middleware($permission . 'view');
                Route::get('create', 'create')->name('create')->middleware($permission . 'create');
                Route::get('{menu}/edit', 'edit')->name('edit')->middleware($permission . 'update');
                Route::post('', 'store')->name('store')->middleware($permission . 'create');
                Route::put('reorder', 'reorder')->name('reorder')->middleware($permission . 'update');
                Route::match(['put', 'patch'], '{menu}', 'update')
                    ->name('update')
                    ->middleware($permission . 'update');
                Route::delete('{menu}', 'destroy')->name('destroy')->middleware($permission . 'delete');
            });

        Route::prefix('settings')
            ->controller(SettingController::class)
            ->group(function (): void {
                $permission = RouteHelper::permissionPrefix('settings');

                Route::get('', 'index')->name('index')->middleware($permission . 'view');
                Route::get('{setting}/edit', 'edit')->name('edit')->middleware($permission . 'update');
                Route::match(['put', 'patch'], '{setting}', 'update')
                    ->name('update')
                    ->middleware($permission . 'update');
            });
    });
});
