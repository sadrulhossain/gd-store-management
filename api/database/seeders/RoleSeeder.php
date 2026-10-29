<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Services\PermissionCache;
use App\Support\PermissionCatalog;
use App\Support\SystemRole;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    public function run(PermissionCache $cache): void
    {
        // Owner always holds every permission: re-synced on every run.
        $owner = Role::query()->firstOrCreate(['name' => SystemRole::OWNER, 'guard_name' => 'api']);
        // Includes permissions created in the UI, which are not in the catalogue.
        $owner->syncPermissions(Permission::query()->where('guard_name', 'api')->pluck('name')->all());

        // Manager and Employee get defaults only when first created, so the Owner's
        // later customisation is never overwritten by re-seeding.
        $defaults = [
            SystemRole::MANAGER => PermissionCatalog::managerDefaults(),
            SystemRole::EMPLOYEE => PermissionCatalog::employeeDefaults(),
        ];

        foreach ($defaults as $name => $permissions) {
            $role = Role::query()->firstOrCreate(['name' => $name, 'guard_name' => 'api']);

            if ($role->wasRecentlyCreated) {
                $role->syncPermissions($permissions);
            }
        }

        $cache->forget();
    }
}
