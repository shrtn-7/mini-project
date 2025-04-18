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

router.put("/profile", authMiddleware, async (req, res) => {
    // Only doctors can update their profile via this route for now
    if (req.user.role !== 'doctor') {
        return res.status(403).json({ error: "Access denied." });
    }

    const doctorId = req.user.id;
    const { name, email, currentPassword, newPassword } = req.body;

    // Basic validation
    if (!name || !email) {
        return res.status(400).json({ error: "Name and email are required." });
    }

    try {
        const dbPromise = db.promise();

        // Fetch current user data (including password hash)
        const [users] = await dbPromise.query("SELECT * FROM users WHERE id = ?", [doctorId]);
        if (users.length === 0) {
            return res.status(404).json({ error: "User not found." });
        }
        const currentUser = users[0];

        let passwordToUpdate = currentUser.password; // Keep current password unless changed

        // --- Password Change Logic ---
        if (newPassword) {
            // If changing password, current password must be provided and correct
            if (!currentPassword) {
                return res.status(400).json({ error: "Current password is required to set a new password." });
            }
            const isMatch = await bcrypt.compare(currentPassword, currentUser.password);
            if (!isMatch) {
                return res.status(401).json({ error: "Incorrect current password." });
            }
            // Hash the new password
            passwordToUpdate = await bcrypt.hash(newPassword, 10);
            console.log(`Updating password for user ID: ${doctorId}`); // Log password update attempt
        }
        // --- End Password Change Logic ---

        // --- Update User in Database ---
        const [updateResult] = await dbPromise.query(
            "UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?",
            [name, email, passwordToUpdate, doctorId]
        );

        if (updateResult.affectedRows === 0) {
             // Should not happen if user was found earlier, but good practice check
             return res.status(404).json({ error: "User not found during update." });
        }

        // Prepare updated user data to send back (exclude password)
        const updatedUserInfo = {
            id: doctorId,
            name: name,
            email: email,
            role: currentUser.role // Role doesn't change here
        };

        // Note: If email change affects JWT payload, might need to issue a new token
        
        res.json({ message: "Profile updated successfully!", user: updatedUserInfo });

    } catch (err) {
        console.error("Error updating profile:", err);
        // Handle potential duplicate email error
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: "Email address is already in use." });
        }
        return res.status(500).json({ error: "An internal error occurred while updating the profile." });
    }
});

module.exports = router;