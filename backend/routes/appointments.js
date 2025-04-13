const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");
const cron = require("node-cron");
const sendEmail = require("../routes/mailer");
const dayjs = require("dayjs");

const router = express.Router();

// BOOK APPOINTMENT (Only for Patients)
router.post("/book", authMiddleware, (req, res) => {
    const { appointment_date } = req.body;
    const patient_id = req.user.id;
    const patient_email = req.user.email;

    db.query(
        "SELECT * FROM appointments WHERE appointment_date = ?",
        [appointment_date],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });

            if (result.length > 0) {
                return res.status(400).json({ error: "This time slot is already booked." });
            }

            db.query(
                "INSERT INTO appointments (patient_id, appointment_date, status) VALUES (?, ?, 'pending')",
                [patient_id, appointment_date],
                (err, result) => {
                    if (err) return res.status(500).json({ error: err.message });

                    const appointmentDateTime = dayjs(appointment_date);
                    const notifyTime = appointmentDateTime.subtract(1, "hour");

                    const cronTime = `${notifyTime.minute()} ${notifyTime.hour()} ${notifyTime.date()} ${notifyTime.month() + 1} *`;

                    cron.schedule(cronTime, () => {
                        sendEmail(
                            patient_email,
                            patient_email,
                            "Appointment Reminder",
                            `Hi, you have an appointment at ${appointmentDateTime.format("YYYY-MM-DD HH:mm")}.`
                        ).then(() => {
                            console.log("Reminder email sent to:", patient_email);
                        }).catch((err) => {
                            console.error("Error sending reminder email", err);
                        });
                    }, {
                        timezone: "Asia/Kolkata"
                    });

                    res.status(201).json({ message: "Appointment booked successfully!" });
                }
            );
        }
    );
});

// GET APPOINTMENTS
router.get("/", authMiddleware, (req, res) => {
    const user_id = req.user.id;
    const role = req.user.role;

    const query = role === "doctor"
        ? "SELECT * FROM appointments"
        : "SELECT * FROM appointments WHERE patient_id = ?";
    const params = role === "doctor" ? [] : [user_id];

    db.query(query, params, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(result);
    });
});

// CANCEL APPOINTMENT
router.delete("/cancel/:id", authMiddleware, (req, res) => {
    const appointment_id = req.params.id;
    const user_id = req.user.id;
    const role = req.user.role;

    const query = role === "doctor"
        ? "DELETE FROM appointments WHERE id = ?"
        : "DELETE FROM appointments WHERE id = ? AND patient_id = ?";
    const params = role === "doctor" ? [appointment_id] : [appointment_id, user_id];

    db.query(query, params, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Appointment not found or unauthorized!" });
        }
        res.json({ message: "Appointment canceled successfully!" });
    });
});

// CONFIRM APPOINTMENT
router.put("/confirm/:id", authMiddleware, (req, res) => {
    if (req.user.role !== "doctor") {
        return res.status(403).json({ error: "Access denied!" });
    }

    const appointment_id = req.params.id;

    db.query(
        "UPDATE appointments SET status = 'confirmed' WHERE id = ?",
        [appointment_id],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Appointment not found!" });
            }
            res.json({ message: "Appointment confirmed!" });
        }
    );
});

module.exports = router;
