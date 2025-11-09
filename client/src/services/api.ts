import axios from 'axios'

const rawBase = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000'
// Normalize: ensure no trailing slash, and always append '/api'
const normalizedRoot = String(rawBase).replace(/\/$/, '')
const baseURL = `${normalizedRoot}/api`

const api = axios.create({ baseURL })

export function setAuthToken(token?: string) {
  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  else delete api.defaults.headers.common['Authorization']
}

export default api
