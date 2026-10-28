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

        Route::prefix('users')
            ->controller(UserController::class)
            ->group(function (): void {
                $permission = RouteHelper::permissionPrefix('users');

                Route::middleware($permission . 'view')->group(function (): void {
                    Route::get('', 'index');
                    Route::get('{user}', 'show');
                });
                Route::post('', 'store')->middleware($permission . 'create');
                Route::match(['put', 'patch'], '{user}', 'update')
                    ->middleware($permission . 'update');
                Route::patch('{user}/status', 'status')->middleware($permission . 'update');
                Route::post('{user}/reset-password', 'resetPassword')
                    ->middleware($permission . 'reset_password');
                Route::delete('{user}', 'destroy')->middleware($permission . 'delete');
            });

        Route::prefix('roles')
            ->controller(RoleController::class)
            ->group(function (): void {
                $permission = RouteHelper::permissionPrefix('roles');

                Route::middleware($permission . 'view')->group(function (): void {
                    Route::get('', 'index');
                    Route::get('{role}', 'show');
                });
                Route::post('', 'store')->middleware($permission . 'create');
                Route::match(['put', 'patch'], '{role}', 'update')
                    ->middleware($permission . 'update');
                Route::delete('{role}', 'destroy')->middleware($permission . 'delete');
            });



        Route::get('permissions', [PermissionController::class, 'index'])
            ->middleware('permission:permissions.view');

        Route::prefix('menus')
            ->controller(MenuController::class)
            ->group(function (): void {
                $permission = RouteHelper::permissionPrefix('menus');

                Route::middleware($permission . 'view')->group(function (): void {
                    Route::get('', 'index');
                    Route::get('icons', 'icons');
                });
                Route::post('', 'store')->middleware($permission . 'create');
                Route::match(['put', 'patch'], '{menu}', 'update')
                    ->middleware($permission . 'update');
                Route::delete('{menu}', 'destroy')->middleware($permission . 'delete');
            });

    });
});
