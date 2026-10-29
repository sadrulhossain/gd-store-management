<?php

use App\Support\PermissionCatalog;
use Spatie\Permission\Models\Role;

it('lists roles with user and permission counts', function () {
    $this->actingAsRole('owner');

    $roles = collect($this->getJson('/api/v1/roles')->assertOk()->json('data'))->keyBy('name');

    expect($roles->keys()->all())->toContain('owner', 'manager', 'employee')
        ->and($roles['owner']['is_system'])->toBeTrue()
        ->and($roles['owner']['permissions_count'])->toBe(count(PermissionCatalog::names()))
        ->and($roles['employee']['permissions_count'])->toBe(count(PermissionCatalog::employeeDefaults()));
});

it('creates a custom role with permissions and a changed role takes effect immediately', function () {
    $this->actingAsRole('owner');

    $this->postJson('/api/v1/roles', ['name' => 'stock-keeper', 'permissions' => ['inventory.view', 'inventory.adjust']])
        ->assertCreated()
        ->assertJsonPath('data.name', 'stock-keeper')
        ->assertJsonPath('data.is_system', false)
        ->assertJsonPath('data.permissions', ['inventory.adjust', 'inventory.view']);

    $user = $this->makeUser('stock-keeper');
    expect($user->can('inventory.adjust'))->toBeTrue();

    $role = Role::findByName('stock-keeper', 'api');
    $this->putJson("/api/v1/roles/{$role->id}", ['permissions' => ['inventory.view']])->assertOk();

    expect($user->fresh()->can('inventory.adjust'))->toBeFalse();
});

it('validates role names and unknown permissions', function () {
    $this->actingAsRole('owner');

    $this->postJson('/api/v1/roles', ['name' => 'Bad Name!', 'permissions' => ['nope.nope']])
        ->assertStatus(422)->assertJsonValidationErrors(['name', 'permissions.0']);

    $this->postJson('/api/v1/roles', ['name' => 'owner', 'permissions' => []])
        ->assertStatus(422)->assertJsonValidationErrors('name');
});

it('does not allow system roles to be renamed or deleted', function () {
    $this->actingAsRole('owner');
    $manager = Role::findByName('manager', 'api');

    $this->putJson("/api/v1/roles/{$manager->id}", ['name' => 'boss'])->assertStatus(409);
    $this->deleteJson("/api/v1/roles/{$manager->id}")->assertStatus(409);

    foreach (['owner', 'employee'] as $name) {
        $role = Role::findByName($name, 'api');
        $this->deleteJson("/api/v1/roles/{$role->id}")->assertStatus(409);
    }

    expect(Role::query()->whereIn('name', ['owner', 'manager', 'employee'])->count())->toBe(3);
});

it('never reduces the Owner permissions', function () {
    $this->actingAsRole('owner');
    $owner = Role::findByName('owner', 'api');

    $this->putJson("/api/v1/roles/{$owner->id}", ['permissions' => ['dashboard.view']])->assertStatus(409);

    expect($owner->fresh()->permissions()->count())->toBe(count(PermissionCatalog::names()));
});

it('lets the Owner customise the Manager role permissions', function () {
    $this->actingAsRole('owner');
    $manager = Role::findByName('manager', 'api');

    $this->putJson("/api/v1/roles/{$manager->id}", ['permissions' => ['dashboard.view', 'pos.sell']])->assertOk();

    expect($manager->fresh()->permissions->pluck('name')->sort()->values()->all())->toBe(['dashboard.view', 'pos.sell']);
});

it('refuses to delete a role that is still assigned to users', function () {
    $this->actingAsRole('owner');
    $role = Role::create(['name' => 'cashier', 'guard_name' => 'api']);
    $this->makeUser('cashier');

    $this->deleteJson("/api/v1/roles/{$role->id}")->assertStatus(409);

    $empty = Role::create(['name' => 'temp', 'guard_name' => 'api']);
    $this->deleteJson("/api/v1/roles/{$empty->id}")->assertOk();
    expect(Role::query()->where('name', 'temp')->exists())->toBeFalse();
});

it('stops a non-owner granting permissions they do not hold', function () {
    $helper = Role::create(['name' => 'role-admin', 'guard_name' => 'api']);
    $helper->givePermissionTo(['roles.view', 'roles.create', 'roles.update', 'dashboard.view']);
    $this->actingAsRole('role-admin');

    $this->postJson('/api/v1/roles', ['name' => 'sneaky', 'permissions' => ['dashboard.view', 'users.delete']])
        ->assertForbidden();

    $this->postJson('/api/v1/roles', ['name' => 'fine', 'permissions' => ['dashboard.view']])->assertCreated();

    $own = Role::findByName('role-admin', 'api');
    $this->putJson("/api/v1/roles/{$own->id}", ['permissions' => ['roles.view', 'roles.update', 'users.delete']])
        ->assertForbidden();
});

it('lists the permission catalogue grouped by module, read-only', function () {
    $this->actingAsRole('owner');

    $groups = collect($this->getJson('/api/v1/permissions')->assertOk()->json('data'))->keyBy('module');

    expect($groups)->toHaveKeys(['dashboard', 'users', 'roles', 'menus', 'pos', 'inventory', 'customers'])
        ->and($groups['users']['label'])->toBe('Users')
        ->and(collect($groups['pos']['permissions'])->pluck('name')->all())
        ->toContain('pos.sell', 'pos.void', 'pos.cashier_session');
});
