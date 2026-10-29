export interface AuthUser {
  id: number;
  name: string;
  username: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role?: string | null;
  is_active: boolean;
  must_change_password: boolean;
  last_login_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type User = AuthUser;

export interface MenuNode {
  id: number;
  key: string;
  title: string;
  icon: string | null;
  path: string | null;
  children: MenuNode[];
}

export interface Me {
  user: AuthUser;
  role: string | null;
  permissions: string[];
  menu: MenuNode[];
}

export interface Role {
  id: number;
  name: string;
  is_system: boolean;
  users_count?: number;
  permissions_count?: number;
  permissions?: string[];
  created_at: string | null;
  updated_at: string | null;
}

export interface PermissionItem {
  id: number;
  name: string;
  module: string | null;
  action: string;
  description: string | null;
}

export interface PermissionGroup {
  module: string;
  label: string;
  permissions: PermissionItem[];
}

export interface AdminMenu {
  id: number;
  parent_id: number | null;
  key: string;
  title: string;
  icon: string | null;
  path: string | null;
  permission_name: string | null;
  sort_order: number;
  is_active: boolean;
  is_system: boolean;
  children?: AdminMenu[];
}

/** What GET /{resource}/create and /{resource}/{id}/edit send: the record (edit only) and its form options. */
export interface MenuFormData {
  menu?: AdminMenu;
  menu_icons: string[];
  permissions: PermissionGroup[];
  parents: { id: number; title: string }[];
}

export interface RoleFormData {
  role?: Role;
  permissions: PermissionGroup[];
}

export interface UserFormData {
  user?: User;
  roles: string[];
}

export interface PermissionFormData {
  permission?: PermissionItem;
  modules: { module: string; label: string }[];
}

export interface Paginated<T> {
  data: T[];
  /** Index-only extras such as filter choices; present when the endpoint sends them. */
  filters?: { roles: string[] };
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
}

export interface Envelope<T> {
  data: T;
}

export type FieldErrors = Record<string, string[]>;
