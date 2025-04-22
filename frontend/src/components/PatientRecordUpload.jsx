import React, { useEffect, useState } from "react";
import axios from "axios";

// Renamed component for clarity
function PatientRecordUpload() {
  // State for patient ID (fetched on mount)
  const [patientId, setPatientId] = useState(null); 

  // State for text input fields
  const [problem, setProblem] = useState("");
  const [previousMedications, setPreviousMedications] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  
  // State for file inputs (arrays to support multiple files)
  const [prescriptionFiles, setPrescriptionFiles] = useState([]); 
  const [labReportFiles, setLabReportFiles] = useState([]); 
  
  // State for loading indicators and feedback messages
  const [isLoadingPatientId, setIsLoadingPatientId] = useState(false); // Loading state for initial patient ID fetch
  const [isSubmitting, setIsSubmitting] = useState(false); // Submission loading state
  const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' }); // For success/error messages

  // Get authentication token from local storage
  const token = localStorage.getItem("token");

  // Effect to fetch the logged-in patient's ID when the component mounts
  useEffect(() => {
    const fetchPatientId = async () => {
      if (!token) {
          setSubmitMessage({ type: 'error', text: 'Authentication required. Please log in.' });
          return; // Don't proceed if no token
      }
      setIsLoadingPatientId(true); // Start loading
      try {
        // Use the /patient endpoint to get the logged-in user's ID
        const res = await axios.get("http://localhost:5000/patient", { 
          headers: { Authorization: `Bearer ${token}` },
        });
        const patientIdFromApi = res.data.patient_id;
        if (patientIdFromApi) {
          setPatientId(patientIdFromApi); // Set the fetched patient ID
        } else {
          // Handle case where backend doesn't return ID (shouldn't happen if logged in)
          console.error("Patient ID not found in the response.");
          setSubmitMessage({ type: 'error', text: 'Could not identify patient. Please log in again.' });
        }
      } catch (err) {
        console.error("Error fetching patient data:", err);
        // Provide feedback if fetching fails
        setSubmitMessage({ type: 'error', text: 'Error fetching your information. Please try refreshing.' });
      } finally {
        setIsLoadingPatientId(false); // Stop loading
      }
    };

    fetchPatientId();
  }, [token]); // Re-run effect if token changes (e.g., after login)

  // Handler for prescription file input changes
  const handlePrescriptionFileChange = (e) => {
    // Store the selected files (FileList) as an array in state
    setPrescriptionFiles(Array.from(e.target.files)); 
  };

  // Handler for lab report file input changes
  const handleLabReportFileChange = (e) => {
    // Store the selected files (FileList) as an array in state
    setLabReportFiles(Array.from(e.target.files));
  };

  // Handler for form submission
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission
    setSubmitMessage({ type: '', text: '' }); // Clear previous messages

    // --- Validation ---
    if (!patientId) {
        setSubmitMessage({ type: 'error', text: 'Cannot submit record. Patient information missing.' });
        return;
    }
    if (!problem || !previousMedications || !medicalHistory) {
      setSubmitMessage({ type: 'error', text: 'Please fill in Problem, Previous Medications, and Medical History.' });
      return;
    }
    // Optional: Require at least one file upload
    if (prescriptionFiles.length === 0 && labReportFiles.length === 0) {
       setSubmitMessage({ type: 'error', text: 'Please upload at least one prescription or lab report PDF.' });
       return;
    }
    // --- End Validation ---

    setIsSubmitting(true); // Indicate submission is in progress

    // Create a FormData object to send text and files
    const formData = new FormData();
    
    // Append text fields
    // Note: patient_id might be redundant if backend solely relies on authMiddleware
    // but including it can be useful for backend logic/logging.
    formData.append("patient_id", patientId); 
    formData.append("problem", problem);
    formData.append("previousMedications", previousMedications); 
    formData.append("medicalHistory", medicalHistory);          
    
    // Append prescription files (if any)
    // The field name "prescriptions" must match the name used in multer backend setup
    prescriptionFiles.forEach((file, index) => {
        formData.append("prescriptions", file, file.name); // Append each file
    });

    // Append lab report files (if any)
    // The field name "labReports" must match the name used in multer backend setup
    labReportFiles.forEach((file, index) => {
        formData.append("labReports", file, file.name); // Append each file
    });

    try {
      // POST the FormData to the backend medical records endpoint
      const response = await axios.post("http://localhost:5000/medical-records", formData, {
        headers: {
          // 'Content-Type': 'multipart/form-data' is set automatically by axios for FormData
          Authorization: `Bearer ${token}`, // Include auth token
        },
        // Optional: Add progress tracking if needed
        // onUploadProgress: progressEvent => { ... } 
      });

      console.log("Medical record saved:", response.data);
      setSubmitMessage({ type: 'success', text: response.data.message || 'Medical record saved successfully.' });
      
      // --- Clear the form on success ---
      setProblem("");
      setPreviousMedications("");
      setMedicalHistory("");
      setPrescriptionFiles([]);
      setLabReportFiles([]);
      
      // Attempt to visually clear the file input elements
      // Note: This might not work perfectly in all browsers for security reasons
      try {
          document.getElementById('prescriptions').value = null; 
          document.getElementById('labReports').value = null;    
      } catch (clearError) {
          console.warn("Could not clear file input elements visually.", clearError);
      }
      // --- End Form Clearing ---

    } catch (error) {
      // Handle submission errors
      console.error("Error saving medical record:", error);
      // Display specific error from backend if available, otherwise a generic message
      setSubmitMessage({ type: 'error', text: error.response?.data?.error || 'Failed to save medical record. Please check the details and file types (PDF only).' });
    } finally {
      setIsSubmitting(false); // Stop indicating submission progress
    }
  };

  // --- JSX Rendering ---
  return (
    // Add styling for centering and max width
    <div className="p-4 max-w-2xl mx-auto"> 
      <h2 className="text-2xl font-bold mb-5 border-b pb-2 text-gray-800">Upload Medical Record</h2>
      
      {/* Show loading indicator while fetching patient ID */}
      {isLoadingPatientId && <p className="text-center text-gray-600">Loading your information...</p>}

      {/* Display error if patient ID couldn't be fetched */}
      {!isLoadingPatientId && !patientId && submitMessage.type === 'error' && (
          <p className="text-center text-red-600 bg-red-100 p-3 rounded">{submitMessage.text}</p>
      )}

      {/* Render the form only if patient ID is available */}
      {!isLoadingPatientId && patientId && (
        <form onSubmit={handleSubmit} className="space-y-5 bg-white p-6 rounded-lg shadow-md border border-gray-200">
          
          {/* Problem Input */}
          <div>
            <label htmlFor="problem" className="block text-sm font-medium text-gray-700 mb-1">Problem / Reason for Visit <span className="text-red-500">*</span></label>
            <input
              id="problem"
              type="text"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              className="border border-gray-300 p-2 w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>

          {/* Previous Medications Input */}
          <div>
            <label htmlFor="previousMedications" className="block text-sm font-medium text-gray-700 mb-1">Previous Medications <span className="text-red-500">*</span></label>
            <textarea
              id="previousMedications"
              value={previousMedications}
              onChange={(e) => setPreviousMedications(e.target.value)}
              className="border border-gray-300 p-2 w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              rows="3"
              required
            />
          </div>

          {/* Medical History Input */}
          <div>
            <label htmlFor="medicalHistory" className="block text-sm font-medium text-gray-700 mb-1">Relevant Medical History <span className="text-red-500">*</span></label>
            <textarea
              id="medicalHistory"
              value={medicalHistory}
              onChange={(e) => setMedicalHistory(e.target.value)}
              className="border border-gray-300 p-2 w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              rows="4"
              required
            />
          </div>
          
          {/* Prescription File Input */}
          <div>
            <label htmlFor="prescriptions" className="block text-sm font-medium text-gray-700 mb-1">Upload Prescriptions (PDF only)</label>
            <input
              id="prescriptions"
              type="file"
              accept="application/pdf" // Restrict to PDF
              multiple // Allow selecting multiple files
              onChange={handlePrescriptionFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
             {/* Display selected prescription file names */}
             {prescriptionFiles.length > 0 && (
                <ul className="list-disc list-inside text-xs text-gray-600 mt-2 pl-1">
                    {prescriptionFiles.map(f => <li key={f.name}>{f.name} ({Math.round(f.size / 1024)} KB)</li>)}
                </ul>
             )}
          </div>

          {/* Lab Reports File Input */}
          <div>
            <label htmlFor="labReports" className="block text-sm font-medium text-gray-700 mb-1">Upload Lab Reports (PDF only)</label>
            <input
              id="labReports"
              type="file"
              accept="application/pdf" // Restrict to PDF
              multiple // Allow selecting multiple files
              onChange={handleLabReportFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer"
            />
             {/* Display selected lab report file names */}
             {labReportFiles.length > 0 && (
                <ul className="list-disc list-inside text-xs text-gray-600 mt-2 pl-1">
                    {labReportFiles.map(f => <li key={f.name}>{f.name} ({Math.round(f.size / 1024)} KB)</li>)}
                </ul>
             )}
          </div>

          {/* Submit Message Area */}
          {submitMessage.text && (
             <p className={`text-sm mt-2 p-3 rounded-md ${submitMessage.type === 'error' ? 'text-red-800 bg-red-100 border border-red-200' : 'text-green-800 bg-green-100 border border-green-200'}`}>
               {submitMessage.text}
             </p>
           )}

          {/* Submit Button */}
          <div className="pt-3"> {/* Added padding top */}
            <button
              type="submit"
              className={`w-full px-4 py-2.5 rounded text-white font-medium transition-colors ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              disabled={isSubmitting || !patientId} // Disable if submitting or patient ID not loaded
            >
              {isSubmitting ? 'Submitting...' : 'Submit Record'}
            </button>
          </div>
        </form>
      )}

    </div>
  );
}

// Ensure component is exported
export default PatientRecordUpload; 
