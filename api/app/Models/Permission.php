<?php

namespace App\Models;

use Spatie\Permission\Models\Permission as SpatiePermission;

/**
 * Spatie permission extended with grouping metadata.
 *
 * @property string|null $module
 * @property string|null $description
 */
class Permission extends SpatiePermission
{
    protected $fillable = [
        'guard_name',
    ];
    protected $guarded = [];
}
