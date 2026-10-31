<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /** Every seeder is idempotent: safe to run repeatedly. */
    public function run(): void
    {
        $this->call([
            PermissionSeeder::class,
            RoleSeeder::class,
            MenuSeeder::class,
            AdminUserSeeder::class,
            SettingSeeder::class,
            DemoUserSeeder::class,
            PassportClientSeeder::class,
            ProductCatalogueSeeder::class,
        ]);
    }
}
