<?php

namespace App\Support;

/**
 * Whitelist of lucide icon names a menu item may use.
 * The portal keeps a matching name -> component registry.
 */
final class MenuIcons
{
    /** @return list<string> */
    public static function all(): array
    {
        return [
            'layout-dashboard',
            'users',
            'user-circle',
            'shield',
            'shield-check',
            'key-round',
            'list-tree',
            'settings',
            'package',
            'tags',
            'layers',
            'truck',
            'shopping-cart',
            'boxes',
            'receipt',
            'wallet',
            'banknote',
            'credit-card',
            'clipboard-list',
            'file-text',
            'bar-chart-3',
            'history',
            'store',
            'folder',
            'circle',
        ];
    }

    public static function isAllowed(?string $icon): bool
    {
        return $icon === null || in_array($icon, self::all(), true);
    }
}
