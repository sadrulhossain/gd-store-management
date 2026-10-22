<?php

use Spatie\Activitylog\Models\Activity;

function loginPair(object $test, $user): array
{
    $data = $test->postJson('/api/v1/auth/login', ['username' => $user->username, 'password' => 'Password123'])
        ->assertOk()->json('data');

    return [$data['access_token'], $data['refresh_token']];
}

it('refreshes tokens and rotates the refresh token', function () {
    [, $refresh] = loginPair($this, $this->makeUser());

    $response = $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $refresh])
        ->assertOk()
        ->assertJsonStructure(['data' => ['access_token', 'refresh_token', 'expires_in']]);

    expect($response->json('data.refresh_token'))->not->toBe($refresh);

    // The rotated-out token cannot be replayed.
    $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $refresh])
        ->assertUnauthorized()
        ->assertJsonPath('code', 'invalid_refresh_token');
});

it('accepts the new access token after a refresh', function () {
    [, $refresh] = loginPair($this, $this->makeUser());

    $access = $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $refresh])->json('data.access_token');

    $this->withToken($access)->getJson('/api/v1/auth/me')->assertOk();
});

it('rejects a garbage refresh token', function () {
    $this->postJson('/api/v1/auth/refresh', ['refresh_token' => 'not-a-real-token'])
        ->assertUnauthorized()
        ->assertJsonPath('code', 'invalid_refresh_token');
});

it('revokes the access and refresh token on logout', function () {
    $user = $this->makeUser();
    [$access, $refresh] = loginPair($this, $user);

    $this->withToken($access)->postJson('/api/v1/auth/logout')->assertOk();

    $this->withToken($access)->getJson('/api/v1/auth/me')->assertUnauthorized();

    // A refresh token cannot be reused after logout.
    $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $refresh])
        ->assertUnauthorized()
        ->assertJsonPath('code', 'invalid_refresh_token');

    expect(Activity::query()->where('event', 'logout')->where('causer_id', $user->id)->exists())->toBeTrue();
});

it('requires authentication for logout', function () {
    $this->postJson('/api/v1/auth/logout')->assertUnauthorized()->assertJsonPath('code', 'unauthenticated');
});

it('stops a deactivated user immediately even with a valid token', function () {
    $user = $this->makeUser();
    [$access] = loginPair($this, $user);

    $user->update(['is_active' => false]);

    $this->withToken($access)->getJson('/api/v1/auth/me')->assertUnauthorized();
});
