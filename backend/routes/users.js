const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// GET Specific User Details (Protected, Doctor Only)
router.get("/:userId", authMiddleware, (req, res) => {
    // 1. Check if the logged-in user is a doctor
    if (req.user.role !== "doctor") {
        return res.status(403).json({ error: "Access denied. Doctors only." });
    }

    const userIdToFetch = req.params.userId;

    // 2. Fetch specific user details (exclude password!)
    db.query(
        "SELECT id, name, email, role FROM users WHERE id = ?",
        [userIdToFetch],
        (err, result) => {
            if (err) {
                console.error("Error fetching user details:", err);
                return res.status(500).json({ error: "Database error fetching user details." });
            }
            if (result.length === 0) {
                return res.status(404).json({ error: "User not found." });
            }
            // 3. Return user data (without password)
            res.json(result[0]); 
        }
    );
});

module.exports = router;