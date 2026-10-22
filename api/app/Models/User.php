<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Laravel\Passport\AccessToken;
use Laravel\Passport\Contracts\OAuthenticatable;
use Laravel\Passport\HasApiTokens;
use League\OAuth2\Server\Entities\ClientEntityInterface;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Traits\HasRoles;

/**
 * @property int $id
 * @property string $name
 * @property string $username
 * @property string|null $email
 * @property string|null $phone
 * @property string $password
 * @property string|null $avatar_path
 * @property bool $is_active
 * @property bool $must_change_password
 * @property Carbon|null $last_login_at
 */
class User extends Authenticatable implements OAuthenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, SoftDeletes;

    /** Spatie roles/permissions use the same guard as Passport. */
    protected string $guard_name = 'api';

    protected $fillable = [
        'name',
        'username',
        'email',
        'phone',
        'password',
        'avatar_path',
        'is_active',
        'must_change_password',
        'last_login_at',
    ];

    protected $hidden = ['password'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_active' => 'boolean',
            'must_change_password' => 'boolean',
            'last_login_at' => 'datetime',
        ];
    }

    /**
     * Passport password-grant lookup: case-insensitive username, active users only.
     */
    public function findForPassport(string $username, ClientEntityInterface $client): ?self
    {
        return static::query()
            ->whereRaw('lower(username) = ?', [mb_strtolower(trim($username))])
            ->where('is_active', true)
            ->first();
    }

    public static function findByUsername(string $username): ?self
    {
        return static::query()
            ->whereRaw('lower(username) = ?', [mb_strtolower(trim($username))])
            ->first();
    }

    public function avatarUrl(): ?string
    {
        return $this->avatar_path ? Storage::disk('public')->url($this->avatar_path) : null;
    }

    /** The single role name of this user (users hold exactly one role). */
    public function roleName(): ?string
    {
        /** @var Role|null $role */
        $role = $this->roles->first();

        return $role?->name;
    }

    /** Id of the access token that authenticated the current request, if any. */
    public function currentAccessTokenId(): ?string
    {
        $token = $this->token();

        return $token instanceof AccessToken ? $token->oauth_access_token_id : null;
    }

    public function hasRoleName(string $name): bool
    {
        return $this->roleName() === $name;
    }

    /**
     * @param  Builder<self>  $query
     * @param  string|list<string>|null  $term
     */
    public function scopeSearch(Builder $query, string|array|null $term): void
    {
        $term = is_array($term) ? implode(',', $term) : $term;

        if ($term === null || trim($term) === '') {
            return;
        }

        $like = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], mb_strtolower(trim($term))).'%';

        $query->where(function (Builder $q) use ($like) {
            $q->whereRaw('lower(name) like ?', [$like])
                ->orWhereRaw('lower(username) like ?', [$like])
                ->orWhereRaw('lower(email) like ?', [$like])
                ->orWhereRaw('lower(phone) like ?', [$like]);
        });
    }
}
