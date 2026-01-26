/**
 * SnapStream - API Service
 * Handles all API calls to the Flask backend
 */

const API_BASE_URL = '/api';

// API Helper Functions
const api = {
  /**
   * Make a fetch request with common options
   */
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem('authToken');
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
    
    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };
    
    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'An error occurred');
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  /**
   * GET request
   */
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },
  
  /**
   * POST request
   */
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  /**
   * PUT request
   */
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  /**
   * DELETE request
   */
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },
  
  /**
   * Upload file with FormData
   */
  async upload(endpoint, formData, onProgress) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem('authToken');
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      });
      
      xhr.addEventListener('load', () => {
        try {
          const response = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(response);
          } else {
            reject(new Error(response.message || 'Upload failed'));
          }
        } catch (e) {
          reject(new Error('Invalid response from server'));
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new Error('Network error'));
      });
      
      xhr.open('POST', url);
      
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      
      xhr.send(formData);
    });
  },
};

// Auth API
const authAPI = {
  /**
   * Register a new user
   */
  async register(userData) {
    return api.post('/register', userData);
  },
  
  /**
   * Login user
   */
  async login(credentials) {
    return api.post('/login', credentials);
  },
  
  /**
   * Logout user
   */
  async logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    return { success: true };
  },
  
  /**
   * Get current user
   */
  async getCurrentUser() {
    return api.get('/user');
  },
  
  /**
   * Update user profile
   */
  async updateProfile(data) {
    return api.put('/user', data);
  },
  
  /**
   * Update password
   */
  async updatePassword(data) {
    return api.put('/user/password', data);
  },
};

// Media API
const mediaAPI = {
  /**
   * Upload media file
   */
  async upload(formData, onProgress) {
    return api.upload('/upload', formData, onProgress);
  },
  
  /**
   * Get all media
   */
  async getAll(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/media?${queryString}` : '/media';
    return api.get(endpoint);
  },
  
  /**
   * Get single media by ID
   */
  async getById(mediaId) {
    return api.get(`/media/${mediaId}`);
  },
  
  /**
   * Delete media
   */
  async delete(mediaId) {
    return api.delete(`/media/${mediaId}`);
  },
  
  /**
   * Get dashboard stats
   */
  async getStats() {
    return api.get('/stats');
  },
  
  /**
   * Get recent activity
   */
  async getRecentActivity() {
    return api.get('/activity');
  },
};

// Notifications API
const notificationsAPI = {
  /**
   * Get all notifications
   */
  async getAll() {
    return api.get('/notifications');
  },
  
  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    return api.post(`/notifications/read/${notificationId}`);
  },
  
  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    return api.post('/notifications/read-all');
  },
  
  /**
   * Clear all notifications
   */
  async clearAll() {
    return api.delete('/notifications');
  },
};

// Export APIs
window.api = api;
window.authAPI = authAPI;
window.mediaAPI = mediaAPI;
window.notificationsAPI = notificationsAPI;
