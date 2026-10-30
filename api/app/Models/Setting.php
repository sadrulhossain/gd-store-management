<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property string $key
 * @property string|null $value
 * @property bool $is_public
 */
class Setting extends Model
{
    protected $fillable = ['key', 'value', 'is_public'];

    protected function casts(): array
    {
        return ['is_public' => 'boolean'];
    }

    public function scopePublic($query)
    {
        return $query->where('is_public', true);
    }
}
