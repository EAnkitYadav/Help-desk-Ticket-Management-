// ─── Types ──────────────────────────────────────────────

export const Role = {
  ADMIN: "ADMIN",
  AGENT: "AGENT",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive?: boolean;
  createdAt?: string;
  _count?: { assignedTickets: number };
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  body?: string; // alias for description, for backward compat
  senderEmail: string;
  senderName: string | null;
  status: "OPEN" | "RESOLVED" | "CLOSED";
  category: "GENERAL_QUESTION" | "TECHNICAL_QUESTION" | "REFUND_REQUEST" | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | null;
  aiSummary: string | null;
  aiSuggestedReply: string | null;
  assignedToId: string | null;
  assignedTo: { id: string; name: string; email: string } | null;
  comments?: Comment[];
  _count?: { comments: number };
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  body: string;
  isInternal: boolean;
  isAiGenerated: boolean;
  ticketId: string;
  authorId: string | null;
  author?: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  stats: {
    total: number;
    open: number;
    resolved: number;
    closed: number;
    unassigned: number;
  };
  byCategory: { category: string | null; count: number }[];
  byPriority: { priority: string | null; count: number }[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── API Client ─────────────────────────────────────────

const API_BASE = "/api";

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("session_token");

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ─── Auth API ───────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () => request<{ message: string }>("/auth/logout", { method: "POST" }),

  getMe: () => request<{ user: User }>("/auth/me"),
};

// ─── Users API ──────────────────────────────────────────

export const usersApi = {
  list: (params?: Record<string, string>) => {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<{
      users: User[];
      pagination?: Pagination;
      stats?: {
        total: number;
        active: number;
        admins: number;
        agents: number;
      };
    }>(`/users${query}`);
  },

  getStats: () =>
    request<{
      stats: {
        total: number;
        active: number;
        admins: number;
        agents: number;
      };
    }>("/users/stats"),

  create: (data: { email: string; password: string; name: string; role?: Role | string }) =>
    request<{ user: User }>("/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<User & { password?: string }>) =>
    request<{ user: User }>(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/users/${id}`, { method: "DELETE" }),
};

// ─── Tickets API ────────────────────────────────────────

export const ticketsApi = {
  list: (params?: Record<string, string>) => {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<{ tickets: Ticket[]; pagination: Pagination }>(`/tickets${query}`);
  },

  get: (id: string) => request<{ ticket: Ticket }>(`/tickets/${id}`),

  create: (data: Partial<Ticket>) =>
    request<{ ticket: Ticket }>("/tickets", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Ticket>) =>
    request<{ ticket: Ticket }>(`/tickets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  addMessage: (ticketId: string, body: string) =>
    request<{ message: Message }>(`/tickets/${ticketId}/messages`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
};

// ─── Dashboard API ──────────────────────────────────────

export const dashboardApi = {
  getStats: () => request<DashboardStats>("/dashboard/stats"),
};
