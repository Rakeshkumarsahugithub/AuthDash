import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  TextField,
  Button,
  Box,
  Typography,
  Avatar,
  IconButton,
  CircularProgress
} from '@mui/material';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import { useAuth } from '../../context/AuthContext';

const schema = yup.object().shape({
  username: yup
    .string()
    .required('Username is required')
    .min(3, 'Username must be at least 3 characters'),
  email: yup
    .string()
    .required('Email is required')
    .email('Email is invalid'),
  password: yup
    .string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password'), null], 'Passwords must match')
    .required('Confirm Password is required')
});

const RegisterForm = () => {
  const [previewImage, setPreviewImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register: authRegister, setAlert } = useAuth();
  
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(schema)
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
      setValue('profileImage', e.target.files);
    }
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('username', data.username);
      formData.append('email', data.email);
      formData.append('password', data.password);
      formData.append('confirmPassword', data.confirmPassword);
      
      if (data.profileImage?.[0]) {
        formData.append('profileImage', data.profileImage[0]);
      }

      const result = await authRegister(formData);
      
      if (!result) {
        setAlert({
          type: 'error',
          message: 'Registration failed. Please try again.'
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      setAlert({
        type: 'error',
        message: 'An unexpected error occurred during registration'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 3 }}>
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
        <Typography variant="caption">Upload Profile Image (optional)</Typography>
      </Box>

      <TextField
        margin="normal"
        fullWidth
        label="Username"
        autoFocus
        {...register('username')}
        error={!!errors.username}
        helperText={errors.username?.message}
        disabled={isSubmitting}
      />
      <TextField
        margin="normal"
        fullWidth
        label="Email Address"
        type="email"
        {...register('email')}
        error={!!errors.email}
        helperText={errors.email?.message}
        disabled={isSubmitting}
      />
      <TextField
        margin="normal"
        fullWidth
        label="Password"
        type="password"
        {...register('password')}
        error={!!errors.password}
        helperText={errors.password?.message}
        disabled={isSubmitting}
      />
      <TextField
        margin="normal"
        fullWidth
        label="Confirm Password"
        type="password"
        {...register('confirmPassword')}
        error={!!errors.confirmPassword}
        helperText={errors.confirmPassword?.message}
        disabled={isSubmitting}
      />
      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <CircularProgress size={24} color="inherit" />
        ) : (
          'Sign Up'
        )}
      </Button>
    </Box>
  );
};

export default RegisterForm;