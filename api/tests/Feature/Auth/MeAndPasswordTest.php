<?php

use Spatie\Activitylog\Models\Activity;

it('returns the user, role, flat permissions and the visible menu tree', function () {
    $user = $this->actingAsRole('manager');

    $response = $this->getJson('/api/v1/auth/me')
        ->assertOk()
        ->assertJsonPath('data.user.username', $user->username)
        ->assertJsonPath('data.role', 'manager')
        ->assertJsonMissingPath('data.user.password');

    expect($response->json('data.permissions'))->toContain('users.view', 'dashboard.view')
        ->not->toContain('roles.view');
});

it('shows the Administration menu to an owner and hides it from an employee', function () {
    $this->actingAsRole('owner');
    $owner = collect($this->getJson('/api/v1/auth/me')->json('data.menu'))->pluck('key');

    expect($owner)->toContain('dashboard', 'administration', 'profile');

    $this->actingAsRole('employee');
    $employee = collect($this->getJson('/api/v1/auth/me')->json('data.menu'))->pluck('key');

    expect($employee)->toContain('dashboard', 'profile')->not->toContain('administration');
});

it('lets a user with a pending password change reach only the auth endpoints', function () {
    $this->actingAsRole('owner', ['must_change_password' => true]);

    $this->getJson('/api/v1/auth/me')->assertOk()->assertJsonPath('data.user.must_change_password', true);
    $this->getJson('/api/v1/users')->assertForbidden()->assertJsonPath('code', 'password_change_required');
    $this->getJson('/api/v1/menus/my')->assertForbidden()->assertJsonPath('code', 'password_change_required');
});

it('changes the password, clears the forced-change flag and signs other sessions out', function () {
    $user = $this->makeUser('owner', ['must_change_password' => true]);
    $other = $this->tokenFor($user);
    $current = $this->tokenFor($user);

    $this->withToken($current)->putJson('/api/v1/auth/password', [
        'current_password' => 'Password123',
        'password' => 'NewPassw0rd!',
        'password_confirmation' => 'NewPassw0rd!',
    ])->assertOk();

    expect($user->fresh()->must_change_password)->toBeFalse();

    $this->withToken($current)->getJson('/api/v1/users')->assertOk();
    $this->withToken($other)->getJson('/api/v1/auth/me')->assertUnauthorized();

    $this->flushHeaders()->postJson('/api/v1/auth/login', ['username' => $user->username, 'password' => 'NewPassw0rd!'])->assertOk();
    expect(Activity::query()->where('event', 'password_changed')->exists())->toBeTrue();
});

it('rejects a wrong current password, a weak password and a reused password', function () {
    $this->actingAsRole('employee');

    $this->putJson('/api/v1/auth/password', ['current_password' => 'nope', 'password' => 'NewPassw0rd!', 'password_confirmation' => 'NewPassw0rd!'])
        ->assertStatus(422)->assertJsonValidationErrors('current_password');

    $this->putJson('/api/v1/auth/password', ['current_password' => 'Password123', 'password' => 'short', 'password_confirmation' => 'short'])
        ->assertStatus(422)->assertJsonValidationErrors('password');

    $this->putJson('/api/v1/auth/password', ['current_password' => 'Password123', 'password' => 'Password123', 'password_confirmation' => 'Password123'])
        ->assertStatus(422)->assertJsonValidationErrors('password');
});

it('updates the own profile but never the username or role', function () {
    $user = $this->actingAsRole('employee');

    $this->patchJson('/api/v1/auth/profile', [
        'name' => 'New Name',
        'phone' => '+880 1700-000000',
        'username' => 'hijack',
        'role' => 'owner',
    ])->assertOk()->assertJsonPath('data.name', 'New Name');

    $fresh = $user->fresh();
    expect($fresh->name)->toBe('New Name')
        ->and($fresh->username)->toBe($user->username)
        ->and($fresh->roleName())->toBe('employee');
});
