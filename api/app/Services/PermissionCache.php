<?php

namespace App\Services;

use Spatie\Permission\PermissionRegistrar;

/**
 * Every role, permission or menu change must be visible on the next request.
 */
class PermissionCache
{
    public function forget(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
