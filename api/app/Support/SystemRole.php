<?php

namespace App\Support;

/**
 * The three built-in roles. They cannot be deleted or renamed.
 */
final class SystemRole
{
    public const OWNER = 'owner';

    public const MANAGER = 'manager';

    public const EMPLOYEE = 'employee';

    /** @return list<string> */
    public static function all(): array
    {
        return [self::OWNER, self::MANAGER, self::EMPLOYEE];
    }

    public static function isSystem(string $name): bool
    {
        return in_array($name, self::all(), true);
    }
}
