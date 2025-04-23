const express = require("express");
const router = express.Router();
const db = require("../db"); // Use single connection
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const authMiddleware = require("../middleware/authMiddleware"); 

// --- Multer Config (for patient uploads - remains the same) ---
const uploadDir = path.join(__dirname, "../uploads"); 
if (!fs.existsSync(uploadDir)) { 
    try { fs.mkdirSync(uploadDir, { recursive: true }); console.log(`Created uploads directory at: ${uploadDir}`); } 
    catch (mkdirErr) { console.error(`Failed to create uploads directory at ${uploadDir}:`, mkdirErr); }
}
const storage = multer.diskStorage({ 
  destination: function (req, file, cb) { cb(null, uploadDir); },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const safeOriginalName = file.originalname.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    cb(null, uniqueSuffix + "-" + safeOriginalName); 
  },
});
const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => { 
    if (file.mimetype === "application/pdf") { cb(null, true); } 
    else { cb(new Error("Only PDF files are allowed.")); }
  },
  limits: { fileSize: 10 * 1024 * 1024 } 
}).fields([ 
  { name: "prescriptions", maxCount: 10 }, 
  { name: "labReports", maxCount: 10 },    
]);
// --- End Multer Config ---


// POST /medical-records/ - Patient Upload (Uses detailed_medical_records)
// This route remains unchanged and correctly uses detailed_medical_records
router.post("/", authMiddleware, (req, res) => {
  if (req.user.role !== 'patient') { return res.status(403).json({ error: "Access denied." }); }
  const patient_id = req.user.id; 
  
  upload(req, res, function (err) { // Keep async for cleanup if needed
    if (err) { /* ... multer error handling ... */ 
        console.error("Multer error:", err.message);
        return res.status(400).json({ error: `File upload error: ${err.message}` });
    }
    const { problem, previousMedications, medicalHistory } = req.body;
    if (!problem || !previousMedications || !medicalHistory) { /* ... validation & cleanup ... */ 
        if (req.files) { /* ... cleanup logic ... */ }
        return res.status(400).json({ error: "Problem, Previous Medications, and Medical History are required." });
    }
    const prescriptionFiles = req.files?.prescriptions || [];
    const labReportFiles = req.files?.labReports || [];
    const prescriptionPaths = prescriptionFiles.map((file) => `/uploads/${file.filename}`);
    const labReportPaths = labReportFiles.map((file) => `/uploads/${file.filename}`);
    const prescriptionsJsonString = JSON.stringify(prescriptionPaths);
    const labReportsJsonString = JSON.stringify(labReportPaths);

    console.log("Data prepared for DB insert (Patient Upload - detailed_medical_records):", { patient_id, problem, previousMedications, medicalHistory, prescriptions: prescriptionsJsonString, labReports: labReportsJsonString });
    const insertQuery = `INSERT INTO detailed_medical_records (patient_id, problem, previous_medications, medical_history, prescriptions, lab_reports) VALUES (?, ?, ?, ?, ?, ?)`;
    
    // Use db.query with callback
    db.query( insertQuery, [ patient_id, problem, previousMedications, medicalHistory, prescriptionsJsonString, labReportsJsonString ], (dbError, result) => { 
        if (dbError) { /* ... error handling & cleanup ... */ 
            console.error("Database insert error (Patient Upload - detailed_medical_records):", dbError);
            if (req.files) { /* ... cleanup logic ... */ }
            return res.status(500).json({ error: "Database operation failed." });
        }
        console.log(`Successfully inserted record ID: ${result.insertId} into detailed_medical_records`); 
        res.status(201).json({ message: "Medical record saved successfully.", record_id: result.insertId });
    });
  }); 
}); 


