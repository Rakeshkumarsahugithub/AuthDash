const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const cookieParser = require("cookie-parser");
const path = require("path");
const db = require("./models");
const errorHandler = require("./middlewares/errorHandler");


const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

// Body parsers
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Cookie parser
app.use(cookieParser());

// Remove xss-clean and use helmet's built-in protection instead
// app.use(xss()); // Remove this line

// Security middlewares
app.use(hpp());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});
app.use('/api', limiter);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database sync with error handling
const syncDatabase = async () => {
  try {
    await db.sequelize.sync({ alter: true });
    console.log("Database synchronized");
    
    // Initialize roles
    await db.role.findOrCreate({ where: { id: 1 }, defaults: { name: "user" } });
    await db.role.findOrCreate({ where: { id: 2 }, defaults: { name: "moderator" } });
    await db.role.findOrCreate({ where: { id: 3 }, defaults: { name: "admin" } });
  } catch (err) {
    console.error("Failed to sync database:", err);
    process.exit(1); // Exit if database sync fails
  }
};

syncDatabase();

// Routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;