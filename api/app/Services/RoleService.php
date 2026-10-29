<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Models\User;
use App\Support\PermissionCatalog;
use App\Support\SystemRole;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

class RoleService
{
    public function __construct(
        private readonly PermissionCache $permissionCache,
        private readonly PermissionService $permissions,
    ) {}

    /**
     * Everything the create / edit form needs.
     *
     * @return array{permissions: array}
     */
    public function formOptions(): array
    {
        return ['permissions' => $this->permissions->groups()];
    }

    /**
     * Role names, built-in roles first.
     *
     * @return list<string>
     */
    public function options(): array
    {
        $order = [SystemRole::OWNER, SystemRole::MANAGER, SystemRole::EMPLOYEE];

        return Role::query()->where('guard_name', 'api')->pluck('name')
            ->sortBy(fn (string $name) => [array_search($name, $order, true) === false ? 99 : array_search($name, $order, true), $name])
            ->values()
            ->all();
    }

    /**
     * @param  list<string>  $permissions
     */
    public function create(User $actor, string $name, array $permissions): Role
    {
        $this->assertCanGrant($actor, $permissions);

        return DB::transaction(function () use ($actor, $name, $permissions) {
            $role = Role::query()->create(['name' => $name, 'guard_name' => 'api']);
            $role->syncPermissions($permissions);
            $this->permissionCache->forget();

            activity('roles')->causedBy($actor)->performedOn($role)->event('created')
                ->withProperties(['name' => $name, 'permissions' => $permissions])->log('Role created');

            return $role;
        });
    }

    /**
     * @param  list<string>|null  $permissions  null leaves permissions untouched
     */
    public function update(User $actor, Role $role, ?string $name, ?array $permissions): Role
    {
        $isSystem = SystemRole::isSystem($role->name);

        if ($name !== null && $name !== $role->name && $isSystem) {
            throw ApiException::conflict('System roles cannot be renamed.');
        }

        if ($permissions !== null && $role->name === SystemRole::OWNER) {
            $missing = array_diff(PermissionCatalog::names(), $permissions);

            if ($missing !== []) {
                throw ApiException::conflict('The Owner role always keeps every permission.');
            }
        }

        if ($permissions !== null) {
            $this->assertCanGrant($actor, $permissions);
        }

        return DB::transaction(function () use ($actor, $role, $name, $permissions) {
            $before = ['name' => $role->name, 'permissions' => $role->permissions->pluck('name')->sort()->values()->all()];

            if ($name !== null && $name !== $role->name) {
                $role->update(['name' => $name]);
            }

            if ($permissions !== null && $role->name !== SystemRole::OWNER) {
                $role->syncPermissions($permissions);
            }

            $this->permissionCache->forget();

            $role->load('permissions');
            activity('roles')->causedBy($actor)->performedOn($role)->event('updated')
                ->withProperties([
                    'old' => $before,
                    'attributes' => ['name' => $role->name, 'permissions' => $role->permissions->pluck('name')->sort()->values()->all()],
                ])->log('Role updated');

            return $role;
        });
    }

    public function delete(User $actor, Role $role): void
    {
        if (SystemRole::isSystem($role->name)) {
            throw ApiException::conflict('System roles cannot be deleted.');
        }

        if ($role->users()->exists()) {
            throw ApiException::conflict('This role is assigned to users and cannot be deleted.');
        }

        DB::transaction(function () use ($actor, $role): void {
            $name = $role->name;
            $role->delete();
            $this->permissionCache->forget();

            activity('roles')->causedBy($actor)->event('deleted')
                ->withProperties(['name' => $name])->log('Role deleted');
        });
    }

    /**
     * Nobody can hand out a permission they do not hold themselves.
     *
     * @param  list<string>  $permissions
     */
    private function assertCanGrant(User $actor, array $permissions): void
    {
        if ($actor->hasRoleName(SystemRole::OWNER)) {
            return;
        }

        $notHeld = array_diff($permissions, $actor->getAllPermissions()->pluck('name')->all());

        if ($notHeld !== []) {
            throw ApiException::forbidden('You cannot grant permissions you do not hold.');
        }
    }
}
