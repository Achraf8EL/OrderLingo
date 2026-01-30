import { API_URL } from "./utils";

export type ApiError = { detail?: string; error?: string };

async function getToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("orderlingo_token");
}

export async function api<T>(
  path: string,
  init?: RequestInit & { token?: string | null }
): Promise<{ data?: T; error?: ApiError; status: number }> {
  const { token: tokenOverride, ...fetchInit } = init ?? {};
  const token = tokenOverride !== undefined ? tokenOverride : await getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...((fetchInit.headers as Record<string, string>) ?? {}),
  };
  if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;

  const r = await fetch(`${API_URL}${path}`, {
    ...fetchInit,
    headers: { ...headers, ...fetchInit.headers },
  });

  let data: T | ApiError | null = null;
  const ct = r.headers.get("content-type");
  if (ct?.includes("application/json")) {
    data = (await r.json()) as T | ApiError;
  }

  if (!r.ok) {
    const err = data as ApiError;
    return {
      error: err ?? { detail: "Request failed" },
      status: r.status,
    };
  }

  return { data: data as T, status: r.status };
}

// Typed API helpers
export const restos = {
  list: () => api<Restaurant[]>("/restaurants"),
  get: (id: string) => api<Restaurant>(`/restaurants/${id}`),
  create: (body: RestaurantCreate) =>
    api<Restaurant>("/restaurants", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: RestaurantUpdate) =>
    api<Restaurant>(`/restaurants/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getManagers: (id: string) => api<string[]>(`/restaurants/${id}/managers`),
  getStaff: (id: string) => api<string[]>(`/restaurants/${id}/staff`),
};

// Categories
export const categories = {
  list: (restaurantId: string) =>
    api<MenuCategory[]>(`/restaurants/${restaurantId}/menu/categories`),
  create: (restaurantId: string, body: MenuCategoryCreate) =>
    api<MenuCategory>(`/restaurants/${restaurantId}/menu/categories`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (restaurantId: string, categoryId: string, body: MenuCategoryUpdate) =>
    api<MenuCategory>(`/restaurants/${restaurantId}/menu/categories/${categoryId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: (restaurantId: string, categoryId: string) =>
    api<void>(`/restaurants/${restaurantId}/menu/categories/${categoryId}`, {
      method: "DELETE",
    }),
};

// Option Groups
export const optionGroups = {
  list: (restaurantId: string) =>
    api<OptionGroupWithItems[]>(`/restaurants/${restaurantId}/menu/option-groups`),
  create: (restaurantId: string, body: OptionGroupCreate) =>
    api<OptionGroup>(`/restaurants/${restaurantId}/menu/option-groups`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (restaurantId: string, groupId: string, body: OptionGroupUpdate) =>
    api<OptionGroup>(`/restaurants/${restaurantId}/menu/option-groups/${groupId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: (restaurantId: string, groupId: string) =>
    api<void>(`/restaurants/${restaurantId}/menu/option-groups/${groupId}`, {
      method: "DELETE",
    }),
  // Option items within a group
  createOption: (restaurantId: string, groupId: string, body: OptionItemCreate) =>
    api<OptionItem>(`/restaurants/${restaurantId}/menu/option-groups/${groupId}/options`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateOption: (restaurantId: string, groupId: string, optionId: string, body: OptionItemUpdate) =>
    api<OptionItem>(`/restaurants/${restaurantId}/menu/option-groups/${groupId}/options/${optionId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteOption: (restaurantId: string, groupId: string, optionId: string) =>
    api<void>(`/restaurants/${restaurantId}/menu/option-groups/${groupId}/options/${optionId}`, {
      method: "DELETE",
    }),
};

// Menu Items
export const menu = {
  list: (restaurantId: string, categoryId?: string) => {
    const params = categoryId ? `?category_id=${categoryId}` : "";
    return api<MenuItem[]>(`/restaurants/${restaurantId}/menu/items${params}`);
  },
  get: (restaurantId: string, itemId: string) =>
    api<MenuItem>(`/restaurants/${restaurantId}/menu/items/${itemId}`),
  create: (restaurantId: string, body: MenuItemCreate) =>
    api<MenuItem>(`/restaurants/${restaurantId}/menu/items`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (restaurantId: string, itemId: string, body: MenuItemUpdate) =>
    api<MenuItem>(`/restaurants/${restaurantId}/menu/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: (restaurantId: string, itemId: string) =>
    api<void>(`/restaurants/${restaurantId}/menu/items/${itemId}`, {
      method: "DELETE",
    }),
};

export const inventory = {
  list: (restaurantId: string) =>
    api<InventoryItem[]>(`/restaurants/${restaurantId}/inventory/items`),
  createItem: (restaurantId: string, body: { name: string; unit?: string }) =>
    api<InventoryItem>(`/restaurants/${restaurantId}/inventory/items`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateLevel: (
    restaurantId: string,
    itemId: string,
    body: { quantity: number; in_stock: boolean }
  ) =>
    api<InventoryLevel>(
      `/restaurants/${restaurantId}/inventory/items/${itemId}/levels`,
      { method: "PUT", body: JSON.stringify(body) }
    ),
  availability: (restaurantId: string) =>
    api<AvailabilityResponse>(`/restaurants/${restaurantId}/availability`),
};

export const orders = {
  list: async (restaurantId: string) => {
    const res = await api<{ orders: Order[] }>(`/restaurants/${restaurantId}/orders`);
    if (res.data) return { ...res, data: res.data.orders };
    return res;
  },
  get: (restaurantId: string, orderId: string) =>
    api<Order>(`/restaurants/${restaurantId}/orders/${orderId}`),
  create: (restaurantId: string, body: OrderCreate) =>
    api<Order>(`/restaurants/${restaurantId}/orders`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateStatus: (
    restaurantId: string,
    orderId: string,
    body: { status: string }
  ) =>
    api<Order>(
      `/restaurants/${restaurantId}/orders/${orderId}/status`,
      { method: "PATCH", body: JSON.stringify(body) }
    ),
};

// Types (match backend schemas)
export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  is_active: boolean;
}

export interface RestaurantCreate {
  name: string;
  slug?: string;
  description?: string;
  is_active?: boolean;
}

export interface RestaurantUpdate {
  name?: string;
  slug?: string;
  description?: string | null;
  is_active?: boolean;
  manager_user_ids?: string[];
  staff_user_ids?: string[];
}

// ============ Menu Category ============
export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  description?: string | null;
  display_order: number;
  is_active: boolean;
}

export interface MenuCategoryCreate {
  name: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface MenuCategoryUpdate {
  name?: string;
  description?: string | null;
  display_order?: number;
  is_active?: boolean;
}

// ============ Option Group ============
export interface OptionGroup {
  id: string;
  restaurant_id: string;
  name: string;
  description?: string | null;
  min_select: number;
  max_select: number;
  is_active: boolean;
}

export interface OptionGroupCreate {
  name: string;
  description?: string;
  min_select?: number;
  max_select?: number;
  is_active?: boolean;
}

export interface OptionGroupUpdate {
  name?: string;
  description?: string | null;
  min_select?: number;
  max_select?: number;
  is_active?: boolean;
}

// ============ Option Item ============
export interface OptionItem {
  id: string;
  group_id: string;
  name: string;
  price_extra: string;
  is_active: boolean;
}

export interface OptionItemCreate {
  name: string;
  price_extra?: string | number;
  is_active?: boolean;
}

export interface OptionItemUpdate {
  name?: string;
  price_extra?: string | number;
  is_active?: boolean;
}

export interface OptionGroupWithItems extends OptionGroup {
  options: OptionItem[];
}

// ============ Menu Item ============
export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id?: string | null;
  label: string;
  description?: string | null;
  price: string;
  image_url?: string | null;
  is_active: boolean;
  display_order: number;
  tags?: string[] | null;
  ingredients?: unknown;
  option_group_ids?: string[] | null;
}

export interface MenuItemCreate {
  label: string;
  description?: string;
  price: string | number;
  image_url?: string;
  is_active?: boolean;
  display_order?: number;
  tags?: string[];
  ingredients?: unknown;
  category_id?: string;
  option_group_ids?: string[];
}

export interface MenuItemUpdate {
  label?: string;
  description?: string | null;
  price?: string | number;
  image_url?: string | null;
  is_active?: boolean;
  display_order?: number;
  tags?: string[];
  ingredients?: unknown;
  category_id?: string | null;
  option_group_ids?: string[];
}

export interface InventoryItem {
  id: string;
  restaurant_id: string;
  name: string;
  unit: string;
  levels?: InventoryLevel[];
}

export interface InventoryLevel {
  id: string;
  inventory_item_id: string;
  quantity: number;
  in_stock: boolean;
}

export interface AvailabilityResponse {
  restaurant_id: string;
  items: { menu_item_id: string; label: string; available: boolean; reason?: string | null; substitutions: unknown[] }[];
}

export interface Order {
  id: string;
  restaurant_id: string;
  status: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: string;
  options?: unknown;
}

export interface OrderCreate {
  items: { menu_item_id: string; quantity: number; options?: unknown }[];
}

export interface KeycloakUser {
  id: string;
  username: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  enabled: boolean;
}

export const users = {
  list: (role?: string) => {
    const params = role ? `?role=${encodeURIComponent(role)}` : "";
    return api<KeycloakUser[]>(`/users${params}`);
  },
};
