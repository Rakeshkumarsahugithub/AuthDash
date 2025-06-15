const express = require('express');
const router = express.Router();
const { verifyToken } = require("../middlewares/authJwt");
const authController = require("../controllers/auth.controller");
const validate = require("../middlewares/validate");
const { upload } = require("../middlewares/upload"); 

// Public routes
router.post(
  "/signup",
  upload.single('profileImage'),
  validate.validateRegister,
  authController.signup
);

router.get("/verify-email", authController.verifyEmail);

router.post("/signin", validate.validateLogin, authController.signin);

router.post("/resend-verification", authController.resendVerification);

router.post("/forgot-password", validate.validateForgotPassword, authController.forgotPassword);

router.post("/reset-password", validate.validateResetPassword, authController.resetPassword);

// Protected routes
router.get("/me", verifyToken, authController.getCurrentUser);

router.put(
  "/update-profile",
  verifyToken,
  upload.single('profileImage'),
  validate.validateUpdateProfile,
  authController.updateProfile
);

router.post("/refresh-token", authController.refreshToken);

module.exports = router;