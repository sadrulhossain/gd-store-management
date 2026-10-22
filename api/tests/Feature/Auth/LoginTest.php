<?php

use App\Models\User;
use Spatie\Activitylog\Models\Activity;

it('logs in with a username in any letter case and returns tokens', function () {
    $user = User::factory()->create(['username' => 'Jane.Doe']);
    $user->assignRole('employee');

    $this->postJson('/api/v1/auth/login', ['username' => 'jane.DOE', 'password' => 'Password123'])
        ->assertOk()
        ->assertJsonStructure(['data' => ['access_token', 'refresh_token', 'expires_in', 'token_type', 'must_change_password']]);

    expect($user->fresh()->last_login_at)->not->toBeNull();
});

it('uses the configured access token lifetime', function () {
    $user = $this->makeUser();

    $this->postJson('/api/v1/auth/login', ['username' => $user->username, 'password' => 'Password123'])
        ->assertOk()
        ->assertJsonPath('data.expires_in', 15 * 60);
});

it('gives the same generic error for a wrong password, unknown user and inactive user', function () {
    $active = $this->makeUser();
    $inactive = $this->makeUser('employee', ['is_active' => false]);

    $responses = [
        $this->postJson('/api/v1/auth/login', ['username' => $active->username, 'password' => 'wrong-password']),
        $this->postJson('/api/v1/auth/login', ['username' => 'nobody-here', 'password' => 'Password123']),
        $this->postJson('/api/v1/auth/login', ['username' => $inactive->username, 'password' => 'Password123']),
    ];

    foreach ($responses as $response) {
        $response->assertUnauthorized()->assertExactJson([
            'message' => 'These credentials do not match our records.',
            'code' => 'invalid_credentials',
        ]);
    }

    expect($inactive->fresh()->last_login_at)->toBeNull();
});

it('does not sign in soft-deleted users', function () {
    $user = $this->makeUser();
    $user->delete();

    $this->postJson('/api/v1/auth/login', ['username' => $user->username, 'password' => 'Password123'])
        ->assertUnauthorized();
});

it('rate limits repeated failures per username and ip', function () {
    $user = $this->makeUser();

    foreach (range(1, 5) as $_) {
        $this->postJson('/api/v1/auth/login', ['username' => $user->username, 'password' => 'bad'])->assertUnauthorized();
    }

    $this->postJson('/api/v1/auth/login', ['username' => $user->username, 'password' => 'Password123'])
        ->assertStatus(429)
        ->assertJsonPath('code', 'too_many_requests')
        ->assertHeader('Retry-After');
});

it('validates the login payload with a 422 envelope', function () {
    $this->postJson('/api/v1/auth/login', [])
        ->assertStatus(422)
        ->assertJsonPath('code', 'validation_failed')
        ->assertJsonValidationErrors(['username', 'password']);
});

it('records login in the activity log', function () {
    $user = $this->makeUser();
    $this->tokenFor($user);

    $entry = Activity::query()->where('log_name', 'auth')->where('event', 'login')->first();

    expect($entry)->not->toBeNull()
        ->and($entry->causer_id)->toBe($user->id);
});
