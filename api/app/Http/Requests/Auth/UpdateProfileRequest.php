<?php

namespace App\Http\Requests\Auth;

use App\Rules\UniqueUserField;
use Illuminate\Foundation\Http\FormRequest;

class UpdateProfileRequest extends FormRequest
{
    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        $userId = $this->user()->id;

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'nullable', 'email:rfc', 'max:255', new UniqueUserField('email', $userId)],
            'phone' => ['sometimes', 'nullable', 'string', 'max:32', 'regex:/^[0-9+()\-\s]+$/'],
            'avatar' => ['nullable', 'file', 'max:'.config('store.uploads.avatar_max_kb')],
            'remove_avatar' => ['sometimes', 'boolean'],
        ];
    }
}
