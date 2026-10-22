<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Support\PermissionCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class PermissionController extends Controller
{
    /** Read-only, grouped by module. Permissions are defined in code (PermissionCatalog). */
    public function index(): JsonResponse
    {
        $labels = PermissionCatalog::modules();

        $groups = Permission::query()
            ->where('guard_name', 'api')
            ->orderBy('module')
            ->orderBy('id')
            ->get()
            ->groupBy('module')
            ->map(fn ($permissions, $module) => [
                'module' => $module,
                'label' => $labels[$module]['label'] ?? Str::headline((string) $module),
                'permissions' => $permissions->map(fn (Permission $permission) => [
                    'name' => $permission->name,
                    'action' => Str::after($permission->name, '.'),
                    'description' => $permission->description,
                ])->values(),
            ])
            ->values();

        return response()->json(['data' => $groups]);
    }
}
