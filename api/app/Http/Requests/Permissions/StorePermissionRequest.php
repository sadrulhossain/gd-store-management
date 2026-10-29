<?php

namespace App\Http\Requests\Permissions;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePermissionRequest extends FormRequest
{
    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:100',
                'regex:/^[a-z0-9_]+\.[a-z0-9_]+$/',
                Rule::unique('permissions', 'name')->where('guard_name', 'api'),
            ],
            'module' => ['required', 'string', 'max:100', 'regex:/^[a-z0-9_]+$/'],
            'description' => ['nullable', 'string', 'max:255'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'name.regex' => 'Use the module.action format with lowercase letters, numbers and underscores.',
            'module.regex' => 'Lowercase letters, numbers and underscores only.',
        ];
    }
}
