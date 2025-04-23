const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const authMiddleware = require("../middleware/authMiddleware"); 

// --- Multer configuration (for patient uploads to detailed_medical_records) ---
const uploadDir = path.join(__dirname, "../uploads"); 
if (!fs.existsSync(uploadDir)) { 
    try { fs.mkdirSync(uploadDir, { recursive: true }); console.log(`Created uploads directory at: ${uploadDir}`); } 
    catch (mkdirErr) { console.error(`Failed to create uploads directory at ${uploadDir}:`, mkdirErr); }
}
const storage = multer.diskStorage({ 
  destination: function (req, file, cb) { cb(null, uploadDir); },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname.replace(/\s+/g, '_')); 
  },
});
const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => { 
    if (file.mimetype === "application/pdf") { cb(null, true); } 
    else { cb(new Error("Only PDF files are allowed.")); }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
}).fields([ 
  { name: "prescriptions", maxCount: 10 }, // Matches frontend FormData key
  { name: "labReports", maxCount: 10 },    // Matches frontend FormData key
]);
// --- End Multer Config ---


// POST /medical-records/ - Handles patient file uploads (Uses detailed_medical_records)
router.post("/", authMiddleware, (req, res) => {
  // Ensure only patients use this route
  if (req.user.role !== 'patient') { 
      return res.status(403).json({ error: "Access denied." });
  }
  const patient_id = req.user.id; 
  
  upload(req, res, function (err) {
    // Handle Multer errors first
    if (err instanceof multer.MulterError) {
      console.error("Multer error:", err.message);
      return res.status(400).json({ error: `File upload error: ${err.message}` });
    } else if (err) {
       console.error("File filter or unknown upload error:", err.message);
       return res.status(400).json({ error: err.message || "File upload failed." });
    }

    // Proceed if upload is successful
    const { problem, previousMedications, medicalHistory } = req.body;

    // Validate text fields
    if (!problem || !previousMedications || !medicalHistory) { 
        // Cleanup uploaded files if validation fails AFTER upload
        if (req.files) { 
            const filesToDelete = [...(req.files.prescriptions || []), ...(req.files.labReports || [])];
            filesToDelete.forEach(file => {
                if (file && file.path) { // Check if file and path exist
                    fs.unlink(file.path, unlinkErr => {
                        if (unlinkErr) console.error(`Error deleting uploaded file ${file.path} after validation fail:`, unlinkErr);
                    });
                }
            });
        }
        return res.status(400).json({ error: "Problem, Previous Medications, and Medical History are required." });
    }

    // Prepare file paths (ensure req.files exists)
    const prescriptionFiles = req.files?.prescriptions || [];
    const labReportFiles = req.files?.labReports || [];
    const prescriptionPaths = prescriptionFiles.map((file) => `/uploads/${file.filename}`);
    const labReportPaths = labReportFiles.map((file) => `/uploads/${file.filename}`);
    const prescriptionsJsonString = JSON.stringify(prescriptionPaths);
    const labReportsJsonString = JSON.stringify(labReportPaths);

    console.log("Data prepared for DB insert (Patient Upload - detailed_medical_records):", { patient_id, problem, previousMedications, medicalHistory, prescriptions: prescriptionsJsonString, labReports: labReportsJsonString });

    // INSERT into detailed_medical_records
    const insertQuery = `
      INSERT INTO detailed_medical_records 
      (patient_id, problem, previous_medications, medical_history, prescriptions, lab_reports) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    db.query( 
        insertQuery, 
        [ patient_id, problem, previousMedications, medicalHistory, prescriptionsJsonString, labReportsJsonString ], 
        (dbError, result) => { 
            if (dbError) { 
                console.error("Database insert error (Patient Upload - detailed_medical_records):", dbError);
                // Cleanup uploaded files if DB insert fails
                if (req.files) { 
                     const filesToDelete = [...(req.files.prescriptions || []), ...(req.files.labReports || [])];
                     filesToDelete.forEach(file => {
                         if (file && file.path) {
                             fs.unlink(file.path, unlinkErr => {
                                 if (unlinkErr) console.error(`Error deleting uploaded file ${file.path} after DB fail:`, unlinkErr);
                             });
                         }
                     });
                }
                return res.status(500).json({ error: "Database operation failed." });
            }
            console.log(`Successfully inserted record ID: ${result.insertId} into detailed_medical_records`); 
            res.status(201).json({ message: "Medical record saved successfully.", record_id: result.insertId });
        }
    );
  }); 
}); 


// POST /medical-records/prescription - Handles doctor adding prescription (Uses medical_records)
router.post('/prescription', authMiddleware, async (req, res) => {
    // 1. Check Authorization (Only Doctor)
    if (req.user.role !== 'doctor') {
        return res.status(403).json({ error: "Access denied. Doctors only." });
    }
    const doctorId = req.user.id; 

    // 2. Extract Data from Request Body
    const { 
        patientId, appointmentId, diagnosis, medicationList 
    } = req.body;

    // 3. Validate Input
    if (!patientId || !appointmentId || !medicationList || !Array.isArray(medicationList) || medicationList.length === 0) {
        console.error("Validation Failed: Missing fields.", { patientId, appointmentId, medicationList }); 
        return res.status(400).json({ error: "Missing required fields: patientId, appointmentId, and at least one medication." });
    }
    // Add more validation if needed (e.g., check content of medicationList items)

    // 4. Prepare Data for DB
    const medicationsJsonString = JSON.stringify(medicationList);
    const diagnosisNotes = diagnosis || ''; 

    console.log("Data prepared for DB insert (Doctor Prescription - using 'medical_records' table):", {
        patientId, appointmentId, doctorId, diagnosis: diagnosisNotes, 
        prescription: medicationsJsonString 
    });

    // 5. Database Operations (Use Promise for cleaner async/await and transaction)
    const dbPromise = db.promise();
    let connection; 

    try {
        connection = await dbPromise.getConnection(); 
        console.log("DB Connection acquired for transaction."); 
        await connection.beginTransaction(); 
        console.log("DB Transaction started."); 

        // --- 5a. Insert into the ORIGINAL 'medical_records' table ---
        const insertRecordSql = `
            INSERT INTO medical_records 
            (patient_id, doctor_id, diagnosis, prescription) 
            VALUES (?, ?, ?, ?) 
        `;
        console.log("Executing INSERT query:", insertRecordSql, [patientId, doctorId, diagnosisNotes, medicationsJsonString]); 
        const [insertResult] = await connection.query(insertRecordSql, [
            patientId,
            doctorId, 
            diagnosisNotes, 
            medicationsJsonString 
        ]);
        const newRecordId = insertResult.insertId;
        console.log(`Inserted new record into 'medical_records' table. ID: ${newRecordId}`);

        // --- 5b. Update appointments table status ---
        const updateAppointmentSql = `
            UPDATE appointments 
            SET status = 'completed' 
            WHERE id = ? AND status != 'completed' 
        `; 
        console.log("Executing UPDATE query:", updateAppointmentSql, [appointmentId]); 
        const [updateResult] = await connection.query(updateAppointmentSql, [appointmentId]);
        console.log(`Updated appointment ID ${appointmentId} status. Affected rows: ${updateResult.affectedRows}`);
        
        if (updateResult.affectedRows === 0) {
             console.warn(`Appointment ${appointmentId} was not updated by status update query. It might already be completed or the ID is incorrect.`);
        }

        await connection.commit(); // Commit transaction if both succeed
        console.log("Transaction committed successfully.");

        // 6. Send Success Response
        res.status(201).json({ 
            message: "Prescription saved and appointment marked as completed.",
            recordId: newRecordId 
        });

    } catch (err) {
        // *** Enhanced Error Logging ***
        console.error("--- ERROR during prescription save transaction ---");
        console.error("Timestamp:", new Date().toISOString());
        console.error("Request Body:", req.body); // Log the data received
        console.error("Error Details:", err); // Log the full error object
        console.error("Error Code:", err.code); // Log specific error code if available (e.g., ER_NO_REFERENCED_ROW)
        console.error("SQL State:", err.sqlState); // Log SQL state if available
        console.error("SQL Message:", err.sqlMessage); // Log SQL message if available
        // *** End Enhanced Error Logging ***

        if (connection) {
            try {
                await connection.rollback(); // Rollback transaction on error
                console.log("Transaction rolled back due to error.");
            } catch (rollbackErr) {
                console.error("Error rolling back transaction:", rollbackErr);
            }
        }
        // Send generic error to frontend, but backend logs have details
        res.status(500).json({ error: "Failed to save prescription." }); 
    } finally {
        if (connection) {
            connection.release(); // Always release the connection
            console.log("Database connection released.");
        }
    }
});


// GET /medical-records/myprescriptions - For Patients to fetch doctor-added prescriptions
// Uses the original 'medical_records' table
router.get('/myprescriptions', authMiddleware, async (req, res) => {
    // 1. Check Authorization (Only Patient)
    if (req.user.role !== 'patient') {
        return res.status(403).json({ error: "Access denied. Patients only." });
    }
    const patientId = req.user.id; 

    console.log(`Fetching doctor-added prescriptions for patient ID: ${patientId}`);

    // 2. Database Operation
    const dbPromise = db.promise();
    try {
        // Fetch records added by doctors for this patient from the 'medical_records' table
        const sql = `
            SELECT 
                mr.id, mr.doctor_id, u.name AS doctorName, mr.diagnosis, mr.prescription 
            FROM 
                medical_records mr 
            JOIN 
                users u ON mr.doctor_id = u.id 
            WHERE 
                mr.patient_id = ? 
            ORDER BY 
                mr.id DESC`; 

        const [records] = await dbPromise.query(sql, [patientId]);
        console.log(`Found ${records.length} prescription records for patient ${patientId}.`);

        // 3. Process and Send Response
        const processedRecords = records.map(record => {
            let medicationList = [];
            try {
                 if (record.prescription && typeof record.prescription === 'object') {
                    medicationList = Array.isArray(record.prescription) ? record.prescription : [];
                 } else if (record.prescription && typeof record.prescription === 'string') {
                    medicationList = JSON.parse(record.prescription);
                    if (!Array.isArray(medicationList)) { medicationList = []; }
                }
            } catch (e) {
                console.error(`Failed to parse prescription JSON for record ${record.id}:`, record.prescription, e);
                medicationList = []; 
            }
            return {
                recordId: record.id,
                doctorId: record.doctor_id,
                doctorName: record.doctorName,
                diagnosisNotes: record.diagnosis,
                medications: medicationList, 
            };
        });
        res.status(200).json(processedRecords); 
    } catch (err) {
        console.error(`Error fetching prescriptions for patient ${patientId}:`, err);
        res.status(500).json({ error: "Failed to fetch prescriptions." });
    }
});


module.exports = router;
