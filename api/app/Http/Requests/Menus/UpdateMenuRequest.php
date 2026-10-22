<?php

namespace App\Http\Requests\Menus;

use App\Support\MenuIcons;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMenuRequest extends FormRequest
{
    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        $menu = $this->route('menu');

        return [
            'parent_id' => ['sometimes', 'nullable', 'integer', Rule::exists('menus', 'id')],
            'key' => ['sometimes', 'required', 'string', 'max:100', 'regex:/^[a-z0-9][a-z0-9._-]*$/', Rule::unique('menus', 'key')->ignore($menu->id)],
            'title' => ['sometimes', 'required', 'string', 'max:100'],
            'icon' => ['sometimes', 'nullable', 'string', Rule::in(MenuIcons::all())],
            'path' => ['sometimes', 'nullable', 'string', 'max:255', 'regex:/^\/[A-Za-z0-9\/_\-\[\]]*$/'],
            'permission_name' => ['sometimes', 'nullable', 'string', Rule::exists('permissions', 'name')->where('guard_name', 'api')],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:100000'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
