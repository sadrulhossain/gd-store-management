<?php

namespace App\Exceptions;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Exceptions\UnauthorizedException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

/**
 * One JSON error envelope for every /api/* route:
 *   { "message": string, "code": string, "errors"?: { field: string[] } }
 * Validation errors keep Laravel's 422 shape (message + errors).
 */
class ApiExceptionRenderer
{
    public function __invoke(Throwable $e, Request $request): ?JsonResponse
    {
        if (! $request->is('api/*')) {
            return null;
        }

        return match (true) {
            $e instanceof ApiException => $this->envelope($e->getMessage(), $e->errorCode, $e->status, headers: $e->headers),
            $e instanceof ValidationException => $this->envelope(
                $e->getMessage(), 'validation_failed', 422, $e->errors(),
            ),
            $e instanceof AuthenticationException => $this->envelope('Unauthenticated.', 'unauthenticated', 401),
            $e instanceof AuthorizationException, $e instanceof UnauthorizedException => $this->envelope(
                'This action is unauthorized.', 'forbidden', 403,
            ),
            $e instanceof ModelNotFoundException, $e instanceof NotFoundHttpException => $this->envelope(
                'Resource not found.', 'not_found', 404,
            ),
            $e instanceof HttpExceptionInterface => $this->envelope(
                $e->getMessage() !== '' ? $e->getMessage() : 'Request failed.',
                $this->codeForStatus($e->getStatusCode()),
                $e->getStatusCode(),
                headers: $e->getHeaders(),
            ),
            default => $this->envelope(
                config('app.debug') ? $e->getMessage() : 'Server error.', 'server_error', 500,
            ),
        };
    }

    /**
     * @param  array<string, array<int, string>>|null  $errors
     * @param  array<string, string>  $headers
     */
    private function envelope(string $message, string $code, int $status, ?array $errors = null, array $headers = []): JsonResponse
    {
        $body = ['message' => $message, 'code' => $code];

        if ($errors !== null) {
            $body['errors'] = $errors;
        }

        return response()->json($body, $status, $headers);
    }

    private function codeForStatus(int $status): string
    {
        return match ($status) {
            401 => 'unauthenticated',
            403 => 'forbidden',
            404 => 'not_found',
            405 => 'method_not_allowed',
            409 => 'conflict',
            413 => 'payload_too_large',
            419 => 'expired',
            429 => 'too_many_requests',
            default => $status >= 500 ? 'server_error' : 'bad_request',
        };
    }
}
