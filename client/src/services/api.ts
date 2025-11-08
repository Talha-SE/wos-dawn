import axios from 'axios'

const baseURL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api'

const api = axios.create({ baseURL })

export function setAuthToken(token?: string) {
  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  else delete api.defaults.headers.common['Authorization']
}

export default api
