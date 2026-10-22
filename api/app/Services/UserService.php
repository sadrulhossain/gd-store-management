<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class UserService
{
    public function __construct(
        private readonly FileStorageService $files,
        private readonly AuthService $auth,
        private readonly PermissionCache $permissionCache,
    ) {}

    /** @param  array<string, mixed>  $data  validated input incl. "role" and optional "avatar" */
    public function create(User $actor, array $data, ?UploadedFile $avatar = null): User
    {
        $avatarPath = $avatar ? $this->storeAvatar($avatar) : null;

        try {
            $user = DB::transaction(function () use ($actor, $data, $avatarPath) {
                $user = User::query()->create([
                    ...Arr::only($data, ['name', 'username', 'email', 'phone', 'password']),
                    'is_active' => $data['is_active'] ?? true,
                    'must_change_password' => $data['must_change_password'] ?? true,
                    'avatar_path' => $avatarPath,
                ]);
                $user->assignRole($data['role']);
                $this->permissionCache->forget();

                activity('users')->causedBy($actor)->performedOn($user)->event('created')
                    ->withProperties(['attributes' => $this->snapshot($user)])->log('User created');

                return $user;
            });
        } catch (\Throwable $e) {
            $this->files->delete(FileStorageService::PUBLIC_DISK, $avatarPath);

            throw $e;
        }

        return $user->load('roles');
    }

    /**
     * @param  array<string, mixed>  $data  validated input; "role", "password" and "is_active" are optional
     */
    public function update(User $actor, User $user, array $data, ?UploadedFile $avatar = null, bool $removeAvatar = false): User
    {
        $oldAvatar = $user->avatar_path;
        $newAvatar = $avatar ? $this->storeAvatar($avatar) : null;

        try {
            DB::transaction(function () use ($actor, $user, $data, $newAvatar, $removeAvatar) {
                $before = $this->snapshot($user);

                $user->fill(Arr::only($data, ['name', 'username', 'email', 'phone', 'password', 'is_active', 'must_change_password']));

                if ($newAvatar !== null) {
                    $user->avatar_path = $newAvatar;
                } elseif ($removeAvatar) {
                    $user->avatar_path = null;
                }

                $roleChanged = isset($data['role']) && $data['role'] !== $user->roleName();
                $deactivated = $user->isDirty('is_active') && ! $user->is_active;
                $passwordChanged = $user->isDirty('password');
                $user->save();

                if ($roleChanged) {
                    $user->syncRoles([$data['role']]);
                    $this->permissionCache->forget();
                }

                if ($deactivated || $passwordChanged) {
                    $this->auth->revokeTokens($user);
                }

                $user->load('roles');
                activity('users')->causedBy($actor)->performedOn($user)->event('updated')
                    ->withProperties(['old' => $before, 'attributes' => $this->snapshot($user)])->log('User updated');
            });
        } catch (\Throwable $e) {
            $this->files->delete(FileStorageService::PUBLIC_DISK, $newAvatar);

            throw $e;
        }

        // The database now points at the new avatar (or none): the old file is garbage.
        if ($oldAvatar !== null && $oldAvatar !== $user->avatar_path) {
            $this->files->delete(FileStorageService::PUBLIC_DISK, $oldAvatar);
        }

        return $user;
    }

    public function setActive(User $actor, User $user, bool $active): User
    {
        $user->forceFill(['is_active' => $active])->save();

        if (! $active) {
            $this->auth->revokeTokens($user);
        }

        activity('users')->causedBy($actor)->performedOn($user)
            ->event($active ? 'activated' : 'deactivated')
            ->log($active ? 'User activated' : 'User deactivated');

        return $user->load('roles');
    }

    public function delete(User $actor, User $user): void
    {
        DB::transaction(function () use ($actor, $user): void {
            $this->auth->revokeTokens($user);
            $user->delete();

            activity('users')->causedBy($actor)->performedOn($user)->event('deleted')
                ->withProperties(['attributes' => $this->snapshot($user)])->log('User deleted');
        });
    }

    /** Administrator reset: sets a new password and forces a change at next login. */
    public function resetPassword(User $actor, User $user, string $password): User
    {
        DB::transaction(function () use ($actor, $user, $password): void {
            $user->forceFill(['password' => $password, 'must_change_password' => true])->save();
            $this->auth->revokeTokens($user);

            activity('users')->causedBy($actor)->performedOn($user)->event('password_reset')
                ->log('Password reset by administrator');
        });

        return $user->load('roles');
    }

    /**
     * Fields recorded in the activity log (never password or file contents).
     *
     * @return array<string, mixed>
     */
    private function snapshot(User $user): array
    {
        return [
            ...$user->only(['name', 'username', 'email', 'phone', 'is_active', 'must_change_password']),
            'has_avatar' => $user->avatar_path !== null,
            'role' => $user->roleName(),
        ];
    }

    private function storeAvatar(UploadedFile $file): string
    {
        $limits = config('store.uploads');

        return $this->files->storeSquareImage(
            $file,
            'avatars',
            $limits['avatar_size'],
            $limits['avatar_max_kb'],
            $limits['avatar_min_pixels'],
            $limits['avatar_max_pixels'],
        );
    }

    /** Used by the self-service profile endpoint. */
    /** @param  array<string, mixed>  $data */
    public function updateProfile(User $user, array $data, ?UploadedFile $avatar, bool $removeAvatar): User
    {
        $oldAvatar = $user->avatar_path;
        $newAvatar = $avatar ? $this->storeAvatar($avatar) : null;

        try {
            $user->fill(Arr::only($data, ['name', 'email', 'phone']));

            if ($newAvatar !== null) {
                $user->avatar_path = $newAvatar;
            } elseif ($removeAvatar) {
                $user->avatar_path = null;
            }

            $before = $user->getOriginal();
            $user->save();
        } catch (\Throwable $e) {
            $this->files->delete(FileStorageService::PUBLIC_DISK, $newAvatar);

            throw $e;
        }

        if ($oldAvatar !== null && $oldAvatar !== $user->avatar_path) {
            $this->files->delete(FileStorageService::PUBLIC_DISK, $oldAvatar);
        }

        activity('users')->causedBy($user)->performedOn($user)->event('profile_updated')
            ->withProperties(['old' => Arr::only($before, ['name', 'email', 'phone']), 'attributes' => $user->only(['name', 'email', 'phone'])])
            ->log('Profile updated');

        return $user->load('roles');
    }
}
