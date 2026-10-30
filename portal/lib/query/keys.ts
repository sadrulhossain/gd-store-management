/** Query-key factory: one place to see (and invalidate) every cached server resource. */

export interface UserListParams {
  page?: number;
  perPage?: number;
  search?: string;
  role?: string;
  status?: string;
  sort?: string;
}

export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  users: {
    all: ["users"] as const,
    list: (params: UserListParams) => ["users", "list", params] as const,
    detail: (id: number | string) => ["users", "detail", String(id)] as const,
    form: (id?: number | string) => ["users", "form", id ?? "new"] as const,
  },
  roles: {
    all: ["roles"] as const,
    list: () => ["roles", "list"] as const,
    detail: (id: number | string) => ["roles", "detail", String(id)] as const,
    form: (id?: number | string) => ["roles", "form", id ?? "new"] as const,
  },
  permissions: {
    all: ["permissions"] as const,
    form: (id?: number | string) => ["permissions", "form", id ?? "new"] as const,
  },
  menus: {
    all: ["menus"] as const,
    admin: () => ["menus", "admin"] as const,
    form: (id?: number | string) => ["menus", "form", id ?? "new"] as const,
  },
  settings: {
    public: ["settings", "public"] as const,
    list: () => ["settings"] as const,
    form: (id?: number | string) => ["settings", "form", id ?? "new"] as const,
  },
};
