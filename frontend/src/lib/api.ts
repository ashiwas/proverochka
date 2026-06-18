import axios, { AxiosRequestConfig } from 'axios';
import { useAuth } from '../store/auth';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = useAuth.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Единый «полёт» обновления токена: параллельные 401 ждут один и тот же refresh.
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = useAuth.getState().refreshToken;
  if (!refreshToken) return null;
  try {
    // Голый axios — без перехватчиков, чтобы не зациклить refresh.
    const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
    useAuth.getState().setTokens(data.token, data.refreshToken);
    if (data.user) useAuth.getState().setUser(data.user);
    return data.token as string;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    const url: string = original?.url || '';

    // Не пытаемся обновлять токен для самих эндпоинтов авторизации.
    const isAuthCall = url.includes('/auth/login') || url.includes('/auth/refresh');

    if (status === 401 && !original?._retry && !isAuthCall && useAuth.getState().refreshToken) {
      original._retry = true;
      refreshing = refreshing || refreshAccessToken();
      const newToken = await refreshing;
      refreshing = null;
      if (newToken) {
        original.headers = original.headers || {};
        (original.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      useAuth.getState().logout();
    } else if (status === 401 && !isAuthCall) {
      useAuth.getState().logout();
    }
    return Promise.reject(error);
  },
);

export const apiError = (e: any): string =>
  e?.response?.data?.error || e?.message || 'Произошла ошибка';
