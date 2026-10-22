<?php

namespace App\Http\Requests\Menus;

use App\Support\MenuIcons;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMenuRequest extends FormRequest
{
    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'parent_id' => ['nullable', 'integer', Rule::exists('menus', 'id')],
            'key' => ['required', 'string', 'max:100', 'regex:/^[a-z0-9][a-z0-9._-]*$/', Rule::unique('menus', 'key')],
            'title' => ['required', 'string', 'max:100'],
            'icon' => ['nullable', 'string', Rule::in(MenuIcons::all())],
            'path' => ['nullable', 'string', 'max:255', 'regex:/^\/[A-Za-z0-9\/_\-\[\]]*$/'],
            'permission_name' => ['nullable', 'string', Rule::exists('permissions', 'name')->where('guard_name', 'api')],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:100000'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
