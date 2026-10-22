<?php

namespace App\Http\Requests\Users;

use App\Models\User;
use App\Rules\UniqueUserField;
use App\Support\PasswordRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        /** @var User $target */
        $target = $this->route('user');

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'username' => ['sometimes', 'required', 'string', 'min:3', 'max:50', 'regex:/^[A-Za-z0-9._-]+$/', new UniqueUserField('username', $target->id)],
            'email' => ['sometimes', 'nullable', 'email:rfc', 'max:255', new UniqueUserField('email', $target->id)],
            'phone' => ['sometimes', 'nullable', 'string', 'max:32', 'regex:/^[0-9+()\-\s]+$/'],
            'password' => ['sometimes', 'required', 'string', PasswordRule::make()],
            'role' => ['sometimes', 'required', 'string', Rule::exists('roles', 'name')->where('guard_name', 'api')],
            'is_active' => ['sometimes', 'boolean'],
            'must_change_password' => ['sometimes', 'boolean'],
            'avatar' => ['nullable', 'file', 'max:'.config('store.uploads.avatar_max_kb')],
            'remove_avatar' => ['sometimes', 'boolean'],
        ];
    }
}
