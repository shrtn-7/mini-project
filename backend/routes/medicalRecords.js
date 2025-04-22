const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const authMiddleware = require("../middleware/authMiddleware"); 

const uploadDir = path.join(__dirname, "../uploads"); 
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true }); 
    console.log(`Created uploads directory at: ${uploadDir}`);
  } catch (mkdirErr) {
     console.error(`Failed to create uploads directory at ${uploadDir}:`, mkdirErr);
  }
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); 
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname.replace(/\s+/g, '_')); 
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed."));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 
  }
}).fields([ 
  { name: "prescriptions", maxCount: 10 }, 
  { name: "labReports", maxCount: 10 },    
]);

// POST: /medical-records/ - Handles the upload form submission
router.post("/", authMiddleware, (req, res) => {
  const patient_id = req.user.id; 
  if (!patient_id) {
    return res.status(401).json({ error: "Authentication required." });
  }

  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      console.error("Multer error:", err.message);
      return res.status(400).json({ error: `File upload error: ${err.message}` });
    } else if (err) {
       console.error("File filter or unknown upload error:", err.message);
       return res.status(400).json({ error: err.message || "File upload failed." });
    }

    const { problem, previousMedications, medicalHistory } = req.body;

    if (!problem || !previousMedications || !medicalHistory) {
       // Cleanup uploaded files if validation fails after upload
       if (req.files) {
           const filesToDelete = [...(req.files.prescriptions || []), ...(req.files.labReports || [])];
           filesToDelete.forEach(file => fs.unlink(file.path, unlinkErr => {
               if (unlinkErr) console.error(`Error deleting uploaded file ${file.path} after validation fail:`, unlinkErr);
           }));
       }
      return res.status(400).json({ error: "Problem, Previous Medications, and Medical History are required." });
    }

    // --- Refined Path Generation and Logging ---
    // Ensure req.files exists before trying to access properties
    const prescriptionFiles = req.files?.prescriptions || [];
    const labReportFiles = req.files?.labReports || [];

    const prescriptionPaths = prescriptionFiles.map((file) => `/uploads/${file.filename}`);
    const labReportPaths = labReportFiles.map((file) => `/uploads/${file.filename}`);

    // Convert the arrays to JSON strings *before* logging and inserting
    const prescriptionsJsonString = JSON.stringify(prescriptionPaths);
    const labReportsJsonString = JSON.stringify(labReportPaths);

    console.log("Data prepared for DB insert:", { // Log exactly what will be inserted
      patient_id,
      problem,
      previousMedications, 
      medicalHistory,    
      prescriptions: prescriptionsJsonString, // Log the JSON string
      labReports: labReportsJsonString,       // Log the JSON string
    });
    // --- End Refined Path Generation ---


    // Insert the medical record into the database
    const insertQuery = `
      INSERT INTO detailed_medical_records 
      (patient_id, problem, previous_medications, medical_history, prescriptions, lab_reports) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
      insertQuery,
      [
        patient_id,
        problem,
        previousMedications, 
        medicalHistory,    
        prescriptionsJsonString, // Use the generated JSON string
        labReportsJsonString,    // Use the generated JSON string
      ],
      (dbError, result) => {
        if (dbError) {
          console.error("Database insert error:", dbError);
          // Cleanup uploaded files if DB insert fails
           if (req.files) {
               const filesToDelete = [...(req.files.prescriptions || []), ...(req.files.labReports || [])];
               filesToDelete.forEach(file => fs.unlink(file.path, unlinkErr => {
                   if (unlinkErr) console.error(`Error deleting uploaded file ${file.path} after DB fail:`, unlinkErr);
               }));
           }
          return res.status(500).json({ error: "Database operation failed." });
        }

        // Successfully inserted
        console.log(`Successfully inserted record ID: ${result.insertId}`); // Log success
        res.status(201).json({ 
          message: "Medical record saved successfully.",
          record_id: result.insertId,
        });
      }
    );
  }); // End of multer upload callback
}); // End of POST route

module.exports = router;
