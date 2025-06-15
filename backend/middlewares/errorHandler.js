const httpStatus = require('http-status');
const { Sequelize } = require('sequelize');

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  let statusCode = typeof err.status === 'number' ? err.status
                : typeof err.statusCode === 'number' ? err.statusCode
                : httpStatus.INTERNAL_SERVER_ERROR;

  // Fix this check:
  if (!Number.isInteger(statusCode) || statusCode < 100 || statusCode > 599) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
  }
  let message = err.message || httpStatus[statusCode];
  let errorCode = err.code || err.errorCode || null;
  let errors = err.errors || [];

  // Handle Sequelize errors
  if (err instanceof Sequelize.Error) {
    if (err instanceof Sequelize.ValidationError) {
      statusCode = httpStatus.BAD_REQUEST;
      message = 'Validation Error';
      errors = err.errors.map(e => ({
        path: e.path,
        message: e.message,
        type: e.type,
        value: e.value
      }));
    } else if (err instanceof Sequelize.UniqueConstraintError) {
      statusCode = httpStatus.CONFLICT;
      message = 'Duplicate entry';
      errors = err.errors.map(e => ({
        path: e.path,
        message: e.message
      }));
    } else {
      message = 'Database Error';
    }
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = httpStatus.UNAUTHORIZED;
    message = 'Invalid token';
    errorCode = 'INVALID_TOKEN';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = httpStatus.UNAUTHORIZED;
    message = 'Token expired';
    errorCode = 'TOKEN_EXPIRED';
  }

  // Standardize error format
  if (errors.length === 0 && Array.isArray(err)) {
    errors = err.map(e => ({
      message: e.msg || e.message,
      field: e.param || e.path
    }));
  }

  // Response
  const response = {
    success: false,
    statusCode, // Include status code in response
    message,
    ...(errorCode && { errorCode }),
    ...(errors.length > 0 && { errors }),
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      originalError: {
        name: err.name,
        message: err.message
      }
    })
  };

  // Ensure we're sending a valid status code
  res.status(statusCode).json(response);
};

module.exports = errorHandler;