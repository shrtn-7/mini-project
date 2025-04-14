const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc'); // Optional: For timezone handling if needed
const timezone = require('dayjs/plugin/timezone'); // Optional: For timezone handling if needed
const isBetween = require('dayjs/plugin/isBetween'); // To check working hours

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);

// Define working hours (inclusive start, exclusive end)
const WORK_START_HOUR = 11; // 11 AM
const WORK_END_HOUR = 19;   // 7 PM (Appointments end before 7 PM)

const router = express.Router();

// Middleware to check if user is a doctor
const isDoctor = (req, res, next) => {
    if (req.user.role !== 'doctor') {
        return res.status(403).json({ error: "Access denied. Doctors only." });
    }
    // Assuming single doctor, we still use their ID from the token
    req.doctorId = req.user.id; 
    next();
};

// --- Day Blocking Routes ---

// GET Blocked Days
router.get("/blocked/days", authMiddleware, isDoctor, (req, res) => {
    db.query(
        "SELECT id, block_date, reason FROM blocked_days WHERE doctor_id = ? ORDER BY block_date ASC",
        [req.doctorId],
        (err, results) => {
            if (err) return res.status(500).json({ error: "Database error." });
            // Format date to YYYY-MM-DD
            const formatted = results.map(d => ({...d, block_date: dayjs(d.block_date).format('YYYY-MM-DD')}));
            res.json(formatted);
        }
    );
});

// POST Block a Full Day
router.post("/block/day", authMiddleware, isDoctor, (req, res) => {
    const { block_date, reason } = req.body;
    if (!block_date || !dayjs(block_date, 'YYYY-MM-DD', true).isValid()) { // Strict format check
        return res.status(400).json({ error: "Valid block_date (YYYY-MM-DD) is required." });
    }

    // Optional: Prevent blocking past dates?
    // if (dayjs(block_date).isBefore(dayjs().format('YYYY-MM-DD'))) {
    //     return res.status(400).json({ error: "Cannot block past dates." });
    // }

    db.query(
        "INSERT INTO blocked_days (doctor_id, block_date, reason) VALUES (?, ?, ?)",
        [req.doctorId, block_date, reason || null],
        (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: "This day is already blocked." });
                return res.status(500).json({ error: "Database error." });
            }
            res.status(201).json({ message: "Day blocked successfully.", id: result.insertId, block_date });
        }
    );
});

// DELETE Unblock a Full Day
router.delete("/unblock/day", authMiddleware, isDoctor, (req, res) => {
    const { block_date } = req.body; // Date from body
     if (!block_date || !dayjs(block_date, 'YYYY-MM-DD', true).isValid()) {
        return res.status(400).json({ error: "Valid block_date (YYYY-MM-DD) is required in the request body." });
    }

    db.query(
        "DELETE FROM blocked_days WHERE doctor_id = ? AND block_date = ?",
        [req.doctorId, block_date],
        (err, result) => {
            if (err) return res.status(500).json({ error: "Database error." });
            if (result.affectedRows === 0) return res.status(404).json({ error: "Blocked day not found." });
            res.json({ message: "Day unblocked successfully." });
        }
    );
});

// --- Time Slot Blocking Routes ---

// GET Blocked Time Slots
router.get("/blocked/slots", authMiddleware, isDoctor, (req, res) => {
    // Optional: Add date filtering later: /blocked/slots?date=YYYY-MM-DD
    db.query(
        "SELECT id, slot_datetime, reason FROM blocked_time_slots WHERE doctor_id = ? ORDER BY slot_datetime ASC",
        [req.doctorId],
        (err, results) => {
            if (err) return res.status(500).json({ error: "Database error." });
             // Format datetime for consistency before sending
            const formattedResults = results.map(slot => ({
                ...slot,
                slot_datetime: dayjs(slot.slot_datetime).format('YYYY-MM-DD HH:mm:ss') 
            }));
            res.json(formattedResults);
        }
    );
});

// POST Block a Specific Time Slot
router.post("/block/slot", authMiddleware, isDoctor, (req, res) => {
    const { slot_datetime, reason } = req.body;
     if (!slot_datetime) {
        return res.status(400).json({ error: "slot_datetime is required." });
    }

    const slot = dayjs(slot_datetime); // Parse the input

    if (!slot.isValid()) {
        return res.status(400).json({ error: "Invalid date/time format for slot_datetime." });
    }
    // Validate: Is it Sunday?
    if (slot.day() === 0) { 
        return res.status(400).json({ error: "Cannot block slots on Sunday." });
    }
    // Validate: Is it within working hours? (11:00 to 18:xx)
    if (slot.hour() < WORK_START_HOUR || slot.hour() >= WORK_END_HOUR) {
        return res.status(400).json({ error: `Cannot block slots outside working hours (${WORK_START_HOUR}:00 - ${WORK_END_HOUR}:00).` });
    }

    const formattedDateTime = slot.format('YYYY-MM-DD HH:mm:00'); // Store consistently

    db.query(
        "INSERT INTO blocked_time_slots (doctor_id, slot_datetime, reason) VALUES (?, ?, ?)",
        [req.doctorId, formattedDateTime, reason || null],
        (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: "This specific time slot is already blocked." });
                return res.status(500).json({ error: "Database error." });
            }
            res.status(201).json({ message: "Time slot blocked successfully.", id: result.insertId, slot_datetime: formattedDateTime });
        }
    );
});

// DELETE Unblock a Specific Time Slot
router.delete("/unblock/slot", authMiddleware, isDoctor, (req, res) => {
    const { slot_datetime } = req.body;
    if (!slot_datetime) {
        return res.status(400).json({ error: "slot_datetime is required in the request body." });
    }
    
    const slot = dayjs(slot_datetime);
     if (!slot.isValid()) {
        return res.status(400).json({ error: "Invalid date/time format provided." });
    }
    // Format consistently for DB query
    const formattedDateTime = slot.format('YYYY-MM-DD HH:mm:00'); 

    db.query(
        "DELETE FROM blocked_time_slots WHERE doctor_id = ? AND slot_datetime = ?",
        [req.doctorId, formattedDateTime],
        (err, result) => {
            if (err) return res.status(500).json({ error: "Database error." });
            if (result.affectedRows === 0) return res.status(404).json({ error: "Blocked time slot not found." });
            res.json({ message: "Time slot unblocked successfully." });
        }
    );
});


module.exports = router;