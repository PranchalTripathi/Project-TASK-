import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh and errors
api.interceptors.response.use(
  (response) => {
    // Check for new token in response headers
    const newToken = response.headers['x-new-token'];
    if (newToken) {
      localStorage.setItem('token', newToken);
    }
    return response;
  },
  (error) => {
    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  signup: (userData) => api.post('/auth/signup', userData),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
  changePassword: (passwordData) => api.post('/auth/change-password', passwordData),
  deactivateAccount: () => api.post('/auth/deactivate'),
};

// Events API endpoints
export const eventsAPI = {
  getEvents: (params = {}) => api.get('/events', { params }),
  getEvent: (id) => api.get(`/events/${id}`),
  createEvent: (eventData) => api.post('/events', eventData),
  updateEvent: (id, eventData) => api.put(`/events/${id}`, eventData),
  deleteEvent: (id) => api.delete(`/events/${id}`),
  updateEventStatus: (id, status) => api.patch(`/events/${id}/status`, { status }),
  getSwappableSlots: (params = {}) => api.get('/events/swappable-slots', { params }),
};

// Swap API endpoints
export const swapAPI = {
  createSwapRequest: (swapData) => api.post('/swap/request', swapData),
  getIncomingRequests: (params = {}) => api.get('/swap/incoming', { params }),
  getOutgoingRequests: (params = {}) => api.get('/swap/outgoing', { params }),
  respondToSwap: (requestId, response) => api.post(`/swap/response/${requestId}`, response),
  cancelSwapRequest: (requestId) => api.post(`/swap/cancel/${requestId}`),
  getSwapHistory: (params = {}) => api.get('/swap/history', { params }),
};

// Generic API helper functions
export const apiHelpers = {
  // Handle API errors consistently
  handleError: (error) => {
    if (error.response) {
      // Server responded with error status
      return {
        message: error.response.data?.message || 'An error occurred',
        status: error.response.status,
        errors: error.response.data?.errors || [],
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        message: 'Network error. Please check your connection.',
        status: 0,
        errors: [],
      };
    } else {
      // Something else happened
      return {
        message: error.message || 'An unexpected error occurred',
        status: 0,
        errors: [],
      };
    }
  },

  // Format API response consistently
  formatResponse: (response) => {
    return {
      success: response.data?.success || true,
      data: response.data?.data || response.data,
      message: response.data?.message || 'Success',
      pagination: response.data?.pagination || null,
    };
  },

  // Build query parameters
  buildQueryParams: (params) => {
    const queryParams = new URLSearchParams();
    
    Object.keys(params).forEach(key => {
      const value = params[key];
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(item => queryParams.append(key, item));
        } else {
          queryParams.append(key, value);
        }
      }
    });
    
    return queryParams.toString();
  },

  // Upload file helper
  uploadFile: async (file, endpoint, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return api.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });
  },
};

// Health check endpoint
export const healthCheck = () => api.get('/health');

export default api;