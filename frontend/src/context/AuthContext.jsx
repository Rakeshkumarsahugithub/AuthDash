import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

axios.defaults.baseURL = 'http://localhost:8080';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const navigate = useNavigate();

  const setAuthToken = (token) => {
    if (token) {
      axios.defaults.headers.common['x-access-token'] = token;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common['x-access-token'];
      localStorage.removeItem('token');
    }
  };

  const isTokenExpired = (token) => {
    try {
      const decoded = jwtDecode(token);
      return decoded.exp < Date.now() / 1000;
    } catch {
      return true;
    }
  };

  const loadUser = async () => {
    try {
      setAuthToken(token);
      const res = await axios.get('/api/auth/me');
      setUser(res.data);
      setIsAuthenticated(true);
    } catch {
      logout(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      if (isTokenExpired(token)) {
        logout();
      } else {
        loadUser();
      }
    } else {
      setLoading(false);
    }
  }, [token]);



const register = async (formData) => {
  try {
    const res = await axios.post('/api/auth/signup', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    setAlert({ type: 'success', message: res.data.message });
    return true;
    
  } catch (err) {
    const errorData = err.response?.data || {};
    
    let errorMessage = errorData.message || 'Registration failed';
    if (errorData.error && errorData.error.includes('Unknown column')) {
      errorMessage = 'Server configuration error. Please contact support.';
    }

    setAlert({
      type: 'error',
      message: errorMessage,
      details: errorData.error ? `Error: ${errorData.error}` : null
    });
    
    return false;
  }
};

// login function in AuthContext
const login = async (email, password) => {
  try {
    const res = await axios.post('/api/auth/signin', { email, password });
    
    if (res.data.success) {
      const { accessToken } = res.data.data;
      setToken(accessToken);
      setAuthToken(accessToken);
      await loadUser();
      return { success: true };
    }
  } catch (err) {
    console.error('Login error:', err);
    
    // Handle email not verified case
    if (err.response?.data?.errorCode === 'EMAIL_NOT_VERIFIED') {
      setAlert({
        type: 'warning',
        message: err.response.data.message,
        details: 'EMAIL_NOT_VERIFIED',
        userId: err.response.data.userId
      });
      return { 
        success: false, 
        errorCode: 'EMAIL_NOT_VERIFIED',
        userId: err.response.data.userId
      };
    }
    
    // Handle other errors
    setAlert({
      type: 'error',
      message: err.response?.data?.message || 'Login failed',
      details: err.response?.data?.errorCode
    });
    
    return { success: false };
  }
};



// resend verification function
const resendVerification = async (userId) => {
  try {
    const res = await axios.post('/api/auth/resend-verification', { userId });
    
    if (res.data.success) {
      setAlert({ type: 'success', message: res.data.message });
      return true;
    } else {
      setAlert({
        type: 'error',
        message: res.data.message || 'Failed to resend verification'
      });
      return false;
    }
  } catch (err) {
    setAlert({
      type: 'error',
      message: err.response?.data?.message || 'Failed to resend verification'
    });
    return false;
  }
};

  const logout = (shouldNavigate = true) => {
    setToken(null);
    setAuthToken(null);
    setUser(null);
    setIsAuthenticated(false);
    if (shouldNavigate) navigate('/');
  };

  const forgotPassword = async (email) => {
    try {
      const res = await axios.post('/api/auth/forgot-password', { email });
      setAlert({ type: 'success', message: res.data.message });
      return true;
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to send reset email'
      });
      return false;
    }
  };

  const resetPassword = async (token, password, confirmPassword) => {
    try {
      const res = await axios.post('/api/auth/reset-password', {
        token,
        password,
        confirmPassword
      });
      setAlert({ type: 'success', message: res.data.message });
      return true;
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to reset password'
      });
      return false;
    }
  };

  const updateProfile = async (formData) => {
    try {
      const res = await axios.put('/api/auth/update-profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUser(res.data.user);
      setAlert({ type: 'success', message: res.data.message });
      return true;
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update profile'
      });
      return false;
    }
  };

  const clearAlert = () => setAlert(null);

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
        clearAlert,
         resendVerification
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);