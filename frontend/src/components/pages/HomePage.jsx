import React from 'react';
import { Box, Typography } from '@mui/material';
import { useAuth } from '../../context/AuthContext';

const HomePage = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Welcome {isAuthenticated ? user.username : 'Guest'}
      </Typography>
      <Typography variant="body1">
        {isAuthenticated 
          ? 'You are now logged in to the User Authentication System.'
          : 'Please login or register to access the system.'}
      </Typography>
    </Box>
  );
};

export default HomePage;