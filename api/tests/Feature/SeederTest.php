<?php

use App\Models\Menu;
use App\Models\Permission;
use App\Models\Setting;
use App\Models\User;
use App\Services\PermissionCache;
use App\Support\PermissionCatalog;
use Database\Seeders\AdminUserSeeder;
use Database\Seeders\DatabaseSeeder;
use Laravel\Passport\Client;
use Spatie\Permission\Models\Role;

function seedCounts(): array
{
    return [
        'users' => User::withTrashed()->count(),
        'roles' => Role::count(),
        'permissions' => Permission::count(),
        'role_permissions' => DB::table('role_has_permissions')->count(),
        'user_roles' => DB::table('model_has_roles')->count(),
        'menus' => Menu::count(),
        'settings' => Setting::count(),
        'clients' => Client::count(),
    ];
}

beforeEach(function () {
    config([
        'store.seed.admin.password' => 'Seed-Pass-123',
        'store.seed.admin.email' => 'owner@example.test',
        'store.seed.demo_password' => 'Demo-Pass-123',
    ]);
});

it('creates no duplicates when the full seeder runs repeatedly', function () {
    $this->seed(DatabaseSeeder::class);
    $first = seedCounts();

    $this->seed(DatabaseSeeder::class);
    $this->seed(DatabaseSeeder::class);

    expect(seedCounts())->toBe($first)
        ->and($first['permissions'])->toBe(count(PermissionCatalog::names()))
        ->and($first['roles'])->toBe(3);
});

it('seeds the primary user as a protected owner who must change the password', function () {
    $this->seed(DatabaseSeeder::class);

    $admin = User::findByUsername(config('store.seed.admin.username'));

    expect($admin->roleName())->toBe('owner')
        ->and($admin->must_change_password)->toBeTrue()
        ->and($admin->is_active)->toBeTrue()
        ->and(Hash::check('Seed-Pass-123', $admin->password))->toBeTrue();
});

it('does not reset a changed admin password when re-seeding', function () {
    $this->seed(DatabaseSeeder::class);
    $admin = User::findByUsername(config('store.seed.admin.username'));
    $admin->update(['password' => 'Changed-By-Owner1', 'must_change_password' => false]);

    $this->seed(DatabaseSeeder::class);

    $admin->refresh();
    expect(Hash::check('Changed-By-Owner1', $admin->password))->toBeTrue()
        ->and($admin->must_change_password)->toBeFalse();
});

it('re-syncs Owner with every permission but leaves customised Manager and Employee alone', function () {
    $this->seed(DatabaseSeeder::class);

    Role::findByName('owner', 'api')->revokePermissionTo('users.delete');
    Role::findByName('manager', 'api')->syncPermissions(['dashboard.view']);
    Role::findByName('employee', 'api')->givePermissionTo('reports.view');

    $this->seed(DatabaseSeeder::class);

    expect(Role::findByName('owner', 'api')->permissions()->count())->toBe(count(PermissionCatalog::names()))
        ->and(Role::findByName('manager', 'api')->permissions->pluck('name')->all())->toBe(['dashboard.view'])
        ->and(Role::findByName('employee', 'api')->hasPermissionTo('reports.view'))->toBeTrue();
});

it('gives Manager and Employee the specified default permissions', function () {
    $this->seed(DatabaseSeeder::class);

    $manager = Role::findByName('manager', 'api');
    $employee = Role::findByName('employee', 'api');

    expect($employee->permissions->pluck('name')->sort()->values()->all())->toBe(collect([
        'dashboard.view', 'pos.sell', 'pos.hold', 'products.view', 'customers.view', 'customers.create', 'inventory.view',
    ])->sort()->values()->all())
        ->and($manager->hasPermissionTo('users.view'))->toBeTrue()
        ->and($manager->hasPermissionTo('users.create'))->toBeTrue()
        ->and($manager->hasPermissionTo('users.update'))->toBeTrue()
        ->and($manager->hasPermissionTo('users.delete'))->toBeFalse()
        ->and($manager->hasPermissionTo('roles.view'))->toBeFalse()
        ->and($manager->hasPermissionTo('reports.view'))->toBeTrue()
        ->and($manager->hasPermissionTo('pos.void'))->toBeTrue();
});

it('keeps menu customisation across re-seeding but restores structure and permission links', function () {
    $this->seed(DatabaseSeeder::class);
    Menu::where('key', 'administration.users')->update(['title' => 'People', 'permission_name' => null, 'path' => '/x']);

    $this->seed(DatabaseSeeder::class);

    $menu = Menu::where('key', 'administration.users')->first();
    expect($menu->title)->toBe('People')
        ->and($menu->permission_name)->toBe('users.view')
        ->and($menu->path)->toBe('/users');
});

it('seeds default settings without overwriting edits', function () {
    $this->seed(DatabaseSeeder::class);
    Setting::where('key', 'store_name')->update(['value' => 'Corner Shop']);

    $this->seed(DatabaseSeeder::class);

    expect(Setting::where('key', 'store_name')->value('value'))->toBe('Corner Shop')
        ->and(Setting::where('key', 'currency_code')->value('value'))->toBe('BDT')
        ->and(Setting::where('key', 'timezone')->value('value'))->toBe('Asia/Dhaka');
});

it('exposes public settings without authentication', function () {
    $this->seed(DatabaseSeeder::class);

    $this->getJson('/api/v1/settings/public')
        ->assertOk()
        ->assertJsonPath('data.currency_code', 'BDT')
        ->assertJsonPath('data.timezone', 'Asia/Dhaka');
});

it('refuses to seed the primary user without a password', function () {
    config(['store.seed.admin.password' => null]);

    $this->seed(DatabaseSeeder::class);
})->throws(RuntimeException::class, 'SEED_ADMIN_PASSWORD is required');

it('refuses the example password in production', function () {
    config(['store.seed.admin.password' => config('store.seed.example_admin_password')]);
    app()['env'] = 'production';

    // Called directly: `db:seed` itself refuses to run unattended in production.
    app(AdminUserSeeder::class)->run(app(PermissionCache::class));
})->throws(RuntimeException::class, 'example value');

it('accepts a real password in production', function () {
    app()['env'] = 'production';

    app(AdminUserSeeder::class)->run(app(PermissionCache::class));

    expect(User::findByUsername(config('store.seed.admin.username'))->roleName())->toBe('owner');
});

it('creates demo users only in the local environment', function () {
    $this->seed(DatabaseSeeder::class);
    expect(User::findByUsername('manager'))->toBeNull();

    app()['env'] = 'local';
    $this->seed(DatabaseSeeder::class);

    expect(User::findByUsername('manager')->roleName())->toBe('manager')
        ->and(User::findByUsername('employee')->roleName())->toBe('employee');
});
