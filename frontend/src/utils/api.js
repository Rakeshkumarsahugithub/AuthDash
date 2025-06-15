// import axios from 'axios';
// import { useAuth } from '../context/AuthContext';

// const api = axios.create({
//   baseURL: 'http://localhost:8080',
//   withCredentials: true,
//   headers: {
//     'Content-Type': 'application/json',
//     'Accept': 'application/json'
//   }
// });

// // Request interceptor
// api.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem('token');
//     if (token) {
//       config.headers['x-access-token'] = token;
//     }
//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

// // Response interceptor
// api.interceptors.response.use(
//   response => response,
//   async error => {
//     const originalRequest = error.config;
    
//     // Handle token refresh
//     if (error.response?.status === 401 && !originalRequest._retry) {
//       originalRequest._retry = true;
      
//       try {
//         const refreshToken = localStorage.getItem('refreshToken');
//         const response = await axios.post(
//           `${'http://localhost:8080'}/api/auth/refresh-token`,
//           { token: refreshToken },
//           { withCredentials: true }
//         );
        
//         localStorage.setItem('token', response.data.accessToken);
//         localStorage.setItem('refreshToken', response.data.refreshToken);
        
//         originalRequest.headers['x-access-token'] = response.data.accessToken;
//         return api(originalRequest);
//       } catch (err) {
//         // Logout if refresh fails
//         const { logout } = useAuth();
//         logout();
//         return Promise.reject(err);
//       }
//     }
    
//     return Promise.reject(error);
//   }
// );

// export default api;

// utils/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080',
  withCredentials: true,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['x-access-token'] = token;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post('/api/auth/refresh-token', { refreshToken });
        
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        
        originalRequest.headers['x-access-token'] = accessToken;
        return api(originalRequest);
      } catch (err) {
        console.error('Refresh token failed:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;