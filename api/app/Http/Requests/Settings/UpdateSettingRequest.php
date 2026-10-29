<?php

namespace App\Http\Requests\Settings;

use App\Support\MenuIcons;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSettingRequest extends FormRequest
{
    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        $setting = $this->route('setting');

        return [
            'title' => ['sometimes', 'required', 'string', 'max:100'],
            'key' => [
                'sometimes',
                'required',
                'string',
                'max:100',
                'regex:/^[a-z0-9][a-z0-9._-]*$/',
                Rule::unique('menus', 'key')->ignore($setting->id)
            ],
            'value' => ['sometimes', 'required', 'string'],
            'is_public' => ['sometimes', 'boolean'],
        ];
    }
}
