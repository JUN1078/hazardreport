import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
});

// Attach auth token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('safevision_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('safevision_token');
      localStorage.removeItem('safevision_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  register: (data: {
    username: string;
    email: string;
    password: string;
    full_name?: string;
    role?: string;
  }) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

// Inspections
export const inspectionApi = {
  list: (params?: Record<string, string>) =>
    api.get('/inspections', { params }),
  get: (id: number) => api.get(`/inspections/${id}`),
  analyze: (formData: FormData) =>
    api.post('/inspections/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // 2 minutes for AI analysis
    }),
  delete: (id: number) => api.delete(`/inspections/${id}`),
  addHazard: (inspectionId: number, data: object) =>
    api.post(`/inspections/${inspectionId}/hazards`, data),
  updateHazard: (hazardId: number, data: object) =>
    api.put(`/inspections/hazards/${hazardId}`, data),
};

// Dashboard
export const dashboardApi = {
  stats: () => api.get('/dashboard/stats'),
};

// Reports
export const reportApi = {
  downloadPDF: async (inspectionId: number, filename: string) => {
    const response = await api.get(`/reports/${inspectionId}/pdf`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
  downloadExcel: async (inspectionId: number, filename: string) => {
    const response = await api.get(`/reports/${inspectionId}/excel`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
  imageUrl: (inspectionId: number) => `/api/reports/${inspectionId}/image`,
};

export default api;
