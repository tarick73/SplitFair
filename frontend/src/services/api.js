import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

// === Axios instance ===
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // cookies for session-based auth
});

// === CSRF token management ===
let csrfToken = null;

const getCsrfTokenFromCookie = () => {
  const name = 'csrftoken';
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith(name + '=')) {
      return trimmed.substring(name.length + 1);
    }
  }
  return null;
};



export async function createEvent(data) {
  try {
    await ensureCsrfToken();
    const response = await api.post("/api/events/create/", data);
    return response.data;
  } catch (error) {
    console.error("Error creating event:", error);
    throw error;
  }
}


export const fetchCsrfToken = async () => {
  try {
    const response = await api.get('/csrf-token/');
    if (response.data?.csrfToken) {
      csrfToken = response.data.csrfToken;
      return csrfToken;
    }

    // fallback to cookie
    const cookieToken = getCsrfTokenFromCookie();
    if (cookieToken) {
      csrfToken = cookieToken;
      return cookieToken;
    }

    console.error('CSRF token not found!');
    return null;
  } catch (error) {
    const cookieToken = getCsrfTokenFromCookie();
    if (cookieToken) {
      csrfToken = cookieToken;
      return cookieToken;
    }
    throw error;
  }
};

const ensureCsrfToken = async () => {
  if (!csrfToken) await fetchCsrfToken();
  return csrfToken;
};

// === Axios interceptors ===
api.interceptors.request.use(
  async (config) => {
    if (['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
      const token = await ensureCsrfToken();
      if (token) config.headers['X-CSRFToken'] = token;  // 👈 Виправлено на X-CSRFToken
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) csrfToken = null;
    if (error.response?.status === 401) localStorage.removeItem('user');
    return Promise.reject(error);
  }
);

// === Auth service ===
export const authService = {
  async init() {
    await fetchCsrfToken();
  },

  async login(username, password) {
    const token = await ensureCsrfToken();
    if (!token) throw new Error('CSRF token not available');

    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    formData.append('csrfmiddlewaretoken', token);

    const response = await api.post('/api/login/', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (response.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async register(username, email, password) {
    const token = await ensureCsrfToken();
    if (!token) throw new Error('CSRF token not available');

    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('email', email);
    formData.append('password1', password);
    formData.append('password2', password);
    formData.append('csrfmiddlewaretoken', token);

    const response = await api.post('/register/', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (response.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async logout() {
    const token = await ensureCsrfToken();
    const formData = new URLSearchParams();
    formData.append('csrfmiddlewaretoken', token);

    await api.post('/logout/', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    localStorage.removeItem('user');
  },

  getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated() {
    return !!this.getCurrentUser();
  },
};

export default api;
