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

export const auth = {
  login: (nim_nip, password) =>
    API.post('/login', { nim_nip, password }),
};

export const tickets = {
  list: () => API.get('/tickets'),
  active: () => API.get('/tickets/active'),
  create: (data) => API.post('/tickets', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  get: (id) => API.get(`/tickets/${id}`),
  update: (id, data) => API.put(`/tickets/${id}`, data),
  delete: (id) => API.delete(`/tickets/${id}`),
  support: (id) => API.post(`/tickets/${id}/support`),
  unsupport: (id) => API.delete(`/tickets/${id}/support`),
  markDuplicate: (id, duplicate_of) => API.put(`/tickets/${id}/duplicate`, { duplicate_of }),
  stats: () => API.get('/tickets/stats'),
};

export default API;
