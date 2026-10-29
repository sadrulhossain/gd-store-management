<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Permissions\StorePermissionRequest;
use App\Http\Requests\Permissions\UpdatePermissionRequest;
use App\Models\Permission;
use App\Services\PermissionService;
use Illuminate\Http\JsonResponse;

class PermissionController extends Controller
{
    public function __construct(private readonly PermissionService $permissions) {}

    /** Grouped by module. */
    public function index(): JsonResponse
    {
        return response()->json(['data' => $this->permissions->groups()]);
    }

    /** Form options for a new permission. */
    public function create(): JsonResponse
    {
        return response()->json(['data' => $this->permissions->formOptions()]);
    }

    /** The permission plus the form options for editing it. */
    public function edit(Permission $permission): JsonResponse
    {
        abort_unless($permission->guard_name === 'api', 404);

        return response()->json(['data' => [
            'permission' => $this->permissions->present($permission),
            ...$this->permissions->formOptions(),
        ]]);
    }

    public function store(StorePermissionRequest $request): JsonResponse
    {
        $permission = $this->permissions->create($request->validated());

        return response()->json(['data' => $this->permissions->present($permission)], 201);
    }

    public function update(UpdatePermissionRequest $request, Permission $permission): JsonResponse
    {
        abort_unless($permission->guard_name === 'api', 404);

        $permission = $this->permissions->update($permission, $request->validated());

        return response()->json(['data' => $this->permissions->present($permission)]);
    }
}
