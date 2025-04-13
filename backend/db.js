const mysql = require("mysql2");
require("dotenv").config(); // Load environment variables from .env file

// Create MySQL Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST, // Database host
    user: process.env.DB_USER, // Database username
    password: process.env.DB_PASSWORD, // Database password
    database: process.env.DB_NAME // Database name
});

// Connect to the Database
db.connect(err => {
    if (err) {
        console.error("❌ Database connection failed: " + err.message);
        console.error("➡️ Host:", process.env.DB_HOST);
        console.error("➡️ User:", process.env.DB_USER);
        console.error("➡️ DB Name:", process.env.DB_NAME);
        console.error("➡️ Error:", err);
        return;
    }
    console.log("✅ Connected to MySQL Database!");
});

// Export database connection
module.exports = db;
