<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Services\PermissionCache;
use App\Support\PermissionCatalog;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    public function run(PermissionCache $cache): void
    {
        $now = now();

        $rows = [];
        foreach (PermissionCatalog::all() as $name => $definition) {
            $rows[] = [
                'name' => $name,
                'guard_name' => 'api',
                'module' => $definition['module'],
                'description' => $definition['description'],
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        // One idempotent statement: existing rows only get their grouping metadata refreshed.
        Permission::query()->upsert($rows, ['name', 'guard_name'], ['module', 'description', 'updated_at']);

        $cache->forget();
    }
}
