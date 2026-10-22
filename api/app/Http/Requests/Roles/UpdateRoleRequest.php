<?php

namespace App\Http\Requests\Roles;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRoleRequest extends FormRequest
{
    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        $role = $this->route('role');

        return [
            'name' => [
                'sometimes', 'required', 'string', 'min:2', 'max:50', 'regex:/^[a-z0-9][a-z0-9_-]*$/',
                Rule::unique('roles', 'name')->where('guard_name', 'api')->ignore($role->id),
            ],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string', 'distinct', Rule::exists('permissions', 'name')->where('guard_name', 'api')],
        ];
    }

    public function messages(): array
    {
        return ['name.regex' => 'The name may contain lowercase letters, numbers, hyphens and underscores only.'];
    }
}
