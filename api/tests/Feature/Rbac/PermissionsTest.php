<?php

use App\Models\Permission;

it('creates a permission that shows up in the catalogue', function () {
    $this->actingAsRole('owner');

    $this->postJson('/api/v1/permissions', [
        'name' => 'loyalty.redeem',
        'module' => 'loyalty',
        'description' => 'Redeem loyalty points',
    ])->assertCreated()->assertJsonPath('data.name', 'loyalty.redeem');

    $group = collect($this->getJson('/api/v1/permissions')->assertOk()->json('data'))->firstWhere('module', 'loyalty');

    expect($group['permissions'][0]['name'])->toBe('loyalty.redeem');
});

it('edits module and description but never the name', function () {
    $this->actingAsRole('owner');
    $permission = Permission::query()->where('name', 'reports.export')->firstOrFail();

    $this->putJson("/api/v1/permissions/{$permission->id}", [
        'name' => 'reports.hacked',
        'module' => 'analytics',
        'description' => 'Export analytics',
    ])->assertOk()->assertJsonPath('data.module', 'analytics');

    $permission->refresh();
    expect($permission->name)->toBe('reports.export')
        ->and($permission->description)->toBe('Export analytics');
});

it('validates new permissions', function () {
    $this->actingAsRole('owner');

    $this->postJson('/api/v1/permissions', ['name' => 'Bad Name', 'module' => 'Bad Module'])
        ->assertStatus(422)->assertJsonValidationErrors(['name', 'module']);

    $this->postJson('/api/v1/permissions', ['name' => 'users.view', 'module' => 'users'])
        ->assertStatus(422)->assertJsonValidationErrors('name');
});

it('forbids creating and editing without the permission', function () {
    $this->actingAsRole('employee');
    $permission = Permission::query()->firstOrFail();

    $this->postJson('/api/v1/permissions', ['name' => 'a.b', 'module' => 'a'])->assertForbidden();
    $this->putJson("/api/v1/permissions/{$permission->id}", ['module' => 'a'])->assertForbidden();
});
