<?php

namespace App\Http\Requests\Menus;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReorderMenusRequest extends FormRequest
{
    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1', 'max:500'],
            'items.*.id' => ['required', 'integer', 'distinct', Rule::exists('menus', 'id')],
            'items.*.parent_id' => ['nullable', 'integer', Rule::exists('menus', 'id')],
            'items.*.sort_order' => ['required', 'integer', 'min:0', 'max:100000'],
        ];
    }
}
