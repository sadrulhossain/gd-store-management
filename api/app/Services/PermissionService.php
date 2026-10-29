<?php

namespace App\Services;

use App\Models\Permission;
use App\Support\PermissionCatalog;
use Illuminate\Support\Str;

class PermissionService
{
    public function __construct(private readonly PermissionCache $permissionCache) {}

    /** Every permission grouped by module. */
    public function groups(): array
    {
        $labels = PermissionCatalog::modules();

        return Permission::query()
            ->where('guard_name', 'api')
            ->orderBy('module')
            ->orderBy('id')
            ->get()
            ->groupBy('module')
            ->map(fn ($permissions, $module) => [
                'module' => $module,
                'label' => $labels[$module]['label'] ?? Str::headline((string) $module),
                'permissions' => $permissions->map(fn (Permission $permission) => $this->present($permission))->values(),
            ])
            ->values()
            ->all();
    }

    /**
     * Everything the create / edit form needs.
     *
     * @return array{modules: list<array{module: string, label: string}>}
     */
    public function formOptions(): array
    {
        return [
            'modules' => array_map(
                fn (array $group) => ['module' => $group['module'], 'label' => $group['label']],
                $this->groups(),
            ),
        ];
    }

    /** @param  array{name: string, module: string, description?: string|null}  $data */
    public function create(array $data): Permission
    {
        $permission = Permission::query()->create([...$data, 'guard_name' => 'api']);
        $this->permissionCache->forget();

        return $permission;
    }

    /** @param  array{module?: string, description?: string|null}  $data */
    public function update(Permission $permission, array $data): Permission
    {
        $permission->update($data);
        $this->permissionCache->forget();

        return $permission;
    }

    /** @return array{id: int, name: string, module: string|null, action: string, description: string|null} */
    public function present(Permission $permission): array
    {
        return [
            'id' => $permission->id,
            'name' => $permission->name,
            'module' => $permission->module,
            'action' => Str::after($permission->name, '.'),
            'description' => $permission->description,
        ];
    }
}
