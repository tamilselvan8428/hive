import axios from 'axios'

// Dynamic API URL resolver (supports mobile IP, local override, or default)
export const getApiBaseUrl = () => {
  return localStorage.getItem('api_server_url') || import.meta.env.VITE_API_URL || 'http://10.99.165.134:5000'
}

export const setApiBaseUrl = (url) => {
  if (url) {
    const trimmed = url.trim().replace(/\/+$/, '')
    localStorage.setItem('api_server_url', trimmed)
    api.defaults.baseURL = trimmed
  }
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
})

// Add dynamic baseURL and JWT token to requests if available
api.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl()
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const authAPI = {
  signup: (data) => api.post('/api/auth/signup', data),
  login: (data) => api.post('/api/auth/login', data),
}

export const ledAPI = {
  setLed: (data) => api.post('/api/led', data),
  getLed: (farmId) => api.get(`/api/led/${farmId}`),
}

export const apiKeyAPI = {
  saveKey: (data) => api.post('/api/saveKey', data),
}

export const heaterAPI = {
  getStatus: (farmId) => api.get(farmId ? `/api/heater/status/${farmId}` : '/api/heater/status'),
  setMode: (data) => api.post('/api/heater/mode', data),
  setManual: (data) => api.post('/api/heater/manual', data),
  updateSettings: (data) => api.post('/api/heater/settings', data),
  getLogs: (farmId) => api.get(`/api/heater/logs/${farmId}`),
  sendTelemetry: (data) => api.post('/api/heater/telemetry', data),
}

export const userAPI = {
  getProfile: () => api.get('/api/user/profile'),
  updateProfile: (data) => api.put('/api/user/profile', data),
}

export const notificationAPI = {
  getNotifications: (farmId) => api.get(farmId ? `/api/notifications/${farmId}` : '/api/notifications'),
  markRead: (id) => api.post(`/api/notifications/${id}/read`),
}

export default api
