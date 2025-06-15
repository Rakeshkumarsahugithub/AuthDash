const httpStatus = require('http-status');

class ApiError extends Error {
  constructor(statusCode, message, errors = [], errorCode = null, isOperational = true) {
    super(message);

    // Validate statusCode, fallback to 500 if invalid
    if (!Number.isInteger(statusCode)) {
      console.warn('⚠️ Invalid statusCode passed to ApiError:', statusCode);
      statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    }

    this.statusCode = statusCode;
    this.errors = errors;
    this.errorCode = errorCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, errors = [], errorCode = null) {
    return new ApiError(httpStatus.BAD_REQUEST, message, errors, errorCode);
  }

  static unauthorized(message, errors = [], errorCode = null) {
    return new ApiError(httpStatus.UNAUTHORIZED, message, errors, errorCode);
  }

  static forbidden(message, errors = [], errorCode = null) {
    return new ApiError(httpStatus.FORBIDDEN, message, errors, errorCode);
  }

  static notFound(message, errors = [], errorCode = null) {
    return new ApiError(httpStatus.NOT_FOUND, message, errors, errorCode);
  }

  static internal(message, errors = [], errorCode = null) {
    return new ApiError(httpStatus.INTERNAL_SERVER_ERROR, message, errors, errorCode);
  }
}

module.exports = ApiError;
