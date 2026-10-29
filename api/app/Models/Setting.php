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
    private const string PUBLIC_YES = 'Yes';
    private const string PUBLIC_NO = 'No';
    protected $fillable = ['key', 'value', 'is_public'];

    protected function casts(): array
    {
        return ['is_public' => 'boolean'];
    }

    public function getPublicAttribute(): string
    {
        return $this->is_public ? self::PUBLIC_YES : self::PUBLIC_NO;
    }

    public function scopePublic($query)
    {
        return $query->where('is_public', self::PUBLIC_YES);
    }
}
