const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require("../middlewares/authJwt");
const userController = require("../controllers/user.controller");
const authController = require("../controllers/auth.controller");

// Get all users with pagination
router.get("/", verifyToken, userController.findAll);

// Get user by ID
router.get("/:id", verifyToken, userController.getUserById);

// Delete user (admin only)
router.delete("/:id", [verifyToken, isAdmin], authController.deleteUser);

module.exports = router;
