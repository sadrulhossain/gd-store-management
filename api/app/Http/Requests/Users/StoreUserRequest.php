<?php

namespace App\Http\Requests\Users;

use App\Rules\UniqueUserField;
use App\Support\PasswordRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'min:3', 'max:50', 'regex:/^[A-Za-z0-9._-]+$/', new UniqueUserField('username')],
            'email' => ['nullable', 'email:rfc', 'max:255', new UniqueUserField('email')],
            'phone' => ['nullable', 'string', 'max:32', 'regex:/^[0-9+()\-\s]+$/'],
            'password' => ['required', 'string', PasswordRule::make()],
            'role' => ['required', 'string', Rule::exists('roles', 'name')->where('guard_name', 'api')],
            'is_active' => ['sometimes', 'boolean'],
            'must_change_password' => ['sometimes', 'boolean'],
            'avatar' => ['nullable', 'file', 'max:'.config('store.uploads.avatar_max_kb')],
        ];
    }
}
