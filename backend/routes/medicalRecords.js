const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// ADD MEDICAL RECORD (Only Doctor)
router.post("/add", authMiddleware, (req, res) => {
    if (req.user.role !== "doctor") return res.status(403).json({ error: "Access denied!" });

    const { patient_id, diagnosis, prescription } = req.body;
    const doctor_id = req.user.id;

    db.query(
        "INSERT INTO medical_records (patient_id, doctor_id, diagnosis, prescription) VALUES (?, ?, ?, ?)",
        [patient_id, doctor_id, diagnosis, prescription],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: "Medical record added successfully!" });
        }
    );
});

// UPDATE MEDICAL RECORD (Only Doctor)
router.put("/update/:id", authMiddleware, (req, res) => {
    if (req.user.role !== "doctor") return res.status(403).json({ error: "Access denied!" });

    const record_id = req.params.id;
    const { diagnosis, prescription } = req.body;
    const doctor_id = req.user.id;

    db.query(
        "UPDATE medical_records SET diagnosis = ?, prescription = ? WHERE id = ? AND doctor_id = ?",
        [diagnosis, prescription, record_id, doctor_id],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) return res.status(404).json({ error: "Record not found or unauthorized!" });

            res.json({ message: "Medical record updated successfully!" });
        }
    );
});

// GET MEDICAL RECORDS (Only for Patients)
router.get("/", authMiddleware, (req, res) => {
    if (req.user.role !== "patient") return res.status(403).json({ error: "Access denied!" });

    const patient_id = req.user.id;

    db.query(
        "SELECT * FROM medical_records WHERE patient_id = ?",
        [patient_id],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(result);
        }
    );
});

// GET PATIENT ME DICAL RECORDS (Only for Doctors)
router.get("/:patient_id", authMiddleware, (req, res) => {
    if (req.user.role !== "doctor") return res.status(403).json({ error: "Access denied!" });

    const patient_id = req.params.patient_id;

    db.query(
        "SELECT * FROM medical_records WHERE patient_id = ?",
        [patient_id],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(result);
        }
    );
});

module.exports = router;