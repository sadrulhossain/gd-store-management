<?php

use App\Models\User;
use App\Policies\UserPolicy;
use Spatie\Permission\Models\Role;

it('lets an owner manage every role', function () {
    $this->actingAsRole('owner');
    $manager = $this->makeUser('manager');

    $this->putJson("/api/v1/users/{$manager->id}", ['name' => 'Renamed'])->assertOk();
    $this->postJson('/api/v1/users', ['name' => 'Second Owner', 'username' => 'owner2', 'password' => 'Secret123', 'role' => 'owner'])
        ->assertCreated();
});

it('lets a manager manage only employees', function () {
    $this->actingAsRole('manager');
    $employee = $this->makeUser('employee');
    $otherManager = $this->makeUser('manager');
    $owner = $this->makeUser('owner');

    $this->putJson("/api/v1/users/{$employee->id}", ['name' => 'Edited'])->assertOk();
    $this->putJson("/api/v1/users/{$otherManager->id}", ['name' => 'Nope'])->assertForbidden();
    $this->putJson("/api/v1/users/{$owner->id}", ['name' => 'Nope'])->assertForbidden();
    $this->patchJson("/api/v1/users/{$otherManager->id}/status", ['is_active' => false])->assertForbidden();
});

it('stops a manager creating users above the employee role', function () {
    $this->actingAsRole('manager');

    foreach (['manager', 'owner'] as $role) {
        $this->postJson('/api/v1/users', ['name' => 'X', 'username' => "x-{$role}", 'password' => 'Secret123', 'role' => $role])
            ->assertForbidden();
    }

    $this->postJson('/api/v1/users', ['name' => 'Staff', 'username' => 'staff', 'password' => 'Secret123', 'role' => 'employee'])
        ->assertCreated();
});

it('stops a manager promoting an employee', function () {
    $this->actingAsRole('manager');
    $employee = $this->makeUser('employee');

    $this->putJson("/api/v1/users/{$employee->id}", ['role' => 'manager'])->assertForbidden();
    $this->putJson("/api/v1/users/{$employee->id}", ['role' => 'owner'])->assertForbidden();

    expect($employee->fresh()->roleName())->toBe('employee');
});

it('stops a custom role holder escalating even with users permissions', function () {
    Role::create(['name' => 'supervisor', 'guard_name' => 'api'])
        ->givePermissionTo(['users.view', 'users.create', 'users.update', 'users.delete']);
    $this->actingAsRole('supervisor');
    $employee = $this->makeUser('employee');

    $this->putJson("/api/v1/users/{$employee->id}", ['name' => 'Nope'])->assertForbidden();
    $this->postJson('/api/v1/users', ['name' => 'X', 'username' => 'xyz', 'password' => 'Secret123', 'role' => 'employee'])->assertForbidden();
    $this->deleteJson("/api/v1/users/{$employee->id}")->assertForbidden();
});

it('never lets anyone delete themselves', function () {
    $owner = $this->actingAsRole('owner');
    $this->makeUser('owner');

    $this->deleteJson("/api/v1/users/{$owner->id}")->assertForbidden();
    expect(User::find($owner->id))->not->toBeNull();
});

it('never lets anyone deactivate themselves', function () {
    $owner = $this->actingAsRole('owner');
    $this->makeUser('owner');

    $this->patchJson("/api/v1/users/{$owner->id}/status", ['is_active' => false])->assertForbidden();
    $this->putJson("/api/v1/users/{$owner->id}", ['is_active' => false])->assertForbidden();
    expect($owner->fresh()->is_active)->toBeTrue();
});

it('never lets anyone change their own role', function () {
    $owner = $this->actingAsRole('owner');
    $this->makeUser('owner');

    $this->putJson("/api/v1/users/{$owner->id}", ['role' => 'employee'])->assertForbidden();
    expect($owner->fresh()->roleName())->toBe('owner');
});

it('lets one owner demote or deactivate another while two owners are active', function () {
    $this->actingAsRole('owner');
    $other = $this->makeUser('owner');

    $this->putJson("/api/v1/users/{$other->id}", ['role' => 'manager'])->assertOk();
    expect($other->fresh()->roleName())->toBe('manager');
});

it('protects the last active owner from deletion, deactivation and demotion at the policy level', function () {
    $policy = app(UserPolicy::class);
    $sole = $this->makeUser('owner');
    $inactiveOwner = $this->makeUser('owner', ['is_active' => false]);

    expect($policy->isLastActiveOwner($sole))->toBeTrue()
        ->and($policy->delete($inactiveOwner, $sole))->toBeFalse()
        ->and($policy->setStatus($inactiveOwner, $sole, false))->toBeFalse()
        ->and($policy->assignRole($inactiveOwner, 'manager', $sole))->toBeFalse()
        ->and($policy->assignRole($inactiveOwner, 'owner', $sole))->toBeTrue();

    $second = $this->makeUser('owner');

    expect($policy->isLastActiveOwner($sole))->toBeFalse()
        ->and($policy->delete($second, $sole))->toBeTrue()
        ->and($policy->setStatus($second, $sole, false))->toBeTrue();
});

it('ignores inactive and soft-deleted owners when counting active owners', function () {
    $policy = app(UserPolicy::class);
    $sole = $this->makeUser('owner');
    $this->makeUser('owner', ['is_active' => false]);
    $this->makeUser('owner')->delete();

    expect($policy->isLastActiveOwner($sole))->toBeTrue();
});

it('blocks resetting your own password through the admin endpoint and from non-owners by default', function () {
    $owner = $this->actingAsRole('owner');

    $this->postJson("/api/v1/users/{$owner->id}/reset-password", ['password' => 'Reset12345'])->assertForbidden();

    $this->actingAsRole('manager');
    $employee = $this->makeUser('employee');
    $this->postJson("/api/v1/users/{$employee->id}/reset-password", ['password' => 'Reset12345'])->assertForbidden();
});