// --- UPDATED: POST /medical-records/prescription ---
// --- Handles INSERT or UPDATE for doctor prescription based on patient_id ---
// --- Uses the 'medical_records' table with Callbacks ---
router.post('/prescription', authMiddleware, (req, res) => { // Removed async
    if (req.user.role !== 'doctor') { return res.status(403).json({ error: "Access denied." }); }
    const doctorId = req.user.id; 
    // Get patientId, diagnosis, medicationList from body. 
    // appointmentId might be passed but isn't used for saving the record itself.
    const { patientId, diagnosis, medicationList, appointmentId } = req.body; 

    // Validation
    if (!patientId || !medicationList || !Array.isArray(medicationList) || medicationList.length === 0) {
        return res.status(400).json({ error: "Missing required fields: patientId and at least one medication." });
    }
     // Validate medication list items
    for (const med of medicationList) {
        if (!med || typeof med.name !== 'string' || !med.name.trim() || typeof med.timings !== 'string' || !med.timings.trim()) {
            console.error("Validation Failed: Invalid medication item.", med);
            return res.status(400).json({ error: "Invalid data in medication list. Name and timings are required for all entries." });
        }
    }

    const medicationsJsonString = JSON.stringify(medicationList);
    const diagnosisNotes = diagnosis || ''; 

    console.log("Data prepared for UPSERT (Doctor Prescription - medical_records):", { patientId, doctorId, diagnosis: diagnosisNotes, prescription: medicationsJsonString });

    // --- UPSERT Logic using Callbacks ---
    // Use INSERT ... ON DUPLICATE KEY UPDATE for atomicity
    const upsertSql = `
        INSERT INTO medical_records (patient_id, doctor_id, diagnosis, prescription) 
        VALUES (?, ?, ?, ?) 
        ON DUPLICATE KEY UPDATE 
            doctor_id = VALUES(doctor_id), 
            diagnosis = VALUES(diagnosis), 
            prescription = VALUES(prescription)
    `;
    const params = [patientId, doctorId, diagnosisNotes, medicationsJsonString];
    console.log("Executing UPSERT query:", upsertSql, params);

    db.query(upsertSql, params, (errUpsert, result) => {
        if (errUpsert) {
            console.error(`DB Error (Upsert Prescription):`, errUpsert);
            return res.status(500).json({ error: `Failed to save or update prescription.` });
        }

        // Check result.affectedRows: 1 means INSERT, 2 means UPDATE (on most MySQL versions)
        const isUpdate = result.affectedRows === 2; 
        const recordId = isUpdate ? 'N/A (Updated)' : result.insertId; // insertId only valid on INSERT
        
        console.log(`Successfully ${isUpdate ? 'updated' : 'inserted'} record for patient ID: ${patientId}. Result:`, result);

        // --- Update Appointment Status (Optional, but good feedback) ---
        if (appointmentId) { // Only update if appointmentId was passed
            const updateAppointmentSql = `UPDATE appointments SET status = 'completed' WHERE id = ? AND status != 'completed'`; 
            db.query(updateAppointmentSql, [appointmentId], (errUpdateAppt, updateApptResult) => {
                if(errUpdateAppt){
                     console.error(`Error updating appointment ${appointmentId} status after prescription save:`, errUpdateAppt);
                } else {
                     console.log(`Updated appointment ID ${appointmentId} status. Affected rows: ${updateApptResult.affectedRows}`);
                     if (updateApptResult.affectedRows === 0) { console.warn(`Appointment ${appointmentId} was not updated...`); }
                }
                // Send response after attempting appointment update
                res.status(isUpdate ? 200 : 201).json({ 
                    message: `Prescription ${isUpdate ? 'updated' : 'saved'} successfully.`,
                    recordId: recordId // Note: recordId might not be accurate on UPDATE
                });
            });
        } else {
             // Send response immediately if no appointmentId provided
             res.status(isUpdate ? 200 : 201).json({ 
                message: `Prescription ${isUpdate ? 'updated' : 'saved'} successfully.`,
                recordId: recordId 
            });
        }
    });
});


