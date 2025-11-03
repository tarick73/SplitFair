import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

// Create axios instance with Django-specific configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable cookies for session-based auth
});

// CSRF Token Management
let csrfToken = null;

/**
 * Gets CSRF token from cookie
 */
const getCsrfTokenFromCookie = () => {
  const name = 'csrftoken';
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const trimmedCookie = cookie.trim();
    if (trimmedCookie.startsWith(name + '=')) {
      return trimmedCookie.substring(name.length + 1);
    }
  }
  return null;
};

/**
 * Fetches CSRF token from Django backend
 */
export const fetchCsrfToken = async () => {
  try {
    console.log('Fetching CSRF token from backend...');

    // Use the dedicated CSRF token endpoint
    const response = await api.get('/csrf-token/');

    if (response.data && response.data.csrfToken) {
      csrfToken = response.data.csrfToken;
      console.log('CSRF token successfully fetched:', csrfToken.substring(0, 10) + '...');
      return csrfToken;
    }

    // Fallback: try to get from cookie
    const cookieToken = getCsrfTokenFromCookie();
    if (cookieToken) {
      csrfToken = cookieToken;
      console.log('CSRF token found in cookie:', cookieToken.substring(0, 10) + '...');
      return cookieToken;
    }

    console.error('CSRF token not available. Check Django backend:');
    console.error('- Ensure /csrf-token/ endpoint is working');
    console.error('- Backend must be running on http://localhost:8000');
    return null;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);

    // Try cookie as fallback
    const cookieToken = getCsrfTokenFromCookie();
    if (cookieToken) {
      csrfToken = cookieToken;
      console.log('Using CSRF token from cookie as fallback');
      return cookieToken;
    }

    throw error;
  }
};

/**
 * Ensures CSRF token is available
 */
const ensureCsrfToken = async () => {
  if (!csrfToken) {
    await fetchCsrfToken();
  }
  return csrfToken;
};

// Request interceptor to add CSRF token
api.interceptors.request.use(
  async (config) => {
    // For POST, PUT, PATCH, DELETE requests, add CSRF token
    if (['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
      const token = await ensureCsrfToken();
      if (token) {
        config.headers['X-CSRFToken'] = token;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      // CSRF token might be invalid, try to refresh it
      csrfToken = null;
    }
    if (error.response?.status === 401) {
      // User is not authenticated, clear user data
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export const authService = {
  /**
   * Initialize - fetch CSRF token on app start
   */
  async init() {
    await fetchCsrfToken();
  },

  /**
   * Login user
   */
  async login(username, password) {
    try {
      console.log('Attempting login...');

      // Ensure CSRF token is available
      const token = await ensureCsrfToken();

      if (!token) {
        throw new Error('CSRF token not available. Please ensure the backend is running and CORS is configured correctly.');
      }

      console.log('Using CSRF token:', token.substring(0, 10) + '...');

      // Create form data
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      formData.append('csrfmiddlewaretoken', token);

      console.log('Sending login request with form data:', {
        username,
        password: '***',
        csrfmiddlewaretoken: token.substring(0, 10) + '...'
      });

        const response = await api.post('/api/login/', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      // Store user data if provided
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        console.log('Login successful!');
      }

      return response.data;
    } catch (error) {
      console.error('Login failed:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Register new user
   */
  async register(username, email, password) {
    try {
      console.log('Attempting registration...');

      // Ensure CSRF token is available
      const token = await ensureCsrfToken();

      if (!token) {
        throw new Error('CSRF token not available. Please ensure the backend is running and CORS is configured correctly.');
      }

      console.log('Using CSRF token:', token.substring(0, 10) + '...');

      // Create form data
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('email', email);
      formData.append('password1', password);
      formData.append('password2', password);
      formData.append('csrfmiddlewaretoken', token);

      console.log('Sending registration request with form data:', {
        username,
        email,
        password1: '***',
        password2: '***',
        csrfmiddlewaretoken: token.substring(0, 10) + '...'
      });

      const response = await api.post('/register/', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      // Store user data if provided
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        console.log('Registration successful!');
      }

      return response.data;
    } catch (error) {
      console.error('Registration failed:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Logout user
   */
  async logout() {
    try {
      const token = await ensureCsrfToken();

      const formData = new URLSearchParams();
      formData.append('csrfmiddlewaretoken', token);

      await api.post('/logout/', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      localStorage.removeItem('user');
      console.log('Logout successful!');
    } catch (error) {
      console.error('Logout failed:', error);
      // Clear user data anyway
      localStorage.removeItem('user');
      throw error;
    }
  },

  /**
   * Get current user from localStorage
   */
  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.getCurrentUser();
  }
};

export default api;