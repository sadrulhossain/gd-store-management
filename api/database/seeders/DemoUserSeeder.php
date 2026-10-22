<?php

namespace Database\Seeders;

use App\Models\User;
use App\Services\PermissionCache;
use App\Support\SystemRole;
use Illuminate\Database\Seeder;

class DemoUserSeeder extends Seeder
{
    public function run(PermissionCache $cache): void
    {
        if (! app()->environment('local')) {
            return;
        }

        $password = config('store.seed.demo_password');

        if (! is_string($password) || $password === '') {
            $this->command?->warn('SEED_DEMO_PASSWORD is not set; demo users were not created.');

            return;
        }

        $demo = [
            ['username' => 'manager', 'name' => 'Demo Manager', 'role' => SystemRole::MANAGER],
            ['username' => 'employee', 'name' => 'Demo Employee', 'role' => SystemRole::EMPLOYEE],
        ];

        foreach ($demo as $entry) {
            $user = User::withTrashed()->whereRaw('lower(username) = ?', [$entry['username']])->first()
                ?? User::query()->create([
                    'name' => $entry['name'],
                    'username' => $entry['username'],
                    'password' => $password,
                    'is_active' => true,
                    'must_change_password' => false,
                ]);

            $user->restore();
            $user->syncRoles([$entry['role']]);
        }

        $cache->forget();
    }
}
