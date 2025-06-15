const express = require("express");
const cors = require("cors");
const db = require("./models");
const path = require("path");
const { handleUploadErrors } = require("./middlewares/upload"); 

const app = express();

// Enable CORS
app.use(cors());

// Parse requests of content-type - application/json
app.use(express.json());

// Parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
// db.sequelize.sync()
//   .then(() => {
//     console.log("Synced db.");
//     initial(); // Create initial roles
//   })
//   .catch((err) => {
//     console.log("Failed to sync db: " + err.message);
//   });
db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0')
  .then(() => {
    return db.sequelize.sync({ force: true });
  })
  .then(() => {
    return db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  })
  .then(() => {
    console.log("Database synchronized");
    initial();
  })
  .catch(err => {
    console.error("Failed to sync db:", err);
  });

// Routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// ✅ Handle file upload errors globally (must come *after* routes)
app.use(handleUploadErrors); // This catches Multer-related errors

// Simple route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to user authentication application." });
});

// Create initial roles
function initial() {
  db.role.findOrCreate({
    where: { id: 1 },
    defaults: { name: "user" }
  });
  
  db.role.findOrCreate({
    where: { id: 2 },
    defaults: { name: "moderator" }
  });
  
  db.role.findOrCreate({
    where: { id: 3 },
    defaults: { name: "admin" }
  });
}

module.exports = app;
