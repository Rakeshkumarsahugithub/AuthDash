import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Snackbar, 
  Alert as MuiAlert 
} from '@mui/material';

const Alert = () => {
  const { alert, clearAlert } = useAuth();

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    clearAlert();
  };

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => {
        clearAlert();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alert, clearAlert]);

  if (!alert) return null;

  return (
    <Snackbar
      open={Boolean(alert)}
      autoHideDuration={5000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <MuiAlert 
        onClose={handleClose} 
        severity={alert.type} 
        sx={{ width: '100%' }}
      >
        {alert.message}
      </MuiAlert>
    </Snackbar>
  );
};

export default Alert;