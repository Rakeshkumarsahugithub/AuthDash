# User Authentication System

A full-stack authentication system with email verification, password reset, JWT authentication, and role-based access control.

## Features

### Authentication
- User registration with email verification
- Login with JWT tokens
- Password reset via email
- Email verification resend
- Persistent sessions with refresh tokens

### User Management
- Profile management (update username, email, profile picture)
- Role-based access control (User, Moderator, Admin)
- View all users (Admin only)
- Delete users (Admin only)

### Security
- JWT authentication with access & refresh tokens
- Password hashing with bcrypt
- CSRF protection
- Rate limiting
- Secure HTTP headers

### Additional Features
- File uploads for profile pictures
- Pagination and search for user lists
- Responsive UI with Material-UI
- Comprehensive error handling

## Tech Stack

### Frontend
- React 18
- React Router 6
- Material-UI (MUI)
- Axios for HTTP requests
- Form validation with react-hook-form and yup
- Context API for state management

### Backend
- Node.js with Express
- Sequelize ORM
- MySQL database
- JWT for authentication
- Nodemailer for email sending
- Multer for file uploads
- Helmet for security headers

### Development Tools
- Vite for frontend build
- Nodemon for backend development
- Postman/Insomnia for API testing
- Git for version control

## Installation

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend