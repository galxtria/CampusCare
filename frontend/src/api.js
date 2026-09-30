import axios from 'axios';
import { API_BASE_URL } from './constants';

const API = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const auth = {
  login: (nim_nip, password) =>
    API.post('/login', { nim_nip, password }),
  logout: () => API.post('/logout').catch(() => {}),
  me: () => API.get('/me'),
  updateProfile: (data) => API.put('/profile', data),
  changePassword: (data) => API.put('/change-password', data),
  register: (data) => API.post('/register', data),
  checkNim: (nim_nip) => API.post('/check-nim', { nim_nip }),
};

const unwrapList = (res) => {
  const d = res.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  return [];
};

export const tickets = {
  list: async (params) => {
    const res = await API.get('/tickets', { params });
    const d = res.data;
    if (Array.isArray(d)) return d;
    return res; // paginator: keep full response
  },
  listRaw: (params) => API.get('/tickets', { params }),
  active: () => API.get('/tickets/active'),
  create: (data) => API.post('/tickets', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  get: (id) => API.get(`/tickets/${id}`),
  update: (id, data) => {
    if (data instanceof FormData) return API.post(`/tickets/${id}`, data);
    return API.put(`/tickets/${id}`, data);
  },
  bulkUpdate: (data) => API.put('/tickets/bulk', data),
  delete: (id) => API.delete(`/tickets/${id}`),
  support: (id) => API.post(`/tickets/${id}/support`),
  unsupport: (id) => API.delete(`/tickets/${id}/support`),
  stats: () => API.get('/tickets/stats'),
  comments: (id) => API.get(`/tickets/${id}/comments`),
  addComment: (id, body) => API.post(`/tickets/${id}/comments`, { body }),
  rate: (id, rating, rating_review) => API.put(`/tickets/${id}/rating`, { rating, rating_review }),
};

export const users = {
  list: () => API.get('/users'),
  create: (data) => API.post('/users', data),
  update: (id, data) => API.put(`/users/${id}`, data),
  delete: (id) => API.delete(`/users/${id}`),
  technicians: () => API.get('/technicians'),
  siakadStudents: () => API.get('/siakad/students'),
};

export const rooms = {
  list: () => API.get('/rooms'),
  create: (name) => API.post('/rooms', { name }),
  update: (id, name) => API.put(`/rooms/${id}`, { name }),
  delete: (id) => API.delete(`/rooms/${id}`),
};

export const notifications = {
  list: () => API.get('/notifications'),
  unreadCount: () => API.get('/notifications/unread-count'),
  markRead: (id) => API.put(`/notifications/${id}/read`),
  markAllRead: () => API.put('/notifications/read-all'),
};

export const chat = {
  send: (message, history) => API.post('/chat', { message, history }),
};

export { unwrapList };

export default API;
