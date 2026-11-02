import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" }
});

api.interceptors.request.use(config => {
  const token = sessionStorage.getItem("kanban_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authAPI = {
  register: data => api.post("/auth/register", data),
  login: data => api.post("/auth/login", data),
  me: () => api.get("/me")
};

export const boardAPI = {
  list: tenantId => api.get(`/tenants/${tenantId}/boards`),
  create: (tenantId, data) => api.post(`/tenants/${tenantId}/boards`, data),
  update: (tenantId, boardId, data) => api.patch(`/tenants/${tenantId}/boards/${boardId}`, data),
  delete: (tenantId, boardId) => api.delete(`/tenants/${tenantId}/boards/${boardId}`),
  addColumn: (tenantId, boardId, data) => api.post(`/tenants/${tenantId}/boards/${boardId}/columns`, data),
  updateColumn: (tenantId, boardId, columnId, data) => api.patch(`/tenants/${tenantId}/boards/${boardId}/columns/${columnId}`, data),
  deleteColumn: (tenantId, boardId, columnId) => api.delete(`/tenants/${tenantId}/boards/${boardId}/columns/${columnId}`)
};

export const taskAPI = {
  create: (tenantId, data) => api.post(`/tenants/${tenantId}/tasks`, data),
  update: (tenantId, taskId, data) => api.patch(`/tenants/${tenantId}/tasks/${taskId}`, data),
  delete: (tenantId, taskId) => api.delete(`/tenants/${tenantId}/tasks/${taskId}`)
};

export const memberAPI = {
  list: tenantId => api.get(`/tenants/${tenantId}/members`),
  invite: (tenantId, data) => api.post(`/tenants/${tenantId}/members`, data),
  remove: (tenantId, userId) => api.delete(`/tenants/${tenantId}/members/${userId}`)
};

export const activityAPI = {
  list: tenantId => api.get(`/tenants/${tenantId}/activity`)
};


export const organizationAPI = {
  workspaces: () => api.get("/organization/workspaces"),
  createWorkspace: data => api.post("/organization/workspaces", data),
  assignTenantAdmin: (tenantId, data) => api.post(`/organization/workspaces/${tenantId}/admins`, data)
};

export default api;
