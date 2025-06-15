import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Avatar, 
  Button, 
  TextField, 
  IconButton,
  Paper
} from '@mui/material';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import { useAuth } from '../../context/AuthContext';

const ProfilePage = () => {
  const { user, updateProfile } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    profileImage: null
  });
  const [previewImage, setPreviewImage] = useState(
    user?.profileImage ? `/uploads/${user.profileImage}` : null
  );

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({
        ...formData,
        profileImage: file
      });
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formDataToSend = new FormData();
    formDataToSend.append('username', formData.username);
    formDataToSend.append('email', formData.email);
    if (formData.profileImage) {
      formDataToSend.append('profileImage', formData.profileImage);
    }
    await updateProfile(formDataToSend);
    setEditMode(false);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h5">My Profile</Typography>
          {!editMode && (
            <Button 
              variant="contained" 
              onClick={() => setEditMode(true)}
            >
              Edit Profile
            </Button>
          )}
        </Box>

        {editMode ? (
          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
              <Avatar
                src={previewImage}
                sx={{ width: 100, height: 100, mb: 2 }}
              />
              <input
                accept="image/*"
                id="profileImage"
                type="file"
                style={{ display: 'none' }}
                onChange={handleImageChange}
              />
              <label htmlFor="profileImage">
                <IconButton color="primary" aria-label="upload picture" component="span">
                  <PhotoCamera />
                </IconButton>
              </label>
            </Box>

            <TextField
              margin="normal"
              fullWidth
              label="Username"
              name="username"
              value={formData.username}
              onChange={handleChange}
            />
            <TextField
              margin="normal"
              fullWidth
              label="Email"
              name="email"
              value={formData.email}
              onChange={handleChange}
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button 
                variant="outlined" 
                sx={{ mr: 2 }}
                onClick={() => setEditMode(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="contained">
                Save Changes
              </Button>
            </Box>
          </form>
        ) : (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <Avatar
                src={previewImage}
                sx={{ width: 150, height: 150 }}
              />
            </Box>
            <Typography variant="h6" gutterBottom>
              Username: {user?.username}
            </Typography>
            <Typography variant="h6" gutterBottom>
              Email: {user?.email}
            </Typography>
            <Typography variant="h6" gutterBottom>
              Roles: {user?.roles?.map(role => role.name).join(', ')}
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default ProfilePage;