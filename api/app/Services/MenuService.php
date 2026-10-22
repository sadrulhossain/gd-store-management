<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Models\Menu;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class MenuService
{
    public function __construct(private readonly PermissionCache $permissionCache) {}

    /**
     * The menu tree one user may see. A single query loads every active item and the
     * tree is built in memory, so there is no N+1.
     *
     * @return list<array<string, mixed>>
     */
    public function treeFor(User $user): array
    {
        $granted = array_flip($user->getAllPermissions()->pluck('name')->all());
        $byParent = Menu::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->toBase()
            ->groupBy(fn (Menu $menu) => $menu->parent_id ?? 0);

        return $this->visibleBranch($byParent, 0, $granted);
    }

    /**
     * Every menu item (active or not) for administration, as a nested tree.
     *
     * @return Collection<int, Menu>
     */
    public function adminTree(): Collection
    {
        $all = Menu::query()->orderBy('sort_order')->orderBy('id')->get();
        $byParent = $all->groupBy(fn (Menu $menu) => $menu->parent_id ?? 0);

        foreach ($all as $menu) {
            $menu->setRelation('children', $byParent->get($menu->id, collect()));
        }

        return $byParent->get(0, collect());
    }

    /** @param  array<string, mixed>  $data */
    public function create(array $data): Menu
    {
        $this->assertParentAllowed($data['parent_id'] ?? null, null);

        return DB::transaction(function () use ($data) {
            $data['sort_order'] ??= (int) Menu::query()->where('parent_id', $data['parent_id'] ?? null)->max('sort_order') + 1;
            $menu = Menu::query()->create($data + ['is_system' => false]);
            $this->permissionCache->forget();

            return $menu;
        });
    }

    /** @param  array<string, mixed>  $data */
    public function update(Menu $menu, array $data): Menu
    {
        if ($menu->is_system) {
            // System items keep their identity; only presentation can change.
            $data = array_intersect_key($data, array_flip(['title', 'icon', 'sort_order', 'is_active']));
        }

        if (array_key_exists('parent_id', $data)) {
            $this->assertParentAllowed($data['parent_id'], $menu);
        }

        $menu->update($data);
        $this->permissionCache->forget();

        return $menu->refresh();
    }

    public function delete(Menu $menu): void
    {
        if ($menu->is_system) {
            throw ApiException::conflict('System menu items cannot be deleted.');
        }

        $menu->delete();
        $this->permissionCache->forget();
    }

    /**
     * Apply a new ordering/parenting in one transaction.
     *
     * @param  list<array{id: int, parent_id: int|null, sort_order: int}>  $items
     */
    public function reorder(array $items): void
    {
        DB::transaction(function () use ($items): void {
            $parents = collect($items)->mapWithKeys(fn (array $item) => [$item['id'] => $item['parent_id'] ?? null]);

            foreach ($items as $item) {
                $parentId = $item['parent_id'] ?? null;

                if ($parentId === $item['id']) {
                    throw ApiException::conflict('A menu item cannot be its own parent.');
                }

                // Two levels only: a parent must itself be top-level (using the new layout).
                if ($parentId !== null) {
                    $grandParent = $parents->has($parentId)
                        ? $parents->get($parentId)
                        : Menu::query()->whereKey($parentId)->value('parent_id');

                    if ($grandParent !== null) {
                        throw ApiException::conflict('Menus can be nested only one level deep.');
                    }
                }
            }

            foreach ($items as $item) {
                Menu::query()->whereKey($item['id'])->update([
                    'parent_id' => $item['parent_id'] ?? null,
                    'sort_order' => $item['sort_order'],
                ]);
            }
        });

        $this->permissionCache->forget();
    }

    /**
     * @param  Collection<int|string, Collection<int, Menu>>  $byParent
     * @param  array<string, int>  $granted
     * @return list<array<string, mixed>>
     */
    private function visibleBranch(Collection $byParent, int $parentId, array $granted): array
    {
        $branch = [];

        foreach ($byParent->get($parentId, collect()) as $menu) {
            $children = $this->visibleBranch($byParent, $menu->id, $granted);
            $permitted = $menu->permission_name === null
                ? $children !== [] || $menu->path !== null
                : isset($granted[$menu->permission_name]);

            if (! $permitted && $children === []) {
                continue;
            }

            $branch[] = [
                'id' => $menu->id,
                'key' => $menu->key,
                'title' => $menu->title,
                'icon' => $menu->icon,
                'path' => $menu->path,
                'children' => $children,
            ];
        }

        return $branch;
    }

    private function assertParentAllowed(?int $parentId, ?Menu $menu): void
    {
        if ($parentId === null) {
            return;
        }

        if ($menu !== null && $menu->id === $parentId) {
            throw ApiException::conflict('A menu item cannot be its own parent.');
        }

        $parent = Menu::query()->findOrFail($parentId);

        if ($parent->parent_id !== null) {
            throw ApiException::conflict('Menus can be nested only one level deep.');
        }

        if ($menu !== null && $menu->children()->exists()) {
            throw ApiException::conflict('A menu item with children cannot become a child.');
        }
    }
}
