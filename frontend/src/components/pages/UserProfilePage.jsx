import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Avatar, 
  Button, 
  Paper,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const UserProfilePage = () => {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`/api/users/${id}`);
        setUser(response.data);
      } catch (err) {
        console.error('Failed to fetch user:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6">User not found</Typography>
      </Box>
    );
  }

  const isCurrentUser = currentUser && currentUser.id === parseInt(id);

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Avatar
            src={user.profileImage ? `/uploads/${user.profileImage}` : ''}
            sx={{ width: 150, height: 150 }}
          />
        </Box>
        
        <Typography variant="h4" align="center" gutterBottom>
          {user.username}
        </Typography>
        
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            <strong>Email:</strong> {user.email}
          </Typography>
          <Typography variant="h6" gutterBottom>
            <strong>Roles:</strong> {user.roles?.map(role => role.name).join(', ')}
          </Typography>
        </Box>

        {isCurrentUser && (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button 
              variant="contained" 
              component="a" 
              href="/profile"
            >
              Edit My Profile
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default UserProfilePage;