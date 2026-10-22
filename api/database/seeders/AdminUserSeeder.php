<?php

namespace Database\Seeders;

use App\Models\User;
use App\Services\PermissionCache;
use App\Support\SystemRole;
use Illuminate\Database\Seeder;
use RuntimeException;

class AdminUserSeeder extends Seeder
{
    public function run(PermissionCache $cache): void
    {
        $admin = config('store.seed.admin');
        $password = $admin['password'];

        if (! is_string($password) || $password === '') {
            throw new RuntimeException('SEED_ADMIN_PASSWORD is required to seed the primary user.');
        }

        if (app()->environment('production') && $password === config('store.seed.example_admin_password')) {
            throw new RuntimeException('SEED_ADMIN_PASSWORD still has the example value; set a real password before seeding in production.');
        }

        $user = User::withTrashed()->whereRaw('lower(username) = ?', [mb_strtolower($admin['username'])])->first();

        if ($user === null) {
            // A password the Owner must replace at first login.
            $user = User::query()->create([
                'name' => $admin['name'],
                'username' => $admin['username'],
                'email' => $admin['email'] ?: null,
                'password' => $password,
                'is_active' => true,
                'must_change_password' => true,
            ]);
        } else {
            // Re-seeding never resets a password the Owner has already changed.
            $user->restore();
            $user->forceFill(['is_active' => true])->save();
        }

        $user->syncRoles([SystemRole::OWNER]);
        $cache->forget();
    }
}
