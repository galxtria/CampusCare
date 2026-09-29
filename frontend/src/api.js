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
  create: (data) => API.post('/tickets', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  get: (id) => API.get(`/tickets/${id}`),
  update: (id, data) => API.put(`/tickets/${id}`, data),
  delete: (id) => API.delete(`/tickets/${id}`),
};

export default API;
