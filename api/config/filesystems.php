<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Filesystem Disk
    |--------------------------------------------------------------------------
    |
    | "public" holds images served directly by the gateway at /storage/.
    | "private" holds documents served only through authenticated endpoints.
    |
    */

    'default' => env('FILESYSTEM_DISK', 'private'),

    'disks' => [

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => rtrim(env('STORAGE_PUBLIC_URL', '/storage'), '/'),
            'visibility' => 'public',
            'throw' => false,
            'report' => false,
        ],

        'private' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'visibility' => 'private',
            'throw' => false,
            'report' => false,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Symbolic Links
    |--------------------------------------------------------------------------
    |
    | None: the gateway aliases /storage/ to the public disk, so no
    | storage:link symlink is needed.
    |
    */

    'links' => [],

];
