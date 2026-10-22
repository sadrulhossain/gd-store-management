<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;

class PassportClientSeeder extends Seeder
{
    /**
     * Re-creates the portal's Passport client after a database reset
     * (migrate:fresh wipes oauth_clients). Needs the client id/secret in the environment.
     */
    public function run(): void
    {
        if (! config('store.auth.client_id') || ! config('store.auth.client_secret')) {
            $this->command?->warn('PASSPORT_PORTAL_CLIENT_ID/SECRET are not set; run `php artisan store:passport-client`.');

            return;
        }

        Artisan::call('store:passport-client');
    }
}
