import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      
      if (storedToken) {
        try {
          // Verify token and get user data
          const response = await authAPI.getProfile();
          setUser(response.data.user);
          setToken(storedToken);
        } catch (error) {
          console.error('Token verification failed:', error);
          // Clear invalid token
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await authAPI.login({ email, password });
      
      const { token: newToken, user: userData } = response.data;
      
      // Store token and user data
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      
      toast.success('Login successful!');
      return { success: true };
      
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // Signup function
  const signup = async (userData) => {
    try {
      setLoading(true);
      const response = await authAPI.signup(userData);
      
      const { token: newToken, user: newUser } = response.data;
      
      // Store token and user data
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(newUser);
      
      toast.success('Account created successfully!');
      return { success: true };
      
    } catch (error) {
      const message = error.response?.data?.message || 'Signup failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    toast.success('Logged out successfully');
  };

  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      const response = await authAPI.updateProfile(profileData);
      setUser(response.data.user);
      toast.success('Profile updated successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Change password
  const changePassword = async (passwordData) => {
    try {
      await authAPI.changePassword(passwordData);
      toast.success('Password changed successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Password change failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!token && !!user;
  };

  // Get auth header for API requests
  const getAuthHeader = () => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const value = {
    user,
    token,
    loading,
    login,
    signup,
    logout,
    updateProfile,
    changePassword,
    isAuthenticated,
    getAuthHeader,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};