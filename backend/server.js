const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const db = require("./db");
const authRoutes = require("./routes/auth");
const appointmentRoutes = require("./routes/appointments"); // Import appointment routes
const medicalRecordRoutes = require("./routes/medicalRecords");
const userRoutes = require('./routes/users'); // Import user routes
const availabilityRoutes = require('./routes/availability'); 
const scheduleRoutes = require('./routes/schedule');


const app = express();
app.use(cors());
app.use(express.json());

// Default route
app.get("/", (req, res) => {
    res.send("MediSync Backend is Running!");
});

// Database connection test route
app.get("/test-db", (req, res) => {
    db.query("SELECT 1", (err, result) => {
        if (err) {
            return res.status(500).json({ error: "Database not connected!" });
        }
        res.json({ message: "Database connected successfully!" });
    });
});

// Use authentication routes
app.use("/auth", authRoutes);

// Use appointment routes
app.use("/appointments", appointmentRoutes);

// Use medical records routes
app.use("/medical-records", medicalRecordRoutes);

// Use users routes
app.use('/users', userRoutes);

// Use availability routes
app.use('/availability', availabilityRoutes); 

// Use schedule routes
app.use('/schedule', scheduleRoutes); 

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
