<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Roles\StoreRoleRequest;
use App\Http\Requests\Roles\UpdateRoleRequest;
use App\Http\Resources\RoleResource;
use App\Services\RoleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function __construct(private readonly RoleService $roles) {}

    public function index(): AnonymousResourceCollection
    {
        return RoleResource::collection(
            Role::query()->where('guard_name', 'api')->withCount(['users', 'permissions'])->orderBy('id')->get(),
        );
    }

    /** Form options for a new role. */
    public function create(): JsonResponse
    {
        return response()->json(['data' => $this->roles->formOptions()]);
    }

    /** The role plus the form options for editing it. */
    public function edit(Role $role): JsonResponse
    {
        return response()->json(['data' => [
            'role' => (new RoleResource($role->load('permissions')->loadCount(['users', 'permissions'])))->resolve(),
            ...$this->roles->formOptions(),
        ]]);
    }

    public function show(Role $role): RoleResource
    {
        return new RoleResource($role->load('permissions')->loadCount(['users', 'permissions']));
    }

    public function store(StoreRoleRequest $request): JsonResponse
    {
        $role = $this->roles->create($request->user(), $request->string('name')->toString(), $request->validated('permissions'));

        return (new RoleResource($role->load('permissions')->loadCount(['users', 'permissions'])))
            ->response()->setStatusCode(201);
    }

    public function update(UpdateRoleRequest $request, Role $role): RoleResource
    {
        $role = $this->roles->update(
            $request->user(),
            $role,
            $request->has('name') ? $request->string('name')->toString() : null,
            $request->has('permissions') ? $request->validated('permissions') : null,
        );

        return new RoleResource($role->load('permissions')->loadCount(['users', 'permissions']));
    }

    public function destroy(Request $request, Role $role): JsonResponse
    {
        $this->roles->delete($request->user(), $role);

        return response()->json(['data' => ['message' => 'Role deleted.']]);
    }
}
