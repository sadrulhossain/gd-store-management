<?php

namespace App\Http\Requests\Permissions;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePermissionRequest extends FormRequest
{
    /**
     * The name is not editable: routes, menus and roles refer to it.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'module' => ['sometimes', 'required', 'string', 'max:100', 'regex:/^[a-z0-9_]+$/'],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return ['module.regex' => 'Lowercase letters, numbers and underscores only.'];
    }
}
