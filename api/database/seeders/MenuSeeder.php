<?php

namespace Database\Seeders;

use App\Models\Menu;
use App\Services\PermissionCache;
use Illuminate\Database\Seeder;

class MenuSeeder extends Seeder
{
    /**
     * Menus for the modules built so far. Each is linked to a permission.
     * Later phases add their own entries here (see README: "Adding a module").
     *
     * @return list<array<string, mixed>>
     */
    private function definitions(): array
    {
        return [
            ['key' => 'dashboard', 'title' => 'Dashboard', 'icon' => 'layout-dashboard', 'path' => '/dashboard', 'permission' => 'dashboard.view', 'sort' => 10],
            ['key' => 'administration', 'title' => 'Administration', 'icon' => 'shield', 'path' => null, 'permission' => null, 'sort' => 90, 'children' => [
                ['key' => 'administration.users', 'title' => 'Users', 'icon' => 'users', 'path' => '/users', 'permission' => 'users.view', 'sort' => 10],
                ['key' => 'administration.roles', 'title' => 'Roles', 'icon' => 'shield-check', 'path' => '/roles', 'permission' => 'roles.view', 'sort' => 20],
                ['key' => 'administration.permissions', 'title' => 'Permissions', 'icon' => 'key-round', 'path' => '/permissions', 'permission' => 'permissions.view', 'sort' => 30],
                ['key' => 'administration.menus', 'title' => 'Menus', 'icon' => 'list-tree', 'path' => '/menus', 'permission' => 'menus.view', 'sort' => 40],
            ]],
            ['key' => 'profile', 'title' => 'My Profile', 'icon' => 'user-circle', 'path' => '/profile', 'permission' => null, 'sort' => 100],
        ];
    }

    public function run(PermissionCache $cache): void
    {
        foreach ($this->definitions() as $definition) {
            $parent = $this->upsert($definition, null);

            foreach ($definition['children'] ?? [] as $child) {
                $this->upsert($child, $parent->id);
            }
        }

        $cache->forget();
    }

    /** @param  array<string, mixed>  $definition */
    private function upsert(array $definition, ?int $parentId): Menu
    {
        $menu = Menu::query()->firstOrNew(['key' => $definition['key']]);

        // Presentation (title, icon, order, visibility) is set once so the Owner can
        // customise it; structure and permission linkage are kept authoritative.
        if (! $menu->exists) {
            $menu->fill([
                'title' => $definition['title'],
                'icon' => $definition['icon'],
                'sort_order' => $definition['sort'],
                'is_active' => true,
            ]);
        }

        $menu->fill([
            'parent_id' => $parentId,
            'path' => $definition['path'],
            'permission_name' => $definition['permission'],
            'is_system' => true,
        ])->save();

        return $menu;
    }
}
