import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

// Set base URL for all axios requests
axios.defaults.baseURL = 'http://localhost:8080';

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
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const navigate = useNavigate();

  // Set auth token function
  const setAuthToken = (token) => {
    if (token) {
      axios.defaults.headers.common['x-access-token'] = token;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common['x-access-token'];
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  };

  // Check if token is expired
  const isTokenExpired = (token) => {
    try {
      const decoded = jwtDecode(token);
      return decoded.exp < Date.now() / 1000;
    } catch {
      return true;
    }
  };

  // Refresh auth token
  const refreshAuthToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('No refresh token available');

      const response = await axios.post('/api/auth/refresh-token', { refreshToken });
      
      if (!response.data.success) {
        throw new Error('Token refresh failed');
      }

      const { accessToken, refreshToken: newRefreshToken } = response.data;
      
      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      setToken(accessToken);
      setAuthToken(accessToken);
      
      return { accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      console.error('Refresh token error:', error);
      logout(false);
      throw error;
    }
  };

  // Load user data
  const loadUser = async () => {
    try {
      if (!token) {
        throw new Error('No authentication token available');
      }

      if (isTokenExpired(token)) {
        await refreshAuthToken();
      }

      const response = await axios.get('/api/auth/me');
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Failed to load user:', error);
      logout(false);
    } finally {
      setLoading(false);
    }
  };

  // Initialize auth state
  useEffect(() => {
    if (token) {
      setAuthToken(token);
      loadUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  // Register function
  const register = async (formData) => {
    try {
      const response = await axios.post('/api/auth/signup', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setAlert({
          type: 'success',
          message: response.data.message || 'Registration successful! Please check your email to verify your account.',
        });
        return { success: true, data: response.data };
      }

      throw new Error(response.data.message || 'Registration failed');
    } catch (error) {
      console.error('Registration error:', error);
      
      let errorMessage = 'Registration failed';
      let errorDetails = null;
      
      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
        errorDetails = error.response.data?.error;
        
        if (error.response.status === 400 && error.response.data?.errors) {
          errorDetails = error.response.data.errors;
        }
      } else if (error.request) {
        errorMessage = 'No response from server. Please try again.';
      }

      setAlert({
        type: 'error',
        message: errorMessage,
        details: errorDetails,
      });

      return { 
        success: false, 
        error: { message: errorMessage, details: errorDetails }
      };
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/signin', { email, password });
      
      if (response.data.success) {
        const { accessToken, refreshToken, user } = response.data.data;
        
        setToken(accessToken);
        setAuthToken(accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        
        setUser(user);
        setIsAuthenticated(true);
        
        setAlert({ type: 'success', message: 'Login successful' });
        return { success: true, user };
      }

      throw new Error(response.data.message || 'Login failed');
    } catch (error) {
      console.error('Login error:', error);
      
      let errorMessage = 'Login failed';
      let errorCode = null;
      let userId = null;
      
      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
        errorCode = error.response.data?.errorCode;
        userId = error.response.data?.data?.userId;
      }

      setAlert({
        type: errorCode === 'EMAIL_NOT_VERIFIED' ? 'warning' : 'error',
        message: errorMessage,
        details: errorCode,
        ...(userId && { userId })
      });

      return { 
        success: false, 
        error: { message: errorMessage, code: errorCode },
        ...(userId && { userId })
      };
    }
  };

  // Resend verification email
  const resendVerification = async (userId) => {
    try {
      const response = await axios.post('/api/auth/resend-verification', { userId });
      
      if (response.data.success) {
        setAlert({ 
          type: 'success', 
          message: response.data.message || 'Verification email resent successfully' 
        });
        return true;
      }

      throw new Error(response.data.message || 'Failed to resend verification email');
    } catch (error) {
      console.error('Resend verification error:', error);
      setAlert({
        type: 'error',
        message: error.response?.data?.message || 'Failed to resend verification email',
      });
      return false;
    }
  };

  // Logout function
  const logout = (shouldNavigate = true) => {
    setToken(null);
    setAuthToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setAlert(null);
    if (shouldNavigate) navigate('/');
  };

  // Forgot password function
  const forgotPassword = async (email) => {
    try {
      const response = await axios.post('/api/auth/forgot-password', { email });
      setAlert({ 
        type: 'success', 
        message: response.data.message || 'Password reset email sent successfully' 
      });
      return true;
    } catch (error) {
      console.error('Forgot password error:', error);
      setAlert({
        type: 'error',
        message: error.response?.data?.message || 'Failed to send password reset email',
      });
      return false;
    }
  };

  // Reset password function
  const resetPassword = async (token, password, confirmPassword) => {
    try {
      const response = await axios.post('/api/auth/reset-password', {
        token,
        password,
        confirmPassword
      });
      setAlert({ 
        type: 'success', 
        message: response.data.message || 'Password reset successfully' 
      });
      return true;
    } catch (error) {
      console.error('Reset password error:', error);
      setAlert({
        type: 'error',
        message: error.response?.data?.message || 'Failed to reset password',
      });
      return false;
    }
  };

  // Update profile function
  const updateProfile = async (formData) => {
    try {
      const response = await axios.put('/api/auth/update-profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUser(response.data.user);
      setAlert({ 
        type: 'success', 
        message: response.data.message || 'Profile updated successfully' 
      });
      return true;
    } catch (error) {
      console.error('Update profile error:', error);
      setAlert({
        type: 'error',
        message: error.response?.data?.message || 'Failed to update profile',
      });
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        loading,
        alert,
        register,
        login,
        logout,
        forgotPassword,
        resetPassword,
        updateProfile,
        setAlert,
        clearAlert: () => setAlert(null),
        resendVerification
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};