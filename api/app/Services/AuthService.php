<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Models\User;
use GuzzleHttp\Psr7\Response as PsrResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Laravel\Passport\Passport;
use League\OAuth2\Server\AuthorizationServer;
use League\OAuth2\Server\Exception\OAuthServerException;
use Symfony\Bridge\PsrHttpMessage\Factory\PsrHttpFactory;

/**
 * The only class that talks to Passport to issue, refresh and revoke tokens.
 *
 * Trade-off: the OAuth password grant is deprecated in the OAuth 2.1 draft and
 * Passport's documentation advises against it. It is used here because the portal
 * is first-party and collects credentials itself. To switch to another grant
 * (e.g. authorization code + PKCE), replace issueToken() and the two public
 * methods that call it; controllers, the BFF contract and the rest of the app
 * are unaffected. Tokens are never exposed to browser JavaScript (the portal's
 * server keeps them in httpOnly cookies).
 */
class AuthService
{
    private static ?string $dummyHash = null;

    /**
     * @return array{access_token: string, refresh_token: string, expires_in: int, token_type: string, user: User}
     */
    public function login(string $username, string $password, Request $request): array
    {
        $throttleKey = $this->throttleKey($username, $request);
        $maxAttempts = (int) config('store.auth.login_max_attempts');

        if (RateLimiter::tooManyAttempts($throttleKey, $maxAttempts)) {
            throw ApiException::tooManyAttempts(RateLimiter::availableIn($throttleKey));
        }

        $user = User::findByUsername($username);

        // Always run one hash comparison so unknown users, inactive users and wrong
        // passwords are indistinguishable by response and by timing.
        $hash = $user?->is_active ? $user->password : $this->dummyHash();
        $passwordMatches = Hash::check($password, $hash);

        if (! $user || ! $user->is_active || ! $passwordMatches) {
            RateLimiter::hit($throttleKey, (int) config('store.auth.login_decay_seconds'));

            throw ApiException::invalidCredentials();
        }

        $tokens = $this->issueToken([
            'grant_type' => 'password',
            'username' => $user->username,
            'password' => $password,
            'scope' => '',
        ]);

        RateLimiter::clear($throttleKey);

        $user->forceFill(['last_login_at' => now()])->save();

        activity('auth')
            ->causedBy($user)
            ->performedOn($user)
            ->withProperties(['ip' => $request->ip(), 'user_agent' => $request->userAgent()])
            ->event('login')
            ->log('User logged in');

        return [...$tokens, 'user' => $user];
    }

    /**
     * Exchange a refresh token for a new pair (refresh tokens rotate).
     *
     * @return array{access_token: string, refresh_token: string, expires_in: int, token_type: string}
     */
    public function refresh(string $refreshToken, Request $request): array
    {
        $throttleKey = 'refresh|'.$request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 60)) {
            throw ApiException::tooManyAttempts(RateLimiter::availableIn($throttleKey));
        }

        RateLimiter::hit($throttleKey, 60);

        return $this->issueToken([
            'grant_type' => 'refresh_token',
            'refresh_token' => $refreshToken,
            'scope' => '',
        ], invalidRefresh: true);
    }

    /** Revoke the access token used for this request and its refresh token. */
    public function logout(User $user, Request $request): void
    {
        $tokenId = $user->currentAccessTokenId();

        if ($tokenId !== null) {
            $token = Passport::token()->newQuery()->find($tokenId);
            $token?->revoke();
            $token?->refreshToken?->revoke();
        }

        activity('auth')
            ->causedBy($user)
            ->performedOn($user)
            ->withProperties(['ip' => $request->ip()])
            ->event('logout')
            ->log('User logged out');
    }

    /**
     * Revoke every access and refresh token of a user, optionally keeping one access token.
     */
    public function revokeTokens(User $user, ?string $exceptAccessTokenId = null): void
    {
        $user->tokens()
            ->when($exceptAccessTokenId, fn ($query) => $query->where('id', '!=', $exceptAccessTokenId))
            ->get()
            ->each(function ($token): void {
                $token->revoke();
                $token->refreshToken?->revoke();
            });
    }

    /**
     * The single place that calls Passport's authorization server (in-process, no HTTP hop).
     *
     * @param  array<string, string>  $params
     * @return array{access_token: string, refresh_token: string, expires_in: int, token_type: string}
     */
    private function issueToken(array $params, bool $invalidRefresh = false): array
    {
        $params += [
            'client_id' => (string) config('store.auth.client_id'),
            'client_secret' => (string) config('store.auth.client_secret'),
        ];

        $psrRequest = (new PsrHttpFactory)
            ->createRequest(Request::create('/oauth/token', 'POST', $params))
            ->withParsedBody($params);

        try {
            $response = app(AuthorizationServer::class)
                ->respondToAccessTokenRequest($psrRequest, new PsrResponse);
        } catch (OAuthServerException $e) {
            // invalid_client means the portal client is misconfigured: that is a server error.
            if ($e->getErrorType() === 'invalid_client') {
                throw new \RuntimeException('The Passport portal client is not configured correctly.', 0, $e);
            }

            throw $invalidRefresh ? ApiException::invalidRefreshToken() : ApiException::invalidCredentials();
        }

        /** @var array{access_token: string, refresh_token: string, expires_in: int, token_type: string} $data */
        $data = json_decode((string) $response->getBody(), true, flags: JSON_THROW_ON_ERROR);

        return [
            'access_token' => $data['access_token'],
            'refresh_token' => $data['refresh_token'],
            'expires_in' => (int) $data['expires_in'],
            'token_type' => $data['token_type'],
        ];
    }

    private function throttleKey(string $username, Request $request): string
    {
        return 'login|'.Str::lower(trim($username)).'|'.$request->ip();
    }

    private function dummyHash(): string
    {
        return self::$dummyHash ??= Hash::make(Str::random(32));
    }
}
