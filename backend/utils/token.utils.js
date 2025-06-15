const jwt = require('jsonwebtoken');
const db = require('../models');
const { refreshToken: RefreshToken } = db;
const crypto = require('crypto');

const generateAccessToken = (user) => {
  return jwt.sign(
    { 
      id: user.id,
      roles: user.roles.map(role => role.name) 
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRE || '15m' }
  );
};

const generateRefreshToken = async (user, ipAddress) => {
  // Create a refresh token that expires in 7 days
  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );

  // Save refresh token to database
  await RefreshToken.create({
    token: refreshToken,
    userId: user.id,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    createdByIp: ipAddress
  });

  return refreshToken;
};

const rotateRefreshToken = async (oldToken, ipAddress) => {
  // Find and revoke old token
  const oldRefreshToken = await RefreshToken.findOne({ 
    where: { token: oldToken },
    include: ['user']
  });

  if (!oldRefreshToken || oldRefreshToken.revoked) {
    throw new Error('Invalid token');
  }

  // Revoke old token
  oldRefreshToken.revoked = new Date();
  oldRefreshToken.revokedByIp = ipAddress;
  await oldRefreshToken.save();

  // Generate new refresh token
  const newRefreshToken = await generateRefreshToken(oldRefreshToken.user, ipAddress);

  return {
    refreshToken: newRefreshToken,
    user: oldRefreshToken.user
  };
};

const verifyRefreshToken = async (token) => {
  const refreshToken = await RefreshToken.findOne({
    where: { token },
    include: ['user']
  });

  if (!refreshToken || !refreshToken.isActive) {
    throw new Error('Invalid token');
  }

  // Verify JWT
  jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

  return refreshToken.user;
};

const generateVerificationToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  rotateRefreshToken,
  verifyRefreshToken,
  generateVerificationToken
};