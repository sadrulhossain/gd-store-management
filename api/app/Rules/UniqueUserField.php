<?php

namespace App\Rules;

use App\Models\User;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Case-insensitive uniqueness over users, including soft-deleted rows
 * (a deleted user's username/email stays reserved).
 */
class UniqueUserField implements ValidationRule
{
    public function __construct(private readonly string $column, private readonly ?int $ignoreId = null) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || $value === '') {
            return;
        }

        $taken = User::withTrashed()
            ->whereRaw("lower({$this->column}) = ?", [mb_strtolower(trim($value))])
            ->when($this->ignoreId, fn ($query) => $query->whereKeyNot($this->ignoreId))
            ->exists();

        if ($taken) {
            $fail("The {$attribute} has already been taken.");
        }
    }
}
