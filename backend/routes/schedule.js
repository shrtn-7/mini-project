const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Middleware to ensure only doctors access these settings
const isDoctor = (req, res, next) => {
    if (req.user.role !== 'doctor') {
        return res.status(403).json({ error: "Access denied. Doctor privileges required." });
    }
    next();
};

// --- GET Schedule Settings ---
router.get("/settings", authMiddleware, isDoctor, async (req, res) => {
    const doctorId = req.user.id;

    try {
        const dbPromise = db.promise();
        const [rows] = await dbPromise.query(
            "SELECT * FROM doctor_schedule_settings WHERE doctor_id = ?",
            [doctorId]
        );

        if (rows.length === 0) {
            // Return default settings if none found in DB (or could return 404)
            // These defaults should ideally match the table defaults
            console.log(`No schedule settings found for doctor ${doctorId}, returning defaults.`);
            return res.json({
                doctor_id: doctorId,
                start_time: '11:00:00',
                end_time: '19:00:00',
                working_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], // Default working days
                appointment_duration: 30,
                break_start_time: '13:00:00',
                break_end_time: '14:00:00'
            });
        }

        const settings = rows[0];
        // Parse working_days JSON string back into an array
        try {
            settings.working_days = JSON.parse(settings.working_days || '[]');
        } catch (parseError) {
            console.error("Error parsing working_days JSON:", parseError);
            settings.working_days = []; // Fallback to empty array on parse error
        }

        res.json(settings);

    } catch (err) {
        console.error("Error fetching schedule settings:", err);
        res.status(500).json({ error: "Failed to retrieve schedule settings." });
    }
});

// --- PUT (Update) Schedule Settings ---
router.put("/settings", authMiddleware, isDoctor, async (req, res) => {
    const doctorId = req.user.id;
    const {
        startTime,
        endTime,
        workingDays, // Expecting an array like ['Mon', 'Tue', ...]
        appointmentDuration,
        breakStartTime,
        breakEndTime
    } = req.body;

    // Basic Validation (add more as needed)
    if (!startTime || !endTime || !workingDays || !appointmentDuration || !breakStartTime || !breakEndTime) {
        return res.status(400).json({ error: "Missing required schedule settings fields." });
    }
    if (!Array.isArray(workingDays)) {
         return res.status(400).json({ error: "workingDays must be an array." });
    }
    if (isNaN(parseInt(appointmentDuration)) || parseInt(appointmentDuration) <= 0) {
        return res.status(400).json({ error: "Invalid appointment duration." });
    }

    // Convert workingDays array to JSON string for storage
    const workingDaysJson = JSON.stringify(workingDays);

    try {
        const dbPromise = db.promise();

        // Use INSERT ... ON DUPLICATE KEY UPDATE to handle both insert and update
        const sql = `
            INSERT INTO doctor_schedule_settings 
                (doctor_id, start_time, end_time, working_days, appointment_duration, break_start_time, break_end_time) 
            VALUES 
                (?, ?, ?, ?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE 
                start_time = VALUES(start_time), 
                end_time = VALUES(end_time), 
                working_days = VALUES(working_days), 
                appointment_duration = VALUES(appointment_duration), 
                break_start_time = VALUES(break_start_time), 
                break_end_time = VALUES(break_end_time)
        `;

        const [result] = await dbPromise.query(sql, [
            doctorId,
            startTime,
            endTime,
            workingDaysJson,
            parseInt(appointmentDuration),
            breakStartTime,
            breakEndTime
        ]);

        res.json({ message: "Schedule settings updated successfully!" });

    } catch (err) {
        console.error("Error updating schedule settings:", err);
        res.status(500).json({ error: "Failed to update schedule settings." });
    }
});


module.exports = router;
