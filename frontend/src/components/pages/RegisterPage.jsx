import React from 'react';
import { Grid, Link, Typography } from '@mui/material';
import RegisterForm from '../forms/RegisterForm';
import { useAuth } from '../../context/AuthContext';

const RegisterPage = () => {
  const { register } = useAuth();

  return (
    <Grid container justifyContent="center">
      <Grid item xs={12} sm={8} md={6} lg={4}>
        <Typography variant="h5" align="center" gutterBottom>
          Sign up
        </Typography>
        <RegisterForm onSubmit={register} />
        <Grid container justifyContent="flex-end">
          <Grid item>
            <Link href="/login" variant="body2">
              Already have an account? Sign in
            </Link>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
};

export default RegisterPage;