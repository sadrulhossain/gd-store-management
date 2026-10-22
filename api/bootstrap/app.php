<?php

use App\Exceptions\ApiExceptionRenderer;
use App\Http\Middleware\EnsureAccountIsActive;
use App\Http\Middleware\EnsurePasswordIsChanged;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        apiPrefix: 'api',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');
        $middleware->alias([
            'permission' => PermissionMiddleware::class,
            'role' => RoleMiddleware::class,
            'account.active' => EnsureAccountIsActive::class,
            'password.changed' => EnsurePasswordIsChanged::class,
        ]);

        // Authorise before route-model binding, so a caller without permission gets 403
        // for every id instead of learning which ids exist from 404 vs 403.
        $middleware->prependToPriorityList(before: SubstituteBindings::class, prepend: EnsureAccountIsActive::class);
        $middleware->prependToPriorityList(before: SubstituteBindings::class, prepend: EnsurePasswordIsChanged::class);
        $middleware->prependToPriorityList(before: SubstituteBindings::class, prepend: PermissionMiddleware::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
        $exceptions->render(new ApiExceptionRenderer);
    })->create();
