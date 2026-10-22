<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RefreshRequest;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuthService;
use App\Services\MenuService;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(
        private readonly AuthService $auth,
        private readonly MenuService $menus,
        private readonly UserService $users,
    ) {}

    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->auth->login($request->string('username')->toString(), $request->string('password')->toString(), $request);
        $user = $result['user'];
        unset($result['user']);

        return response()->json(['data' => [
            ...$result,
            'must_change_password' => $user->must_change_password,
        ]]);
    }

    public function refresh(RefreshRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->auth->refresh($request->string('refresh_token')->toString(), $request)]);
    }

    public function logout(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->auth->logout($user, $request);

        return response()->json(['data' => ['message' => 'Logged out.']]);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user()->load('roles');

        return response()->json(['data' => [
            'user' => new UserResource($user),
            'role' => $user->roleName(),
            'permissions' => $user->getAllPermissions()->pluck('name')->sort()->values(),
            'menu' => $this->menus->treeFor($user),
        ]]);
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $user->forceFill([
            'password' => $request->string('password')->toString(),
            'must_change_password' => false,
        ])->save();

        // Every other session is signed out; this one stays.
        $this->auth->revokeTokens($user, $user->currentAccessTokenId());

        activity('auth')->causedBy($user)->performedOn($user)->event('password_changed')
            ->withProperties(['ip' => $request->ip()])->log('Password changed');

        return response()->json(['data' => ['message' => 'Password updated.']]);
    }

    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $user = $this->users->updateProfile(
            $user,
            $request->validated(),
            $request->file('avatar'),
            $request->boolean('remove_avatar'),
        );

        return response()->json(['data' => new UserResource($user)]);
    }
}
