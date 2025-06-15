const db = require("../models");
const { user: User, role: Role, refreshToken: RefreshToken, Sequelize } = db;
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');

// Token utilities
const { 
  generateAccessToken, 
  generateRefreshToken,
  rotateRefreshToken,
  verifyRefreshToken,
  generateVerificationToken
} = require('../utils/token.utils');

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Helper function to send email
const sendEmail = async (to, subject, html) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Email sending error:', error);
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to send email',
      null,
      'EMAIL_SEND_FAILED'
    );
  }
};

// === SIGNUP ===
exports.signup = async (req, res, next) => {
  let transaction;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { username, email, password } = req.body;
    transaction = await db.sequelize.transaction();

    const existingUser = await User.findOne({
      where: { email },
      transaction
    });

    if (existingUser) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Email already in use',
        errorCode: 'EMAIL_ALREADY_EXISTS'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationToken = generateVerificationToken();

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      profileImage: req.file?.filename || null,
      verificationToken,
      emailVerified: false
    }, { transaction });

    await user.addRole(1, { transaction });
    await transaction.commit();

    const verificationUrl = `${process.env.BASE_URL}/api/auth/verify-email?token=${verificationToken}`;

    try {
      await sendVerificationEmail(user.email, verificationUrl);
      return res.status(201).json({
        success: true,
        message: 'User registered successfully. Please check your email to verify your account.',
        data: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    } catch (emailError) {
      console.error('Verification email error:', emailError);
      return res.status(201).json({
        success: true,
        message: 'User registered successfully but failed to send verification email.',
        data: {
          id: user.id,
          username: user.username,
          email: user.email
        },
        warning: 'Verification email not sent'
      });
    }

  } catch (err) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }

    if (req.file?.path) {
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) console.error('Failed to delete file:', unlinkErr);
      });
    }

    const statusCode = err.statusCode && Number.isInteger(err.statusCode)
      ? err.statusCode
      : 500;

    console.error('Signup error:', err);

    res.status(statusCode).json({
      success: false,
      message: err.message || 'Internal Server Error',
      errorCode: err.errorCode || 'SIGNUP_FAILED'
    });
  }
};



