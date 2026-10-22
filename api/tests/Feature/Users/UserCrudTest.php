<?php

use App\Models\User;
use Spatie\Activitylog\Models\Activity;

function userPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Rahim Uddin',
        'username' => 'rahim',
        'email' => 'rahim@example.com',
        'phone' => '+880 1711-000000',
        'password' => 'Secret123',
        'role' => 'employee',
    ], $overrides);
}

it('creates a user with a role, a forced password change and an activity entry', function () {
    $owner = $this->actingAsRole('owner');

    $this->postJson('/api/v1/users', userPayload())
        ->assertCreated()
        ->assertJsonPath('data.username', 'rahim')
        ->assertJsonPath('data.role', 'employee')
        ->assertJsonPath('data.must_change_password', true)
        ->assertJsonMissingPath('data.password');

    $created = User::findByUsername('rahim');
    expect($created->roleName())->toBe('employee')
        ->and(Activity::query()->where('event', 'created')->where('causer_id', $owner->id)->exists())->toBeTrue();
});

it('rejects duplicate usernames and emails regardless of letter case', function () {
    $this->actingAsRole('owner');
    $this->makeUser('employee', ['username' => 'Taken.Name', 'email' => 'Taken@Example.com']);

    $this->postJson('/api/v1/users', userPayload(['username' => 'taken.name', 'email' => 'taken@example.com']))
        ->assertStatus(422)
        ->assertJsonValidationErrors(['username', 'email']);
});

it('keeps the username reserved after a user is soft-deleted', function () {
    $this->actingAsRole('owner');
    $gone = $this->makeUser('employee', ['username' => 'ghost']);
    $gone->delete();

    $this->postJson('/api/v1/users', userPayload(['username' => 'ghost']))
        ->assertStatus(422)->assertJsonValidationErrors('username');
});

it('validates fields with Laravel-style 422 errors', function () {
    $this->actingAsRole('owner');

    $this->postJson('/api/v1/users', ['username' => 'a b', 'password' => 'weak', 'role' => 'nonexistent'])
        ->assertStatus(422)
        ->assertJsonPath('code', 'validation_failed')
        ->assertJsonValidationErrors(['name', 'username', 'password', 'role']);
});

it('shows and updates a user and writes old and new values to the activity log', function () {
    $this->actingAsRole('owner');
    $target = $this->makeUser('employee', ['name' => 'Before']);

    $this->getJson("/api/v1/users/{$target->id}")->assertOk()->assertJsonPath('data.name', 'Before');

    $this->putJson("/api/v1/users/{$target->id}", ['name' => 'After', 'phone' => null])
        ->assertOk()->assertJsonPath('data.name', 'After');

    $entry = Activity::query()->where('event', 'updated')->latest('id')->first();
    expect($entry->properties['old']['name'])->toBe('Before')
        ->and($entry->properties['attributes']['name'])->toBe('After');
});

it('soft-deletes a user and revokes their sessions', function () {
    $this->actingAsRole('owner');
    $target = $this->makeUser('employee');
    $targetToken = $this->tokenFor($target);

    $this->deleteJson("/api/v1/users/{$target->id}")->assertOk();

    expect(User::find($target->id))->toBeNull()
        ->and(User::withTrashed()->find($target->id))->not->toBeNull();
    $this->withToken($targetToken)->getJson('/api/v1/auth/me')->assertUnauthorized();
});

it('deactivates and reactivates a user; deactivation ends their sessions', function () {
    $owner = $this->actingAsRole('owner');
    $ownerToken = $this->tokenFor($owner);
    $target = $this->makeUser('employee');
    $targetToken = $this->tokenFor($target);

    $this->withToken($ownerToken)->patchJson("/api/v1/users/{$target->id}/status", ['is_active' => false])
        ->assertOk()->assertJsonPath('data.is_active', false);
    $this->withToken($targetToken)->getJson('/api/v1/auth/me')->assertUnauthorized();

    $this->withToken($ownerToken)->patchJson("/api/v1/users/{$target->id}/status", ['is_active' => true])
        ->assertOk()->assertJsonPath('data.is_active', true);
});

it('resets a password, forces a change and signs the user out', function () {
    $this->actingAsRole('owner');
    $target = $this->makeUser('employee');
    $targetToken = $this->tokenFor($target);

    $this->postJson("/api/v1/users/{$target->id}/reset-password", ['password' => 'Reset12345'])
        ->assertOk()->assertJsonPath('data.must_change_password', true);

    $this->withToken($targetToken)->getJson('/api/v1/auth/me')->assertUnauthorized();
    $this->flushHeaders()->postJson('/api/v1/auth/login', ['username' => $target->username, 'password' => 'Reset12345'])->assertOk();
});

it('lists users with search, role and status filters, sorting and pagination', function () {
    $this->actingAsRole('owner');
    $this->makeUser('employee', ['name' => 'Alice Wonder', 'username' => 'alice', 'email' => 'alice@shop.test', 'phone' => '01711111111']);
    $this->makeUser('employee', ['name' => 'Bob Builder', 'username' => 'bob', 'is_active' => false]);
    $this->makeUser('manager', ['name' => 'Carol Manager', 'username' => 'carol']);

    $names = fn ($response) => collect($response->json('data'))->pluck('username')->all();

    expect($names($this->getJson('/api/v1/users?filter[search]=WONDER')))->toBe(['alice'])
        ->and($names($this->getJson('/api/v1/users?filter[search]=01711111')))->toBe(['alice'])
        ->and($names($this->getJson('/api/v1/users?filter[search]=alice@shop')))->toBe(['alice'])
        ->and($names($this->getJson('/api/v1/users?filter[role]=manager')))->toBe(['carol'])
        ->and($names($this->getJson('/api/v1/users?filter[status]=inactive')))->toBe(['bob'])
        ->and($names($this->getJson('/api/v1/users?filter[role]=employee&sort=-name')))->toBe(['bob', 'alice']);

    $page = $this->getJson('/api/v1/users?per_page=2&sort=username')->assertOk();
    expect($page->json('data'))->toHaveCount(2)
        ->and($page->json('meta.per_page'))->toBe(2)
        ->and($page->json('meta.total'))->toBe(4);
});

it('treats search input literally, not as a LIKE pattern', function () {
    $this->actingAsRole('owner');
    $this->makeUser('employee', ['name' => 'Percent 100%', 'username' => 'pct']);

    $names = collect($this->getJson('/api/v1/users?filter[search]=%25')->json('data'))->pluck('username')->all();

    expect($names)->toBe(['pct']);
});

it('rejects an unknown filter or sort with a 400 envelope', function () {
    $this->actingAsRole('owner');

    $this->getJson('/api/v1/users?filter[password]=x')->assertStatus(400);
    $this->getJson('/api/v1/users?sort=password')->assertStatus(400);
});
