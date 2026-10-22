<?php

namespace App\Providers;

use DateInterval;
use Illuminate\Support\ServiceProvider;
use Laravel\Passport\Passport;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Development/test key files live on a bind mount that reports 0666 on Docker Desktop, which
        // League rejects. Production supplies keys through environment variables, so the check stays on.
        Passport::$validateKeyPermissions = ! $this->app->environment(['local', 'testing']);

        // Password grant, isolated behind AuthService (see its docblock for the trade-off).
        Passport::enablePasswordGrant();
        Passport::tokensExpireIn(new DateInterval('PT'.max(1, (int) config('store.auth.access_token_ttl_minutes')).'M'));
        Passport::refreshTokensExpireIn(new DateInterval('P'.max(1, (int) config('store.auth.refresh_token_ttl_days')).'D'));
    }
}
