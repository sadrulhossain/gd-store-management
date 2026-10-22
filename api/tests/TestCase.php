<?php

namespace Tests;

use App\Models\User;
use Database\Seeders\MenuSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Str;

abstract class TestCase extends BaseTestCase
{
    /** Roles, permissions, menus and a Passport client: the baseline every feature test needs. */
    public function bootstrapApplicationData(): void
    {
        $this->seed([PermissionSeeder::class, RoleSeeder::class, MenuSeeder::class]);

        config([
            'store.auth.client_id' => (string) Str::uuid(),
            'store.auth.client_secret' => Str::random(40),
        ]);
        Artisan::call('store:passport-client');

        if (! is_file(storage_path('oauth-private.key')) && ! config('passport.private_key')) {
            Artisan::call('passport:keys', ['--force' => true]);
        }
    }

    /**
     * Real requests never share a resolved user; the test app instance would, so each
     * simulated request starts with fresh guards.
     */
    public function call($method, $uri, $parameters = [], $cookies = [], $files = [], $server = [], $content = null)
    {
        $this->app['auth']->forgetGuards();

        return parent::call($method, $uri, $parameters, $cookies, $files, $server, $content);
    }

    public function makeUser(string $role = 'employee', array $attributes = []): User
    {
        $user = User::factory()->create($attributes);
        $user->assignRole($role);

        return $user;
    }

    /** Sign in through the real login endpoint and return the bearer token. */
    public function tokenFor(User $user, string $password = 'Password123'): string
    {
        return $this->postJson('/api/v1/auth/login', ['username' => $user->username, 'password' => $password])
            ->assertOk()
            ->json('data.access_token');
    }

    public function actingAsRole(string $role, array $attributes = []): User
    {
        $user = $this->makeUser($role, $attributes);
        $this->withToken($this->tokenFor($user));

        return $user;
    }
}
