<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Users\ResetUserPasswordRequest;
use App\Http\Requests\Users\SetUserStatusRequest;
use App\Http\Requests\Users\StoreUserRequest;
use App\Http\Requests\Users\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Policies\UserPolicy;
use App\Services\UserService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class UserController extends Controller
{
    public function __construct(private readonly UserService $users) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = min(max($request->integer('per_page', 15), 1), 100);

        $users = QueryBuilder::for(User::query()->with('roles'))
            ->allowedFilters(
                AllowedFilter::scope('search'),
                AllowedFilter::callback('role', fn ($query, $value) => $query->whereHas(
                    'roles',
                    fn ($roles) => $roles->whereIn('name', (array) $value),
                )),
                AllowedFilter::callback('status', fn ($query, $value) => match ($value) {
                    'active' => $query->where('is_active', true),
                    'inactive' => $query->where('is_active', false),
                    default => $query,
                }),
            )
            ->allowedSorts('name', 'username', 'email', 'created_at', 'last_login_at')
            ->defaultSort('-created_at')
            ->paginate($perPage)
            ->appends($request->query());

        return UserResource::collection($users)->additional(['filters' => $this->users->indexFilters()]);
    }

    /** Form options for a new user. */
    public function create(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->users->formOptions($request->user())]);
    }

    /** The user plus the form options for editing them. */
    public function edit(Request $request, User $user): JsonResponse
    {
        Gate::forUser($request->user())->authorize('update', $user);

        return response()->json(['data' => [
            'user' => (new UserResource($user->load('roles')))->resolve(),
            ...$this->users->formOptions($request->user(), $user),
        ]]);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $this->authorizeAssign($request->user(), $request->string('role')->toString());

        $user = $this->users->create($request->user(), $request->validated(), $request->file('avatar'));

        return (new UserResource($user))->response()->setStatusCode(201);
    }

    public function show(User $user): UserResource
    {
        return new UserResource($user->load('roles'));
    }

    public function update(UpdateUserRequest $request, User $user): UserResource
    {
        $actor = $request->user();
        Gate::forUser($actor)->authorize('update', $user);

        if ($request->has('role') && $request->string('role')->toString() !== $user->roleName()) {
            $this->authorizeAssign($actor, $request->string('role')->toString(), $user);
        }

        if ($request->has('is_active') && $request->boolean('is_active') !== $user->is_active) {
            $this->authorizeStatus($actor, $user, $request->boolean('is_active'));
        }

        $data = $request->validated();

        return new UserResource($this->users->update(
            $actor,
            $user,
            $data,
            $request->file('avatar'),
            $request->boolean('remove_avatar'),
        )->load('roles'));
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        Gate::forUser($request->user())->authorize('delete', $user);

        $this->users->delete($request->user(), $user);

        return response()->json(['data' => ['message' => 'User deleted.']]);
    }

    public function status(SetUserStatusRequest $request, User $user): UserResource
    {
        $active = $request->boolean('is_active');
        $this->authorizeStatus($request->user(), $user, $active);

        return new UserResource($this->users->setActive($request->user(), $user, $active));
    }

    public function resetPassword(ResetUserPasswordRequest $request, User $user): UserResource
    {
        Gate::forUser($request->user())->authorize('resetPassword', $user);

        return new UserResource($this->users->resetPassword(
            $request->user(),
            $user,
            $request->string('password')->toString(),
        ));
    }

    private function authorizeAssign(User $actor, string $role, ?User $target = null): void
    {
        if (! app(UserPolicy::class)->assignRole($actor, $role, $target)) {
            throw new AuthorizationException('You may not assign this role.');
        }
    }

    private function authorizeStatus(User $actor, User $target, bool $active): void
    {
        if (! app(UserPolicy::class)->setStatus($actor, $target, $active)) {
            throw new AuthorizationException('You may not change this user\'s status.');
        }
    }
}
