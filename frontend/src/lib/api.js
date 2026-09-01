// Strip any trailing slash — a trailing slash on VITE_API_URL would otherwise
// produce double-slash URLs like https://host//api/..., which Vercel redirects,
// and browsers refuse to follow redirects during a CORS preflight check.
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

function getToken() {
  return localStorage.getItem('anon_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('anon_token', token);
  else localStorage.removeItem('anon_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

export const api = {
  register: (body) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/api/me'),
  getProfile: (username) => request(`/api/users/${username}`),
  sendMessage: (username, text) => request(`/api/users/${username}/messages`, { method: 'POST', body: JSON.stringify({ text }) }),
  getMessages: () => request('/api/messages'),
  react: (id, reaction) => request(`/api/messages/${id}/reaction`, { method: 'PATCH', body: JSON.stringify({ reaction }) }),
  deleteMessage: (id) => request(`/api/messages/${id}`, { method: 'DELETE' }),
  deleteAccount: () => request('/api/me', { method: 'DELETE' }),
};
