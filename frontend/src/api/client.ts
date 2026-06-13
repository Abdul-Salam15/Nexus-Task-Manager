import axios from 'axios';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const client = axios.create({ baseURL: `${BASE}/api` });

client.interceptors.request.use(cfg => {
  const token = localStorage.getItem('nexus_access_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

let refreshing: Promise<string> | null = null;

client.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (!refreshing) {
        refreshing = (async () => {
          const rt = localStorage.getItem('nexus_refresh_token');
          if (!rt) throw new Error('No refresh token');
          const res = await axios.post(`${BASE}/api/auth/refresh`, { refreshToken: rt });
          const at = res.data.accessToken;
          localStorage.setItem('nexus_access_token', at);
          return at;
        })().finally(() => { refreshing = null; });
      }
      try {
        const at = await refreshing;
        original.headers.Authorization = `Bearer ${at}`;
        return client(original);
      } catch {
        localStorage.removeItem('nexus_access_token');
        localStorage.removeItem('nexus_refresh_token');
        window.dispatchEvent(new Event('nexus:logout'));
        return Promise.reject(err);
      }
    }
    return Promise.reject(err);
  }
);

export default client;
