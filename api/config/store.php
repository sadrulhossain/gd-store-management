<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Authentication
    |--------------------------------------------------------------------------
    */

    'auth' => [
        'access_token_ttl_minutes' => (int) env('ACCESS_TOKEN_TTL_MINUTES', 15),
        'refresh_token_ttl_days' => (int) env('REFRESH_TOKEN_TTL_DAYS', 14),

        // First-party Passport client used by AuthService (see `php artisan store:passport-client`).
        'client_id' => env('PASSPORT_PORTAL_CLIENT_ID'),
        'client_secret' => env('PASSPORT_PORTAL_CLIENT_SECRET'),

        'login_max_attempts' => (int) env('LOGIN_MAX_ATTEMPTS', 5),
        'login_decay_seconds' => (int) env('LOGIN_DECAY_SECONDS', 60),
    ],

    /*
    |--------------------------------------------------------------------------
    | Uploads
    |--------------------------------------------------------------------------
    */

    'uploads' => [
        'avatar_max_kb' => 2048,
        'avatar_min_pixels' => 64,
        'avatar_max_pixels' => 4000,
        'avatar_size' => 512,
    ],

    /*
    |--------------------------------------------------------------------------
    | Seed data
    |--------------------------------------------------------------------------
    */

    'seed' => [
        'example_admin_password' => 'ChangeMe!2026',
        'admin' => [
            'name' => env('SEED_ADMIN_NAME', 'Store Owner'),
            'username' => env('SEED_ADMIN_USERNAME', 'owner'),
            'email' => env('SEED_ADMIN_EMAIL'),
            'password' => env('SEED_ADMIN_PASSWORD'),
        ],
        'demo_password' => env('SEED_DEMO_PASSWORD'),
    ],

];
