import type { Analytics, BootstrapData, EventInput, Note, SearchResult, TaskInput, User } from "./types";

export const TOKEN_KEY = "dayplanner_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { ...options, headers, cache: "no-store" });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail || body);
    } catch {
      /* empty */
    }
    if (res.status === 401 && path !== "/auth/login") clearToken();
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const body = (data: unknown): RequestInit => ({ body: JSON.stringify(data) });

export const api = {
  auth: {
    register: (data: { name: string; email: string; password: string; timezone?: string }) =>
      request<{ accessToken: string; user: User }>("/auth/register", { method: "POST", ...body(data) }),
    login: (data: { email: string; password: string }) =>
      request<{ accessToken: string; user: User }>("/auth/login", { method: "POST", ...body(data) }),
    me: () => request<User>("/auth/me"),
    update: (data: Partial<User>) => request<User>("/auth/me", { method: "PATCH", ...body(data) }),
  },
  bootstrap: () => request<BootstrapData>("/bootstrap"),
  tasks: {
    create: (data: TaskInput) => request("/tasks", { method: "POST", ...body(data) }),
    update: (id: number, data: TaskInput) => request(`/tasks/${id}`, { method: "PATCH", ...body(data) }),
    delete: (id: number) => request(`/tasks/${id}`, { method: "DELETE" }),
    complete: (id: number, completed = true) => request(`/tasks/${id}/complete`, { method: "PATCH", ...body({ completed }) }),
    addSubtask: (taskId: number, data: { title: string; kind?: string }) => request(`/tasks/${taskId}/subtasks`, { method: "POST", ...body(data) }),
    updateSubtask: (id: number, data: { title?: string; isCompleted?: boolean; kind?: string }) => request(`/tasks/subtasks/${id}`, { method: "PATCH", ...body(data) }),
    deleteSubtask: (id: number) => request(`/tasks/subtasks/${id}`, { method: "DELETE" }),
    reorder: (ids: number[], field = "sort_order") => request("/tasks/reorder", { method: "POST", ...body({ ids, field }) }),
    selectPriority: (taskId: number, rank: number) => request("/tasks/select-priority", { method: "POST", ...body({ taskId, rank }) }),
    addAttachment: (taskId: number, filename: string, dataUrl: string) => request(`/tasks/${taskId}/attachments`, { method: "POST", ...body({ filename, dataUrl }) }),
    deleteAttachment: (id: number) => request(`/tasks/attachments/${id}`, { method: "DELETE" }),
  },
  events: {
    create: (data: EventInput) => request("/events", { method: "POST", ...body(data) }),
    update: (id: number, data: Partial<EventInput>) => request(`/events/${id}`, { method: "PATCH", ...body(data) }),
    delete: (id: number) => request(`/events/${id}`, { method: "DELETE" }),
    duplicate: (id: number) => request(`/events/${id}/duplicate`, { method: "POST" }),
  },
  categories: {
    create: (data: { name: string; color?: string; icon?: string }) => request("/categories", { method: "POST", ...body(data) }),
    update: (id: number, data: { name?: string; color?: string; icon?: string }) => request(`/categories/${id}`, { method: "PATCH", ...body(data) }),
    delete: (id: number) => request(`/categories/${id}`, { method: "DELETE" }),
    reorder: (ids: number[]) => request("/categories/reorder", { method: "POST", ...body({ ids }) }),
  },
  projects: {
    create: (data: Record<string, unknown>) => request("/projects", { method: "POST", ...body(data) }),
    update: (id: number, data: Record<string, unknown>) => request(`/projects/${id}`, { method: "PATCH", ...body(data) }),
    delete: (id: number) => request(`/projects/${id}`, { method: "DELETE" }),
  },
  tags: {
    create: (data: { name: string; color?: string }) => request<{ id: number; name: string; color: string }>("/tags", { method: "POST", ...body(data) }),
    delete: (id: number) => request(`/tags/${id}`, { method: "DELETE" }),
  },
  preferences: {
    update: (data: Record<string, unknown>) => request("/preferences", { method: "PATCH", ...body(data) }),
  },
  notes: {
    create: (data: Partial<Note>) => request("/notes", { method: "POST", ...body(data) }),
    update: (id: number, data: Partial<Note>) => request(`/notes/${id}`, { method: "PATCH", ...body(data) }),
    delete: (id: number) => request(`/notes/${id}`, { method: "DELETE" }),
  },
  reviews: {
    get: (day: string) => request(`/reviews/${day}`),
    save: (day: string, data: Record<string, unknown>) => request(`/reviews/${day}`, { method: "PUT", ...body(data) }),
  },
  timeEntries: {
    create: (data: { taskId?: number | null; minutes: number; note?: string }) => request("/time-entries", { method: "POST", ...body(data) }),
    delete: (id: number) => request(`/time-entries/${id}`, { method: "DELETE" }),
  },
  reminders: {
    update: (id: number, data: Record<string, unknown>) => request(`/reminders/${id}`, { method: "PATCH", ...body(data) }),
  },
  search: (q: string) => request<SearchResult[]>(`/search?q=${encodeURIComponent(q)}`),
  analytics: () => request<Analytics>("/analytics"),
  export: () => request<{ version: number; exportedAt: string; data: BootstrapData }>("/export"),
  import: (payload: unknown) => request("/import", { method: "POST", ...body(payload) }),
  seed: () => request("/seed", { method: "POST" }),
};