async function sendVerificationEmail(email, verificationUrl) {
  try {
    const mailOptions = {
      from: `"Auth System" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'Verify Your Email Address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Our Service!</h2>
          <p>Thank you for registering. Please verify your email address to complete your registration.</p>
          <p style="margin: 20px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #4CAF50; color: white; padding: 10px 20px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email
            </a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all;">${verificationUrl}</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr>
          <p style="color: #777; font-size: 0.9em;">
            This link will expire in 24 hours.
          </p>
        </div>
      `,
      text: `Please verify your email by clicking this link: ${verificationUrl}`
    };

    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send verification email to ${email}:`, error);
    throw new Error('Failed to send verification email');
  }
}

// === EMAIL VERIFICATION ===
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required',
        errorCode: 'MISSING_VERIFICATION_TOKEN',
      });
    }

    const user = await User.findOne({ where: { verificationToken: token } });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token',
        errorCode: 'INVALID_VERIFICATION_TOKEN',
      });
    }

    user.emailVerified = true;
    user.verificationToken = null;
    await user.save();

    if (req.accepts('html')) {
      return res.redirect(`${process.env.FRONTEND_URL}/email-verified?success=true`);
    }

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully.',
    });
  } catch (error) {
    if (req.accepts('html')) {
      return res.redirect(`${process.env.FRONTEND_URL}/email-verified?success=false`);
    }

    error.statusCode = error.statusCode || 500;
    next(error);
  }
};


// === RESEND VERIFICATION ===
exports.resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
        errorCode: 'MISSING_EMAIL',
      });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        errorCode: 'USER_NOT_FOUND',
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified',
        errorCode: 'EMAIL_ALREADY_VERIFIED',
      });
    }

    if (!user.verificationToken) {
      user.verificationToken = generateVerificationToken();
      await user.save();
    }

    const verificationUrl = `${process.env.BASE_URL}/api/auth/verify-email?token=${user.verificationToken}`;
    await sendEmail(
      user.email,
      'Verify Your Email',
      `<p>Click here to verify your email: <a href="${verificationUrl}">${verificationUrl}</a></p>`
    );

    return res.status(200).json({
      success: true,
      message: 'Verification email resent',
    });
  } catch (error) {
    next(error);
  }
};


// === SIGNIN ===
exports.signin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      where: { email },
      include: [{
        model: Role,
        as: 'roles',
        through: { attributes: [] },
      }],
      attributes: { include: ['password'] },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        errorCode: 'INVALID_CREDENTIALS',
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        errorCode: 'INVALID_CREDENTIALS',
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user, req.ip);

    // Return both tokens and basic user info
    return res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          roles: user.roles.map(r => r.name)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// === FORGOT PASSWORD ===
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
        errorCode: 'MISSING_EMAIL'
      });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        errorCode: 'USER_NOT_FOUND'
      });
    }

    // Generate reset token
    const resetToken = generateVerificationToken();
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    await sendEmail(
      user.email,
      "Password Reset",
      `<p>Reset your password here: <a href="${resetUrl}">${resetUrl}</a></p>`
    );

    return res.status(200).json({
      success: true,
      message: "Password reset email sent"
    });
  } catch (error) {
    next(error);
  }
};

// === REFRESH TOKEN ===
exports.refreshToken = async (req, res, next) => {
  try {
    // Example logic for issuing new access token from refresh token
    const refreshToken = req.body.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({ success: false, message: "Refresh token is required" });
    }

    const storedToken = await RefreshToken.findOne({ where: { token: refreshToken } });

    if (!storedToken || storedToken.revoked || new Date() > new Date(storedToken.expires)) {
      return res.status(403).json({ success: false, message: "Invalid or expired refresh token" });
    }

    const user = await User.findByPk(storedToken.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const newAccessToken = generateAccessToken(user); // You should have this helper
    res.status(200).json({ success: true, accessToken: newAccessToken });
  } catch (error) {
    next(error);
  }
};


// === RESET PASSWORD ===
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and password are required',
        errorCode: 'MISSING_REQUIRED_FIELDS'
      });
    }

    const user = await User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { [Sequelize.Op.gt]: Date.now() },
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token',
        errorCode: 'INVALID_RESET_TOKEN'
      });
    }

    // Update password and clear reset token
    user.password = await bcrypt.hash(password, 12);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    // Send confirmation email
    await sendEmail(
      user.email,
      "Password Changed",
      `<p>Your password has been successfully changed.</p>`
    );

    return res.status(200).json({
      success: true,
      message: "Password updated successfully"
    });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await db.User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};


// === GET CURRENT USER ===
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: { exclude: ['password'] },
      include: [{
        model: Role,
        as: 'roles',
        attributes: ['name'],
        through: { attributes: [] }
      }]
    });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
};

// === UPDATE PROFILE ===
exports.updateProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId);
    
    if (!user) {
      throw new ApiError(
        httpStatus.NOT_FOUND, // 404
        'User not found',
        null,
        'USER_NOT_FOUND'
      );
    }

    const { username, email } = req.body;
    if (username) user.username = username;
    if (email) user.email = email;

    if (req.file) {
      if (user.profileImage) {
        const oldPath = path.join(__dirname, "../uploads", user.profileImage);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      user.profileImage = req.file.filename;
    }

    await user.save();

    res.status(httpStatus.OK).json({ // 200
      success: true,
      message: "Profile updated successfully",
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(path.join(__dirname, "../uploads", req.file.filename));
    }
    next(error);
  }
};

// === GET ALL USERS (Admin) ===
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ["password"] },
      include: [{ 
        model: Role, 
        as: "roles", 
        attributes: ["name"], 
        through: { attributes: [] } 
      }],
    });

    res.status(httpStatus.OK).json({ // 200
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
};


// === GET USER BY ID ===
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ["password"] },
      include: [{ 
        model: Role, 
        as: "roles", 
        attributes: ["name"], 
        through: { attributes: [] } 
      }],
    });

    if (!user) {
      throw new ApiError(
        httpStatus.NOT_FOUND, // 404
        'User not found',
        null,
        'USER_NOT_FOUND'
      );
    }

    res.status(httpStatus.OK).json({ // 200
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};
// === DELETE USER (Admin) ===
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      throw new ApiError(
        httpStatus.NOT_FOUND, // 404
        'User not found',
        null,
        'USER_NOT_FOUND'
      );
    }

    if (user.profileImage) {
      const imagePath = path.join(__dirname, "../uploads", user.profileImage);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }

    await user.destroy();

    res.status(httpStatus.OK).json({ // 200
      success: true,
      message: "User deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};