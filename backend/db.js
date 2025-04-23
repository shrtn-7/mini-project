const mysql = require("mysql2");
require("dotenv").config(); // Load environment variables from .env file

// --- Create MySQL Single Connection ---
const db = mysql.createConnection({
    host: process.env.DB_HOST, 
    user: process.env.DB_USER, 
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_NAME 
});

// Connect to the Database
db.connect(err => {
    if (err) {
        console.error("❌ Database connection failed: " + err.message);
        console.error("➡️ Host:", process.env.DB_HOST);
        console.error("➡️ User:", process.env.DB_USER);
        // Avoid logging password
        console.error("➡️ DB Name:", process.env.DB_NAME);
        console.error("➡️ Error:", err);
        // Consider exiting the process if DB connection is critical for startup
        // process.exit(1); 
        return;
    }
    // *** Use the simpler connection message ***
    console.log("✅ Connected to MySQL Database!"); 
});

// --- Export the single connection object ---
module.exports = db; 
