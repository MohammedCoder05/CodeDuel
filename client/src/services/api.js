import axios from 'axios'

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api`,
  withCredentials: true,
  timeout: 15000,
});

export const authService = {
  async currentUser() { return (await api.get('/auth/me')).data.user },
  async login(credentials) { return (await api.post('/auth/login', credentials)).data },
  async register({ username, email, password }) {
    return (await api.post('/auth/register', { username, email, password })).data
  },
  async logout() { await api.post('/auth/logout') },
}

export function errorMessage(error) {
  return error.response?.data?.message || 'Unable to reach CodeDuel. Please check your connection and try again.'
}
