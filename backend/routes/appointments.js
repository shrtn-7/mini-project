const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");
const cron = require("node-cron");
const sendEmail = require("../routes/mailer");
const dayjs = require("dayjs");

const router = express.Router();

// BOOK APPOINTMENT (Only for Patients)
const WORK_START_HOUR = 11; 
const WORK_END_HOUR = 19; 
router.post("/book", authMiddleware, async (req, res) => { // Made async for potential awaits
    const { appointment_date } = req.body; 
    const patient_id = req.user.id;
    const patient_email = req.user.email; 

    if (!appointment_date) {
        return res.status(400).json({ error: "appointment_date is required." });
    }

    const requestedSlot = dayjs(appointment_date); // Use dayjs object

    if (!requestedSlot.isValid()) {
        return res.status(400).json({ error: "Invalid date/time format provided." });
    }
    
    // Format consistently for DB interactions
    const formattedDateTime = requestedSlot.format('YYYY-MM-DD HH:mm:00');
    const requestedDate = requestedSlot.format('YYYY-MM-DD');

    // --- Start Availability Checks ---

    // 1. Check Day of Week (Sunday is 0)
    if (requestedSlot.day() === 0) {
        return res.status(400).json({ error: "Booking unavailable: Clinic is closed on Sundays." });
    }

    // 2. Check Time of Day (Working Hours: 11:00 - 18:xx)
    if (requestedSlot.hour() < WORK_START_HOUR || requestedSlot.hour() >= WORK_END_HOUR) {
         return res.status(400).json({ error: `Booking unavailable: Clinic hours are ${WORK_START_HOUR}:00 AM to ${WORK_END_HOUR-12}:00 PM.` });
    }

    try {
        // 3. Check if the entire day is blocked
        const [dayBlocks] = await db.promise().query(
            "SELECT id FROM blocked_days WHERE block_date = ?", // Might need doctor_id if multi-doctor in future
            [requestedDate]
        );
        if (dayBlocks.length > 0) {
            return res.status(400).json({ error: "Booking unavailable: The doctor is unavailable on this date." });
        }

        // 4. Check if the specific time slot is blocked
        const [slotBlocks] = await db.promise().query(
             "SELECT id FROM blocked_time_slots WHERE slot_datetime = ?", // Might need doctor_id if multi-doctor
             [formattedDateTime]
        );
        if (slotBlocks.length > 0) {
            return res.status(400).json({ error: "Booking unavailable: This specific time slot is blocked." });
        }

        // 5. Check for existing appointment at this exact time
        const [existingAppointments] = await db.promise().query(
            "SELECT id FROM appointments WHERE appointment_date = ?",
            [formattedDateTime]
        );
        if (existingAppointments.length > 0) {
            return res.status(400).json({ error: "Booking unavailable: This time slot is already booked." });
        }

        // --- All Checks Passed: Insert Appointment ---
        
        const [insertResult] = await db.promise().query(
            "INSERT INTO appointments (patient_id, appointment_date, status) VALUES (?, ?, 'pending')",
            [patient_id, formattedDateTime]
        );

        // --- Keep the Email Reminder Logic ---
        const appointmentDateTime = dayjs(formattedDateTime); // Use dayjs object
        // ... (rest of the cron/email logic remains the same) ...
         const notifyTime = appointmentDateTime.subtract(1, "hour");
         const cronTime = `${notifyTime.minute()} ${notifyTime.hour()} ${notifyTime.date()} ${notifyTime.month() + 1} *`;
         
         cron.schedule(cronTime, () => {
             sendEmail( 
                 patient_email, 
                 "Appointment Reminder", 
                 `Hi, you have an appointment scheduled for ${appointmentDateTime.format("YYYY-MM-DD HH:mm")}.` 
             ).then(() => {
                 console.log(`Reminder email scheduled for ${patient_email} at ${cronTime}`);
             }).catch((emailErr) => {
                 console.error("Error scheduling/sending reminder email:", emailErr);
             });
         }, {
             scheduled: true,
             timezone: "Asia/Kolkata" // Use appropriate timezone
         });
        // --- End Email Reminder Logic ---

        res.status(201).json({ message: "Appointment booked successfully!" });

    } catch (dbError) {
        console.error("Database error during booking process:", dbError);
        return res.status(500).json({ error: "An error occurred during the booking process." });
    }
});
// router.post("/book", authMiddleware, (req, res) => {
//     const { appointment_date } = req.body;
//     const patient_id = req.user.id;
//     const patient_email = req.user.email;

//     db.query(
//         "SELECT * FROM appointments WHERE appointment_date = ?",
//         [appointment_date],
//         (err, result) => {
//             if (err) return res.status(500).json({ error: err.message });

//             if (result.length > 0) {
//                 return res.status(400).json({ error: "This time slot is already booked." });
//             }

//             db.query(
//                 "INSERT INTO appointments (patient_id, appointment_date, status) VALUES (?, ?, 'pending')",
//                 [patient_id, appointment_date],
//                 (err, result) => {
//                     if (err) return res.status(500).json({ error: err.message });

//                     const appointmentDateTime = dayjs(appointment_date);
//                     const notifyTime = appointmentDateTime.subtract(1, "hour");

//                     const cronTime = `${notifyTime.minute()} ${notifyTime.hour()} ${notifyTime.date()} ${notifyTime.month() + 1} *`;

//                     cron.schedule(cronTime, () => {
//                         sendEmail(
//                             patient_email,
//                             patient_email,
//                             "Appointment Reminder",
//                             `Hi, you have an appointment at ${appointmentDateTime.format("YYYY-MM-DD HH:mm")}.`
//                         ).then(() => {
//                             console.log("Reminder email sent to:", patient_email);
//                         }).catch((err) => {
//                             console.error("Error sending reminder email", err);
//                         });
//                     }, {
//                         timezone: "Asia/Kolkata"
//                     });

//                     res.status(201).json({ message: "Appointment booked successfully!" });
//                 }
//             );
//         }
//     );
// });

// GET APPOINTMENTS (Modified for Doctor Role)
router.get("/", authMiddleware, (req, res) => {
    const user_id = req.user.id;
    const role = req.user.role;

    let query = "";
    let params = [];

    if (role === "doctor") {
        // Doctors get all appointments, joined with user details to get patient name
        query = `
            SELECT 
                a.id, 
                a.patient_id, 
                a.appointment_date, 
                a.status, 
                u.name AS patientName 
            FROM 
                appointments a
            JOIN 
                users u ON a.patient_id = u.id
            ORDER BY 
                a.appointment_date ASC`; // Optional: Order by date
        params = []; // No specific user ID needed for doctors fetching all
    } else {
        // Patients get only their own appointments
        query = "SELECT * FROM appointments WHERE patient_id = ? ORDER BY appointment_date ASC";
        params = [user_id];
    }

    db.query(query, params, (err, result) => {
        if (err) {
            console.error("Error fetching appointments:", err); // Log the error
            return res.status(500).json({ error: "Failed to fetch appointments: " + err.message });
        }
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
