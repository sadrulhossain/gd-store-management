<?php

use App\Models\Menu;
use Spatie\Permission\Models\Role;

function menuKeys(array $tree): array
{
    return collect($tree)->flatMap(fn ($item) => [$item['key'], ...menuKeys($item['children'])])->all();
}

it('shows each user only the menu items their permissions allow', function () {
    $this->actingAsRole('manager');
    $manager = menuKeys($this->getJson('/api/v1/menus/my')->json('data'));

    // Manager has users.view but not roles/permissions/menus.view.
    expect($manager)->toContain('dashboard', 'administration', 'administration.users', 'profile')
        ->not->toContain('administration.roles', 'administration.permissions', 'administration.menus');

    $this->actingAsRole('employee');
    expect(menuKeys($this->getJson('/api/v1/menus/my')->json('data')))
        ->toBe(['dashboard', 'profile']);

    $this->actingAsRole('owner');
    expect(menuKeys($this->getJson('/api/v1/menus/my')->json('data')))->toContain(
        'administration.users', 'administration.roles', 'administration.permissions', 'administration.menus',
    );
});

it('hides a parent without a visible child and shows a permitted parent', function () {
    Role::create(['name' => 'viewer', 'guard_name' => 'api'])->givePermissionTo('roles.view');
    $this->actingAsRole('viewer');

    $tree = $this->getJson('/api/v1/menus/my')->json('data');
    $admin = collect($tree)->firstWhere('key', 'administration');

    expect(collect($admin['children'])->pluck('key')->all())->toBe(['administration.roles']);
});

it('omits inactive menu items and their children', function () {
    $this->actingAsRole('owner');
    Menu::where('key', 'administration')->update(['is_active' => false]);

    expect(menuKeys($this->getJson('/api/v1/menus/my')->json('data')))
        ->not->toContain('administration', 'administration.users');
});

it('loads the menu without N+1 queries', function () {
    $this->actingAsRole('owner');

    DB::enableQueryLog();
    $this->getJson('/api/v1/menus/my')->assertOk();
    $menuQueries = collect(DB::getQueryLog())->filter(fn ($q) => str_contains($q['query'], '"menus"'))->count();

    expect($menuQueries)->toBe(1);
});

it('creates, updates, reorders and deletes menu items and reflects them in the next request', function () {
    $this->actingAsRole('owner');

    $created = $this->postJson('/api/v1/menus', [
        'key' => 'reports', 'title' => 'Reports', 'icon' => 'bar-chart-3', 'path' => '/reports', 'permission_name' => 'reports.view',
    ])->assertCreated()->assertJsonPath('data.is_system', false)->json('data');

    $this->putJson("/api/v1/menus/{$created['id']}", ['title' => 'Analytics', 'is_active' => false])
        ->assertOk()->assertJsonPath('data.title', 'Analytics');

    $dashboard = Menu::where('key', 'dashboard')->first();
    $this->putJson('/api/v1/menus/reorder', ['items' => [
        ['id' => $created['id'], 'parent_id' => null, 'sort_order' => 1],
        ['id' => $dashboard->id, 'parent_id' => null, 'sort_order' => 2],
    ]])->assertOk();

    expect(Menu::find($created['id'])->sort_order)->toBe(1)->and($dashboard->fresh()->sort_order)->toBe(2);

    $this->deleteJson("/api/v1/menus/{$created['id']}")->assertOk();
    expect(Menu::find($created['id']))->toBeNull();
});

it('keeps system menus from being deleted or re-pointed', function () {
    $this->actingAsRole('owner');
    $users = Menu::where('key', 'administration.users')->first();

    $this->deleteJson("/api/v1/menus/{$users->id}")->assertStatus(409);
    $this->putJson("/api/v1/menus/{$users->id}", ['permission_name' => null, 'path' => '/hacked', 'title' => 'People'])->assertOk();

    $fresh = $users->fresh();
    expect($fresh->permission_name)->toBe('users.view')
        ->and($fresh->path)->toBe('/users')
        ->and($fresh->title)->toBe('People');
});

it('validates menu input: icon whitelist, permission, unique key and nesting depth', function () {
    $this->actingAsRole('owner');
    $users = Menu::where('key', 'administration.users')->first();

    $this->postJson('/api/v1/menus', ['key' => 'x', 'title' => 'X', 'icon' => 'skull', 'permission_name' => 'nope.nope'])
        ->assertStatus(422)->assertJsonValidationErrors(['icon', 'permission_name']);

    $this->postJson('/api/v1/menus', ['key' => 'dashboard', 'title' => 'Dup'])
        ->assertStatus(422)->assertJsonValidationErrors('key');

    // Two levels only: a child cannot have children.
    $this->postJson('/api/v1/menus', ['key' => 'deep', 'title' => 'Deep', 'parent_id' => $users->id])->assertStatus(409);
});

it('rejects a reorder that would create a cycle or deep nesting', function () {
    $this->actingAsRole('owner');
    $admin = Menu::where('key', 'administration')->first();
    $users = Menu::where('key', 'administration.users')->first();

    $this->putJson('/api/v1/menus/reorder', ['items' => [['id' => $admin->id, 'parent_id' => $users->id, 'sort_order' => 1]]])
        ->assertStatus(409);

    $this->putJson('/api/v1/menus/reorder', ['items' => [['id' => $admin->id, 'parent_id' => $admin->id, 'sort_order' => 1]]])
        ->assertStatus(409);
});

it('exposes the icon whitelist', function () {
    $this->actingAsRole('owner');

    expect($this->getJson('/api/v1/menus/icons')->json('data'))->toContain('layout-dashboard', 'users');
});
