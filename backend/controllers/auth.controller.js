const db = require("../models");
const { user: User, role: Role, refreshToken: RefreshToken, Sequelize } = db;
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

// Generate refreshToken utility 
const { generateAccessToken, generateRefreshToken } = require('../utils/token.utils');


// Mail transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};
const transporter = createTransporter();

// JWT Token generator
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "1h",
  });
};

// === SIGNUP ===
exports.signup = async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const existingUser = await User.findOne({ where: { email: req.body.email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const verificationToken = crypto.randomBytes(20).toString("hex");

    const user = await User.create({
      username: req.body.username,
      email: req.body.email,
      password: hashedPassword,
      profileImage: req.file?.filename || null,
      verificationToken,
      emailVerified: false,
    });

    await user.setRoles([1]); // default to 'user' role

    const verificationUrl = `${process.env.BASE_URL}/verify-email?token=${verificationToken}`;

    try {
      await transporter.sendMail({
        to: user.email,
        from: process.env.EMAIL_FROM,
        subject: "Verify Your Email",
        html: `<p>Click here to verify your email: <a href="${verificationUrl}">${verificationUrl}</a></p>`,
      });
    } catch (emailErr) {
      console.error("Email sending error:", emailErr.message);
    }

    res.status(201).json({
      success: true,
      message: "User registered. Please verify your email.",
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    if (req.file) {
      fs.unlinkSync(path.join(__dirname, "../uploads", req.file.filename));
    }
    res.status(500).json({ success: false, message: "Registration failed", error: err.message });
  }
};

// === EMAIL VERIFICATION ===
exports.verifyEmail = async (req, res) => {
  try {
    const user = await User.findOne({ where: { verificationToken: req.query.token } });
    if (!user) return res.status(400).send({ message: "Invalid verification token." });

    user.emailVerified = true;
    user.verificationToken = null;
    await user.save();

    res.status(200).send({ message: "Email verified successfully." });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// === SIGNIN ===
exports.signin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({
      where: { email },
      include: [{ model: Role, as: "roles", through: { attributes: [] } }],
    });

    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.emailVerified) return res.status(401).json({ message: "Email not verified" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid password" });

    const token = generateToken(user.id);
    const refreshToken = await generateRefreshToken(user, req.ip);
    const roles = user.roles.map((r) => "ROLE_" + r.name.toUpperCase());

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles,
        profileImage: user.profileImage,
        accessToken: token,
        refreshToken: refreshToken.token,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// === RESEND VERIFICATION ===
exports.resendVerification = async (req, res) => {
  try {
    const user = await User.findOne({ where: { email: req.body.email } });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.emailVerified) return res.status(400).json({ message: "Email already verified" });

    if (!user.verificationToken) {
      user.verificationToken = crypto.randomBytes(20).toString("hex");
      await user.save();
    }

    const verificationUrl = `${process.env.BASE_URL}/verify-email?token=${user.verificationToken}`;

    await transporter.sendMail({
      to: user.email,
      from: process.env.EMAIL_FROM,
      subject: "Verify Your Email",
      html: `<p>Click here to verify your email: <a href="${verificationUrl}">${verificationUrl}</a></p>`,
    });

    res.status(200).json({ message: "Verification email resent" });
  } catch (err) {
    res.status(500).json({ message: "Failed to resend verification", error: err.message });
  }
};

// === REFRESH TOKEN ===
exports.refreshToken = async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: "Token is required" });

  try {
    const refreshToken = await RefreshToken.findOne({ where: { token } });
    if (!refreshToken || !refreshToken.isActive) {
      return res.status(400).json({ message: "Invalid token" });
    }

    const newToken = generateToken(refreshToken.userId);
    const newRefreshToken = await generateRefreshToken(refreshToken.user, req.ip);

    refreshToken.revoked = Date.now();
    refreshToken.revokedByIp = req.ip;
    refreshToken.replacedByToken = newRefreshToken.token;
    await refreshToken.save();

    res.status(200).json({
      accessToken: newToken,
      refreshToken: newRefreshToken.token,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// === FORGOT PASSWORD ===
exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ where: { email: req.body.email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1hr
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await transporter.sendMail({
      to: user.email,
      from: process.env.EMAIL_FROM,
      subject: "Password Reset",
      html: `<p>Reset your password here: <a href="${resetUrl}">${resetUrl}</a></p>`,
    });

    res.status(200).json({ message: "Password reset email sent" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// === RESET PASSWORD ===
exports.resetPassword = async (req, res) => {
  try {
    const user = await User.findOne({
      where: {
        resetPasswordToken: req.body.token,
        resetPasswordExpires: { [Sequelize.Op.gt]: Date.now() },
      },
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    user.password = await bcrypt.hash(req.body.password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    await transporter.sendMail({
      to: user.email,
      from: process.env.EMAIL_FROM,
      subject: "Password changed",
      html: `<p>Your password for ${user.email} has been changed.</p>`,
    });

    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// === GET CURRENT USER ===
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: { exclude: ["password"] },
      include: [{ model: Role, as: "roles", attributes: ["name"], through: { attributes: [] } }],
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// === UPDATE PROFILE ===
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (req.body.username) user.username = req.body.username;
    if (req.body.email) user.email = req.body.email;

    if (req.file) {
      const oldPath = path.join(__dirname, "../uploads", user.profileImage || "");
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      user.profileImage = req.file.filename;
    }

    await user.save();

    res.status(200).json({
      message: "Profile updated",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// === GET ALL USERS (Admin) ===
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ["password"] },
      include: [{ model: Role, as: "roles", attributes: ["name"], through: { attributes: [] } }],
    });
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// === GET USER BY ID ===
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ["password"] },
      include: [{ model: Role, as: "roles", attributes: ["name"], through: { attributes: [] } }],
    });

    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// === DELETE USER (Admin) ===
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.profileImage) {
      const imagePath = path.join(__dirname, "../uploads", user.profileImage);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }

    await user.destroy();
    res.status(200).json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