// --- UPDATED: GET /medical-records/for-patient/:patientId ---
// --- For Doctor to check/fetch existing prescription for a specific patient ---
// --- Uses the 'medical_records' table ---
router.get('/for-patient/:patientId', authMiddleware, (req, res) => { // Removed async
    if (req.user.role !== 'doctor') { return res.status(403).json({ error: "Access denied." }); }
    const { patientId } = req.params;
    if (!patientId || isNaN(parseInt(patientId))) { return res.status(400).json({ error: "Valid patientId parameter is required." }); }
    console.log(`Fetching prescription for patient ID: ${patientId}`);
    
    const sql = `SELECT id, diagnosis, prescription FROM medical_records WHERE patient_id = ? LIMIT 1`; // Limit 1 because of UNIQUE constraint
    
    // Use db.query with callback
    db.query(sql, [patientId], (err, rows) => { 
        if (err) {
            console.error(`Error fetching prescription for patient ${patientId}:`, err);
            return res.status(500).json({ error: "Failed to fetch prescription data." });
        }
        if (rows.length === 0) {
            // No prescription found for this patient - this is NOT an error for checking existence
            return res.status(404).json({ message: "No prescription found for this patient." }); 
        }

        // Prescription found, parse and return it
        const record = rows[0];
        let medicationList = [];
        try { 
            // Check if prescription is already an object/array (driver parsed it)
             if (record.prescription && typeof record.prescription === 'object') {
                medicationList = Array.isArray(record.prescription) ? record.prescription : [];
             } 
             // Check if it's a non-empty string, then try parsing
             else if (record.prescription && typeof record.prescription === 'string') {
                medicationList = JSON.parse(record.prescription);
                if (!Array.isArray(medicationList)) medicationList = [];
            } 
        } catch (e) { 
            console.error(`Failed to parse prescription JSON for record ${record.id}:`, e);
            medicationList = []; 
        }
        res.status(200).json({
            recordId: record.id,
            diagnosisNotes: record.diagnosis,
            medications: medicationList // Send the parsed list
        });
    });
});


// --- UPDATED: GET /medical-records/myprescriptions ---
// --- Fetches the single prescription for the logged-in patient ---
// --- Uses the 'medical_records' table ---
router.get('/myprescriptions', authMiddleware, (req, res) => { // Removed async
    if (req.user.role !== 'patient') { return res.status(403).json({ error: "Access denied." }); }
    const patientId = req.user.id; 
    console.log(`Fetching doctor-added prescription for patient ID: ${patientId}`);

    const sql = `SELECT mr.id, mr.doctor_id, u.name AS doctorName, mr.diagnosis, mr.prescription FROM medical_records mr JOIN users u ON mr.doctor_id = u.id WHERE mr.patient_id = ? LIMIT 1`; // Limit 1
    
    // Use db.query with callback
    db.query(sql, [patientId], (err, records) => { 
        if (err) {
             console.error(`Error fetching prescription for patient ${patientId}:`, err);
             return res.status(500).json({ error: "Failed to fetch prescription." });
        }
        console.log(`Found ${records.length} prescription records for patient ${patientId}.`);
        
        let processedRecord = null;
        if (records.length > 0) {
            const record = records[0];
            let medicationList = [];
            try { 
                 if (record.prescription && typeof record.prescription === 'object') {
                    medicationList = Array.isArray(record.prescription) ? record.prescription : [];
                 } else if (record.prescription && typeof record.prescription === 'string') {
                    medicationList = JSON.parse(record.prescription);
                    if (!Array.isArray(medicationList)) medicationList = [];
                }
            } catch (e) { medicationList = []; console.error(`Failed to parse prescription JSON for record ${record.id}:`, e); }
            
            processedRecord = { 
                recordId: record.id, doctorId: record.doctor_id, doctorName: record.doctorName,
                diagnosisNotes: record.diagnosis, medications: medicationList 
            };
        }
        // Send back the single record object (or null if none found)
        res.status(200).json(processedRecord); 

    });
});


module.exports = router;
