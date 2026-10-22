<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * An expected API failure with a stable machine-readable code.
 */
class ApiException extends RuntimeException
{
    /** @param  array<string, string>  $headers */
    public function __construct(
        string $message,
        public readonly int $status,
        public readonly string $errorCode,
        public readonly array $headers = [],
    ) {
        parent::__construct($message);
    }

    public static function invalidCredentials(): self
    {
        return new self('These credentials do not match our records.', 401, 'invalid_credentials');
    }

    public static function invalidRefreshToken(): self
    {
        return new self('The refresh token is invalid or has expired.', 401, 'invalid_refresh_token');
    }

    public static function passwordChangeRequired(): self
    {
        return new self('You must change your password before continuing.', 403, 'password_change_required');
    }

    public static function forbidden(string $message = 'This action is unauthorized.'): self
    {
        return new self($message, 403, 'forbidden');
    }

    public static function conflict(string $message): self
    {
        return new self($message, 409, 'conflict');
    }

    public static function tooManyAttempts(int $seconds): self
    {
        return new self(
            "Too many attempts. Please try again in {$seconds} seconds.",
            429,
            'too_many_requests',
            ['Retry-After' => (string) $seconds],
        );
    }
}
