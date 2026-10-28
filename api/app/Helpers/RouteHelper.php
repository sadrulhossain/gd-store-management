<?php
namespace App\Helpers;

final class RouteHelper
{
    /**
     * @param $prefix
     * @return string
     */
    public static function permissionPrefix($prefix): string
    {
        return "permission:{$prefix}.";
    }
}