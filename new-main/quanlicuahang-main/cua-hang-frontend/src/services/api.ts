import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://xemaytungphuong-backend.vercel.app/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const customerService = {
  getAll: () => api.get('/customers'),
  create: (data: any) => api.post('/customers', data),
  delete: (id: number | string) => api.delete(`/customers/${id}`),
};

export const branchService = {
  getAll: () => api.get('/branches'),
  create: (data: any) => api.post('/branches', data),
};

export default api;