<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Str;
use Laravel\Passport\Passport;

class PassportClientCommand extends Command
{
    protected $signature = 'store:passport-client
        {--write-env : Append generated values to the application .env file (development convenience)}
        {--rotate : Generate a new secret even if values are already configured}';

    protected $description = 'Create or update the first-party Passport client used by the portal (idempotent)';

    private const NAME = 'Store Portal';

    public function handle(): int
    {
        $id = config('store.auth.client_id');
        $secret = config('store.auth.client_secret');
        $generated = false;

        if (! $id || ! $secret || $this->option('rotate')) {
            $id = $this->option('rotate') && $id ? $id : (string) Str::uuid();
            $secret = Str::random(48);
            $generated = true;
        }

        $client = Passport::client()->newQuery()->find($id) ?? Passport::client();
        $isNew = ! $client->exists;

        $client->forceFill([
            'id' => $id,
            'name' => self::NAME,
            'secret' => $secret,
            'provider' => 'users',
            'redirect_uris' => [],
            'grant_types' => ['password', 'refresh_token'],
            'revoked' => false,
        ])->save();

        $this->components->info($isNew ? 'Passport client created.' : 'Passport client verified.');

        if ($generated) {
            $lines = [
                "PASSPORT_PORTAL_CLIENT_ID={$id}",
                "PASSPORT_PORTAL_CLIENT_SECRET={$secret}",
            ];

            if ($this->option('write-env') && $this->appendToEnvFile($lines)) {
                $this->line('Values written to .env.');
            } else {
                $this->line('Add these to your .env, then restart the api, worker and scheduler containers:');
                $this->newLine();
                foreach ($lines as $line) {
                    $this->line($line);
                }
            }
        }

        return self::SUCCESS;
    }

    /** @param  list<string>  $lines */
    private function appendToEnvFile(array $lines): bool
    {
        $path = base_path('.env');

        if (! is_file($path) || ! is_writable($path)) {
            return false;
        }

        $current = (string) file_get_contents($path);
        $current = preg_replace('/^PASSPORT_PORTAL_CLIENT_(ID|SECRET)=.*\R?/m', '', $current);

        file_put_contents($path, rtrim($current)."\n".implode("\n", $lines)."\n");

        return true;
    }
}
