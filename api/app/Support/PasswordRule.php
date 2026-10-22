<?php

namespace App\Support;

use Illuminate\Validation\Rules\Password;

final class PasswordRule
{
    public static function make(): Password
    {
        return Password::min(8)->letters()->numbers();
    }
}
