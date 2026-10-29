<?php

use App\Models\Permission;
use Spatie\Permission\Models\Role;

it('sends the permission groups with the role create form', function () {
    $this->actingAsRole('owner');

    $this->getJson('/api/v1/roles/create')->assertOk()
        ->assertJsonStructure(['data' => ['permissions' => [['module', 'label', 'permissions']]]]);
});

it('sends the role and permission groups with the role edit form', function () {
    $this->actingAsRole('owner');
    $role = Role::findByName('manager', 'api');

    $this->getJson("/api/v1/roles/{$role->id}/edit")->assertOk()
        ->assertJsonPath('data.role.name', 'manager')
        ->assertJsonStructure(['data' => ['role' => ['permissions'], 'permissions']]);
});

it('sends the modules with the permission create and edit forms', function () {
    $this->actingAsRole('owner');
    $permission = Permission::query()->where('name', 'reports.export')->firstOrFail();

    $this->getJson('/api/v1/permissions/create')->assertOk()
        ->assertJsonStructure(['data' => ['modules' => [['module', 'label']]]]);

    $this->getJson("/api/v1/permissions/{$permission->id}/edit")->assertOk()
        ->assertJsonPath('data.permission.name', 'reports.export')
        ->assertJsonStructure(['data' => ['modules']]);
});

it('offers an owner every role on the user create form', function () {
    $this->actingAsRole('owner');

    $this->getJson('/api/v1/users/create')->assertOk()
        ->assertJsonPath('data.roles', ['owner', 'manager', 'employee']);
});

it('offers a manager only the roles they may assign', function () {
    $this->actingAsRole('manager');

    $this->getJson('/api/v1/users/create')->assertOk()->assertJsonPath('data.roles', ['employee']);
});

it('keeps the current role selectable on the user edit form', function () {
    $this->actingAsRole('manager');
    $employee = $this->makeUser('employee');

    $this->getJson("/api/v1/users/{$employee->id}/edit")->assertOk()
        ->assertJsonPath('data.user.id', $employee->id)
        ->assertJsonPath('data.roles', ['employee']);
});

it('sends the role filter with the user list', function () {
    $this->actingAsRole('owner');

    $this->getJson('/api/v1/users')->assertOk()
        ->assertJsonPath('filters.roles', ['owner', 'manager', 'employee']);
});
