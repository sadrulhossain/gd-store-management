<?php

namespace App\Support;

/**
 * The single source of truth for permissions. Named "module.action".
 * PermissionSeeder creates them; nothing creates permissions at runtime.
 * Later business phases only attach routes/menus to names listed here.
 */
final class PermissionCatalog
{
    private const CRUD = ['view', 'create', 'update', 'delete'];

    /**
     * module => [label, actions => [action => description]]
     *
     * @return array<string, array{label: string, actions: array<string, string>}>
     */
    public static function modules(): array
    {
        return [
            'dashboard' => self::module('Dashboard', ['view' => 'View the dashboard']),
            'users' => self::module('Users', [
                'view' => 'View users',
                'create' => 'Create users',
                'update' => 'Edit users',
                'delete' => 'Delete users',
                'reset_password' => 'Reset user passwords',
            ]),
            'roles' => self::crud('Roles', 'roles'),
            'permissions' => self::module('Permissions', [
                'view' => 'View the permission catalogue',
                'create' => 'Create permissions',
                'update' => 'Edit permissions',
            ]),
            'menus' => self::crud('Menus', 'menus'),
            'settings' => self::module('Settings', ['view' => 'View settings', 'update' => 'Edit settings']),
            'audit' => self::module('Audit', ['view' => 'View the activity log']),

            'categories' => self::crud('Categories', 'categories'),
            'brands' => self::crud('Brands', 'brands'),
            'units' => self::crud('Units', 'units'),
            'products' => self::crud('Products', 'products'),
            'pricing' => self::module('Pricing', ['view' => 'View pricing', 'update' => 'Change pricing']),

            'suppliers' => self::crud('Suppliers', 'suppliers'),
            'purchase_orders' => self::module('Purchase orders', [
                ...self::actions(self::CRUD, 'purchase orders'),
                'approve' => 'Approve purchase orders',
            ]),
            'purchase_receipts' => self::crud('Purchase receipts', 'purchase receipts'),

            'inventory' => self::module('Inventory', [
                'view' => 'View stock levels',
                'adjust' => 'Adjust stock',
                'approve' => 'Approve stock adjustments',
                'write_off' => 'Write off stock',
                'stocktake' => 'Run stocktakes',
            ]),
            'supplier_payments' => self::module('Supplier payments', [
                'view' => 'View supplier payments',
                'create' => 'Record supplier payments',
                'update' => 'Edit supplier payments',
            ]),

            'pos' => self::module('Point of sale', [
                'sell' => 'Make sales',
                'hold' => 'Hold and resume sales',
                'discount' => 'Apply discounts',
                'override_price' => 'Override item prices',
                'void' => 'Void sales',
                'return' => 'Process returns',
                'cashier_session' => 'Open and close cashier sessions',
            ]),
            'customers' => self::module('Customers', [
                ...self::actions(self::CRUD, 'customers'),
                'credit_payment' => 'Record customer credit payments',
                'credit_limit' => 'Set customer credit limits',
            ]),
            'expenses' => self::crud('Expenses', 'expenses'),
            'reports' => self::module('Reports', ['view' => 'View reports', 'export' => 'Export reports']),
        ];
    }

    /**
     * Flat list: name => [module, description].
     *
     * @return array<string, array{module: string, description: string}>
     */
    public static function all(): array
    {
        $permissions = [];

        foreach (self::modules() as $module => $definition) {
            foreach ($definition['actions'] as $action => $description) {
                $permissions["{$module}.{$action}"] = ['module' => $module, 'description' => $description];
            }
        }

        return $permissions;
    }

    /** @return list<string> */
    public static function names(): array
    {
        return array_keys(self::all());
    }

    /** Administration modules a Manager does not get by default. */
    private const ADMINISTRATION = ['users', 'roles', 'permissions', 'menus', 'settings', 'audit'];

    /** @return list<string> */
    public static function managerDefaults(): array
    {
        $business = array_filter(
            self::names(),
            fn (string $name) => ! in_array(explode('.', $name)[0], self::ADMINISTRATION, true),
        );

        return [...$business, 'users.view', 'users.create', 'users.update'];
    }

    /** @return list<string> */
    public static function employeeDefaults(): array
    {
        return [
            'dashboard.view',
            'pos.sell',
            'pos.hold',
            'products.view',
            'customers.view',
            'customers.create',
            'inventory.view',
        ];
    }

    /**
     * @param  array<string, string>  $actions
     * @return array{label: string, actions: array<string, string>}
     */
    private static function module(string $label, array $actions): array
    {
        return ['label' => $label, 'actions' => $actions];
    }

    /** @return array{label: string, actions: array<string, string>} */
    private static function crud(string $label, string $noun): array
    {
        return self::module($label, self::actions(self::CRUD, $noun));
    }

    /**
     * @param  list<string>  $actions
     * @return array<string, string>
     */
    private static function actions(array $actions, string $noun): array
    {
        $verbs = ['view' => 'View', 'create' => 'Create', 'update' => 'Edit', 'delete' => 'Delete'];

        $described = [];
        foreach ($actions as $action) {
            $described[$action] = "{$verbs[$action]} {$noun}";
        }

        return $described;
    }
}
