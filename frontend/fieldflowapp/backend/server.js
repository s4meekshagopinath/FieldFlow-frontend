const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/db");

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/adminRoutes");
const userRoutes = require("./routes/userRoutes");
const technicianRoutes = require("./routes/technicianRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const reportRoutes = require("./routes/reportRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

// Catch body parse errors
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON in request body." });
  }
  next(err);
});

// Test request body
app.post("/test-body", (req, res) => {
  console.log("Headers:", req.headers["content-type"]);
  console.log("Body:", req.body);

  res.json({
    contentType: req.headers["content-type"],
    body: req.body,
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/technicians", technicianRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/notifications", notificationRoutes);

// Root route
app.get("/", (req, res) => {
  res.send("FieldFlow Backend Running");
});

// Database test route
app.get("/api/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      success: true,
      message: "Database Connected Successfully",
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database Connection Failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Database Connection Failed",
    });
  }
});

// Database connection test
pool.query("SELECT NOW()")
  .then((result) => {
    console.log(
      "Connected to Supabase PostgreSQL:",
      result.rows[0].now
    );
  })
  .catch((err) => {
    console.error("Database Connection Failed:", err.message);
  });

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});