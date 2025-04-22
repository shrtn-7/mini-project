const express = require('express');
const router = express.Router();
const db = require('../db'); // Your MySQL connection
const authMiddleware = require('../middleware/authMiddleware');

// Helper function to safely handle JSON data from DB
// It now checks if the input is already an object/array
function safeJsonParse(dbValue, fieldName = 'field') {
    // 1. Check if it's already a non-null object (likely a parsed array)
    if (dbValue && typeof dbValue === 'object') {
        // Ensure it's actually an array, return empty array otherwise
        return Array.isArray(dbValue) ? dbValue : []; 
    }
    
    // 2. Check if it's a non-empty string, then try parsing
    if (dbValue && typeof dbValue === 'string') {
        try {
            const parsed = JSON.parse(dbValue);
             // Ensure the parsed result is an array
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error(`safeJsonParse: Failed to parse JSON string for ${fieldName}:`, dbValue, e);
            return []; // Return empty array on parse error
        }
    }
    
    // 3. If it's null, undefined, empty string, or anything else, return empty array
    // console.log(`safeJsonParse: Returning [] for non-string/non-object ${fieldName}:`, dbValue);
    return []; 
}


// GET /patient - Get authenticated patient's ID (used by upload form)
router.get('/', authMiddleware, (req, res) => {
  if (req.user.role !== 'patient') {
      return res.status(403).json({ error: "Access denied. Patients only." });
  }
  const patientId = req.user.id;
  res.json({ patient_id: patientId });
});


// GET /patient/detailed-records - Fetch authenticated patient's detailed medical records
router.get('/detailed-records', authMiddleware, async (req, res) => {
    if (req.user.role !== 'patient') {
        return res.status(403).json({ error: "Access denied. Patients only." });
    }
    const patientId = req.user.id;
    // console.log(`Fetching detailed records for patient ID: ${patientId}`); 

    try {
        const dbPromise = db.promise();
        const [recordRows] = await dbPromise.query(
        `SELECT id, problem, previous_medications, medical_history,
                prescriptions, lab_reports, created_at
         FROM detailed_medical_records
         WHERE patient_id = ? 
         ORDER BY created_at DESC`,
        [patientId]
        );

        // console.log(`Found ${recordRows.length} raw records from DB.`); 

        // Process records using the updated safeJsonParse
        const records = recordRows.map((record) => {
            // console.log(`Processing raw record ID ${record.id}: Prescriptions raw = ${record.prescriptions}, Lab Reports raw = ${record.lab_reports}`); 
            
            // Use the updated helper function
            const parsedPrescriptions = safeJsonParse(record.prescriptions, `record ${record.id} prescriptions`);
            const parsedLabReports = safeJsonParse(record.lab_reports, `record ${record.id} lab_reports`);

            const processedRecord = {
                id: record.id,
                problem: record.problem,
                previous_medications: record.previous_medications,
                medical_history: record.medical_history,
                created_at: record.created_at,
                prescriptions: parsedPrescriptions, 
                lab_reports: parsedLabReports     
            };
            // console.log(`Processed record ID ${record.id}:`, processedRecord); 
            return processedRecord;
        });

        // console.log(`Sending ${records.length} processed records to frontend.`); 
        res.json(records); 

    } catch (err) {
        console.error('Error fetching patient detailed records:', err);
        res.status(500).json({ message: 'Server error while fetching records.' });
    }
});

// GET /patient/profile-and-records/:id - Fetch specific patient profile and records (for Doctor view)
router.get('/profile-and-records/:id', authMiddleware, async (req, res) => {
    if (req.user.role !== 'doctor') {
         return res.status(403).json({ error: "Access denied. Doctors only." });
    }
    const patientId = req.params.id;
    if (!patientId || isNaN(parseInt(patientId))) {
         return res.status(400).json({ message: 'Valid patient ID required.' });
    }
    // console.log(`Doctor fetching profile/records for patient ID: ${patientId}`); 

    try {
        const dbPromise = db.promise();
        const [profileRows] = await dbPromise.query(
        'SELECT id, name, email, role FROM users WHERE id = ? AND role = \'patient\'', 
        [patientId]
        );

        if (profileRows.length === 0) {
          // console.log(`Patient profile not found for ID: ${patientId}`);
          return res.status(404).json({ message: 'Patient not found' });
        }
        const profile = profileRows[0];

        const [recordRows] = await dbPromise.query(
        `SELECT id, problem, previous_medications, medical_history,
                prescriptions, lab_reports, created_at
         FROM detailed_medical_records
         WHERE patient_id = ? 
         ORDER BY created_at DESC`,
        [patientId]
        );
        // console.log(`Found ${recordRows.length} raw records from DB for patient ${patientId}.`);

        // Process records using the updated safeJsonParse
        const records = recordRows.map((record) => {
            // console.log(`Processing raw record ID ${record.id} for patient ${patientId}: Prescriptions raw = ${record.prescriptions}, Lab Reports raw = ${record.lab_reports}`);
            
            // Use the updated helper function
            const parsedPrescriptions = safeJsonParse(record.prescriptions, `record ${record.id} prescriptions`);
            const parsedLabReports = safeJsonParse(record.lab_reports, `record ${record.id} lab_reports`);

            const processedRecord = {
                id: record.id,
                problem: record.problem,
                previous_medications: record.previous_medications,
                medical_history: record.medical_history,
                created_at: record.created_at,
                prescriptions: parsedPrescriptions,
                lab_reports: parsedLabReports
            };
            // console.log(`Processed record ID ${record.id} for patient ${patientId}:`, processedRecord);
            return processedRecord;
        });

        // console.log(`Sending profile and ${records.length} processed records for patient ${patientId} to doctor.`);
        res.json({
          profile,
          records,
        });
    } catch (err) {
        console.error('Error fetching patient profile and records:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


module.exports = router; // Ensure router is exported
