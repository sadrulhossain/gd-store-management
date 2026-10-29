<?php

use App\Support\PermissionCatalog;
use Spatie\Permission\Models\Role;

/** Every admin route must be protected by the right permission. */
dataset('admin routes', [
    'users index' => ['GET', '/api/v1/users', 'users.view'],
    'users show' => ['GET', '/api/v1/users/1', 'users.view'],
    'users store' => ['POST', '/api/v1/users', 'users.create'],
    'users update' => ['PUT', '/api/v1/users/1', 'users.update'],
    'users status' => ['PATCH', '/api/v1/users/1/status', 'users.update'],
    'users reset' => ['POST', '/api/v1/users/1/reset-password', 'users.reset_password'],
    'users destroy' => ['DELETE', '/api/v1/users/1', 'users.delete'],
    'users create form' => ['GET', '/api/v1/users/create', 'users.create'],
    'users edit form' => ['GET', '/api/v1/users/1/edit', 'users.update'],
    'roles create form' => ['GET', '/api/v1/roles/create', 'roles.create'],
    'roles edit form' => ['GET', '/api/v1/roles/1/edit', 'roles.update'],
    'permissions create form' => ['GET', '/api/v1/permissions/create', 'permissions.create'],
    'permissions edit form' => ['GET', '/api/v1/permissions/1/edit', 'permissions.update'],
    'menus create form' => ['GET', '/api/v1/menus/create', 'menus.create'],
    'menus edit form' => ['GET', '/api/v1/menus/1/edit', 'menus.update'],
    'roles index' => ['GET', '/api/v1/roles', 'roles.view'],
    'roles show' => ['GET', '/api/v1/roles/1', 'roles.view'],
    'roles store' => ['POST', '/api/v1/roles', 'roles.create'],
    'roles update' => ['PUT', '/api/v1/roles/1', 'roles.update'],
    'roles destroy' => ['DELETE', '/api/v1/roles/1', 'roles.delete'],
    'permissions index' => ['GET', '/api/v1/permissions', 'permissions.view'],
    'menus index' => ['GET', '/api/v1/menus', 'menus.view'],
    'menus store' => ['POST', '/api/v1/menus', 'menus.create'],
    'menus reorder' => ['PUT', '/api/v1/menus/reorder', 'menus.update'],
    'menus update' => ['PUT', '/api/v1/menus/1', 'menus.update'],
    'menus destroy' => ['DELETE', '/api/v1/menus/1', 'menus.delete'],
]);

it('rejects unauthenticated calls to every protected route with 401', function (string $method, string $uri) {
    $this->json($method, $uri)->assertUnauthorized()->assertJsonPath('code', 'unauthenticated');
})->with('admin routes');

it('denies an employee every administration route with 403', function (string $method, string $uri) {
    $this->actingAsRole('employee');

    $this->json($method, $uri)->assertForbidden()->assertJsonPath('code', 'forbidden');
})->with('admin routes');

it('allows exactly the permission a route needs', function (string $method, string $uri, string $permission) {
    $role = Role::create(['name' => 'single-purpose', 'guard_name' => 'api']);
    $role->givePermissionTo($permission);
    $this->actingAsRole('single-purpose');

    $status = $this->json($method, $uri)->status();

    // Past the permission gate: validation (422), missing record (404) or success - never 401/403.
    expect($status)->not->toBe(401)->not->toBe(403);
})->with('admin routes');

it('applies a permission change on the very next request', function () {
    $employeeRole = Role::findByName('employee', 'api');
    $this->actingAsRole('employee');

    $this->getJson('/api/v1/users')->assertForbidden();

    $employeeRole->givePermissionTo('users.view');
    $this->getJson('/api/v1/users')->assertOk();

    $employeeRole->revokePermissionTo('users.view');
    $this->getJson('/api/v1/users')->assertForbidden();
});

it('returns the same JSON envelope for unknown routes and methods', function () {
    $this->getJson('/api/v1/does-not-exist')->assertNotFound()->assertJsonPath('code', 'not_found');
    $this->actingAsRole('owner');
    $this->postJson('/api/v1/health')->assertStatus(405)->assertJsonPath('code', 'method_not_allowed');
});

it('covers every catalogued permission with a role-assignable name of the form module.action', function () {
    foreach (PermissionCatalog::names() as $name) {
        expect($name)->toMatch('/^[a-z_]+\.[a-z_]+$/');
    }
});
