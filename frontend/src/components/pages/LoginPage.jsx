import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Grid, Link, Typography } from '@mui/material';
import LoginForm from '../forms/LoginForm';
import { useAuth } from '../../context/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, alert, setAlert, resendVerification } = useAuth();
  const [unverifiedUserId, setUnverifiedUserId] = React.useState(null);

  const handleLogin = async (data) => {
    const result = await login(data.email, data.password);
    if (result.errorCode === 'EMAIL_NOT_VERIFIED') {
      setUnverifiedUserId(result.userId);
    }
  };

  const handleResendVerification = async () => {
    if (unverifiedUserId) {
      const success = await resendVerification(unverifiedUserId);
      if (success) {
        setUnverifiedUserId(null);
      }
    }
  };

  // Check for verification success/failure in URL params
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === 'true') {
      setAlert({
        type: 'success',
        message: 'Email verified successfully! You can now login.'
      });
      navigate('/login', { replace: true });
    } else if (params.get('verified') === 'false') {
      setAlert({
        type: 'error',
        message: 'Email verification failed. Please try again.'
      });
      navigate('/login', { replace: true });
    }
  }, [navigate, setAlert]);

  return (
    <Grid container justifyContent="center">
      <Grid item xs={12} sm={8} md={6} lg={4}>
        <Typography variant="h4" align="center" gutterBottom sx={{ mt: 4 }}>
          Sign In
        </Typography>
        
        {alert?.details === 'EMAIL_NOT_VERIFIED' && (
          <Box sx={{ mb: 2, p: 2, backgroundColor: '#fff8e1', borderRadius: 1 }}>
            <Typography variant="body1" color="warning.main">
              {alert.message}
            </Typography>
            <Button 
              onClick={handleResendVerification}
              variant="text"
              size="small"
              sx={{ mt: 1 }}
            >
              Resend Verification Email
            </Button>
          </Box>
        )}
        
        {alert?.type && alert?.details !== 'EMAIL_NOT_VERIFIED' && (
          <Box sx={{ mb: 2, p: 2, 
            backgroundColor: alert.type === 'error' ? '#ffebee' : '#e8f5e9',
            borderRadius: 1 
          }}>
            <Typography variant="body1" color={alert.type === 'error' ? 'error.main' : 'success.main'}>
              {alert.message}
            </Typography>
          </Box>
        )}
        
        <LoginForm onSubmit={handleLogin} />
        
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Link href="/forgot-password" variant="body2" sx={{ mr: 2 }}>
            Forgot password?
          </Link>
          <Link href="/register" variant="body2">
            Don't have an account? Sign Up
          </Link>
        </Box>
      </Grid>
    </Grid>
  );
};

export default LoginPage;