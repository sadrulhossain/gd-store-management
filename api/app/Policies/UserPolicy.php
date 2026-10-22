<?php

namespace App\Policies;

use App\Models\User;
use App\Support\SystemRole;

/**
 * Self-protection and hierarchy rules. Whether the actor holds the relevant
 * permission is enforced by the route's permission middleware; this policy decides
 * whether that actor may act on this particular target.
 *
 * - The Owner manages everyone.
 * - A Manager manages only Employees and can assign only the Employee role.
 * - Everyone else manages nobody through /users.
 * - Nobody deletes or deactivates themselves, or changes their own role.
 * - The last active Owner can never be deleted, deactivated or demoted.
 */
class UserPolicy
{
    public function update(User $actor, User $target): bool
    {
        return $this->manages($actor, $target);
    }

    public function delete(User $actor, User $target): bool
    {
        return $actor->isNot($target)
            && $this->manages($actor, $target)
            && ! $this->isLastActiveOwner($target);
    }

    public function setStatus(User $actor, User $target, bool $active): bool
    {
        if (! $this->manages($actor, $target)) {
            return false;
        }

        if ($active) {
            return true;
        }

        return $actor->isNot($target) && ! $this->isLastActiveOwner($target);
    }

    public function resetPassword(User $actor, User $target): bool
    {
        return $actor->isNot($target) && $this->manages($actor, $target);
    }

    /** May the actor give this role to someone (on create, or as a change on $target)? */
    public function assignRole(User $actor, string $roleName, ?User $target = null): bool
    {
        if ($target !== null) {
            if ($actor->is($target)) {
                return $roleName === $target->roleName();
            }

            if ($target->hasRoleName(SystemRole::OWNER) && $roleName !== SystemRole::OWNER
                && $this->isLastActiveOwner($target)) {
                return false;
            }
        }

        return match (true) {
            $actor->hasRoleName(SystemRole::OWNER) => true,
            $actor->hasRoleName(SystemRole::MANAGER) => $roleName === SystemRole::EMPLOYEE,
            default => false,
        };
    }

    public function isLastActiveOwner(User $user): bool
    {
        if (! $user->hasRoleName(SystemRole::OWNER) || ! $user->is_active) {
            return false;
        }

        return User::query()
            ->role(SystemRole::OWNER)
            ->where('is_active', true)
            ->whereKeyNot($user->getKey())
            ->doesntExist();
    }

    private function manages(User $actor, User $target): bool
    {
        return match (true) {
            $actor->hasRoleName(SystemRole::OWNER) => true,
            $actor->hasRoleName(SystemRole::MANAGER) => $actor->isNot($target)
                && $target->hasRoleName(SystemRole::EMPLOYEE),
            default => false,
        };
    }
}
