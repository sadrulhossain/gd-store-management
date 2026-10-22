<?php

namespace App\Http\Requests\Users;

use App\Support\PasswordRule;
use Illuminate\Foundation\Http\FormRequest;

class ResetUserPasswordRequest extends FormRequest
{
    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'password' => ['required', 'string', PasswordRule::make()],
        ];
    }
}
