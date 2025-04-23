import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs'; // For displaying appointment date

// Simple unique ID generator for list keys - reset in useEffect
let nextMedicationId = 1;

// Add 'existingData' prop to the function signature
function AddPrescriptionModal({ isOpen, onClose, appointmentInfo, onSave, existingData }) {
  // State for the list of medications { id, name, timings }
  const [medications, setMedications] = useState([]); // Initialize empty, useEffect will populate
  // State for overall diagnosis/notes
  const [diagnosisNotes, setDiagnosisNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Determine mode based on whether existingData was passed and has content
  const isUpdateMode = !!existingData && (existingData.diagnosisNotes || (Array.isArray(existingData.medications) && existingData.medications.length > 0));

  // Updated useEffect to handle pre-population or reset
  useEffect(() => {
    if (isOpen && appointmentInfo) { // Ensure appointmentInfo is also present
      setError('');
      setIsLoading(false);
      nextMedicationId = 1; // Reset unique ID counter for list keys

      if (isUpdateMode && existingData) {
        console.log("Modal opened in UPDATE mode with data:", existingData);
        // Pre-populate form with existing data
        setDiagnosisNotes(existingData.diagnosisNotes || '');

        // Ensure medications is an array and add unique IDs for the list keys
        const initialMeds = Array.isArray(existingData.medications)
          ? existingData.medications.map(med => ({
              id: nextMedicationId++,
              name: med.name || '', // Ensure name exists
              timings: med.timings || '' // Ensure timings exist
            }))
          : [];

        // Ensure at least one row exists, even if fetched data had no medications
        setMedications(initialMeds.length > 0 ? initialMeds : [{ id: nextMedicationId++, name: '', timings: '' }]);

      } else {
         console.log("Modal opened in ADD mode");
        // Reset form for "Add" mode
        setDiagnosisNotes('');
        setMedications([{ id: nextMedicationId++, name: '', timings: '' }]); // Start with one empty row
      }
    } else if (!isOpen) {
        // Optional: Clear state when modal is fully closed if needed
        // setMedications([]);
        // setDiagnosisNotes('');
    }
  }, [isOpen, existingData, isUpdateMode, appointmentInfo]); // Add all relevant dependencies

  // Handle changes in medication name or timings input
  const handleMedicationChange = (id, field, value) => {
    setMedications(prevMeds =>
      prevMeds.map(med =>
        med.id === id ? { ...med, [field]: value } : med
      )
    );
     if (error) setError(''); // Clear error on input change
  };

  // Add a new empty medication row
  const handleAddMedication = () => {
    setMedications(prevMeds => [
      ...prevMeds,
      { id: nextMedicationId++, name: '', timings: '' }
    ]);
  };

  // Delete a medication row (prevent deleting the last one)
  const handleDeleteMedication = (idToDelete) => {
    if (medications.length <= 1) {
      setError("At least one medication entry is required.");
      setTimeout(() => setError(''), 3000); // Clear error after a delay
      return; // Don't delete the last item
    }
    setError(''); // Clear error if deleting is possible
    setMedications(prevMeds => prevMeds.filter(med => med.id !== idToDelete));
  };

  // Handle saving the prescription
  const handleSave = async () => {
    setError(''); // Clear previous errors

    // Validation: Check if patient info is available
    if (!appointmentInfo?.patient_id || !appointmentInfo?.id) {
        setError("Patient or Appointment information is missing. Cannot save.");
        return;
    }

    // Validation: Check if all medication names and timings are filled
    const incompleteMed = medications.find(med => !med.name?.trim() || !med.timings?.trim());
    if (incompleteMed) {
        setError("Please fill in both Medicine Name and Timings for all entries.");
        return;
    }

    setIsLoading(true);
    // Prepare payload for the backend
    const prescriptionPayload = {
        patientId: appointmentInfo.patient_id, // Get patientId from appointmentInfo
        appointmentId: appointmentInfo.id, // Include appointment ID for status update potentially
        diagnosis: diagnosisNotes,
        // Send only name and timings, remove the temporary 'id' used for keys
        medicationList: medications.map(({ name, timings }) => ({ name, timings }))
    };

    // Call the onSave prop function passed from the parent component
    try {
        await onSave(prescriptionPayload);
        // Parent component (Dashboard/AllAppointments) handles closing the modal on success
    } catch (saveError) {
        setError(saveError.message || `Failed to ${isUpdateMode ? 'update' : 'save'} prescription.`); // Display error from parent
    } finally {
        setIsLoading(false);
    }
  };

  // Don't render anything if the modal is not open or essential info is missing
  if (!isOpen || !appointmentInfo) return null;

  return (
    // Modal Overlay
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4 transition-opacity duration-300 ease-out">
      {/* Modal Content */}
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col transition-transform duration-300 ease-out scale-95 opacity-0 animate-modal-scale-in">
        {/* Modal Header - Dynamic Title */}
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-xl font-semibold text-gray-800">
             {isUpdateMode ? 'Update Prescription' : 'Add Prescription'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold focus:outline-none"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Patient Info */}
          <div className="mb-4 p-3 bg-gray-50 rounded border">
              <p className="text-sm"><strong>Patient:</strong> {appointmentInfo.patientName} (ID: {appointmentInfo.patient_id})</p>
              <p className="text-sm"><strong>Appointment:</strong> {dayjs(appointmentInfo.appointment_date).format("ddd, MMM D, YYYY - h:mm A")}</p>
          </div>

          {/* Optional Diagnosis/Notes */}
          <div>
              <label htmlFor="diagnosisNotes" className="block text-sm font-medium text-gray-700 mb-1">Diagnosis / Notes</label>
              <textarea
                  id="diagnosisNotes"
                  rows="3"
                  value={diagnosisNotes}
                  onChange={(e) => setDiagnosisNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter any relevant diagnosis or notes..."
              />
          </div>

          <hr/>

          {/* Medication List */}
          <h4 className="text-lg font-medium text-gray-700">Medications</h4>
          <div className="space-y-3">
            {medications.map((med, index) => (
              <div key={med.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 border p-3 rounded bg-gray-50">
                {/* Medication Fields */}
                <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                  <div>
                    <label htmlFor={`medName-${med.id}`} className="block text-xs font-medium text-gray-600 mb-1">Medicine Name <span className="text-red-500">*</span></label>
                    <textarea
                      id={`medName-${med.id}`}
                      rows="2"
                      value={med.name}
                      onChange={(e) => handleMedicationChange(med.id, 'name', e.target.value)}
                      placeholder="e.g., Paracetamol 500mg"
                      required
                      className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor={`medTimings-${med.id}`} className="block text-xs font-medium text-gray-600 mb-1">Timings / Dosage <span className="text-red-500">*</span></label>
                    <textarea
                      id={`medTimings-${med.id}`}
                      rows="2"
                      value={med.timings}
                      onChange={(e) => handleMedicationChange(med.id, 'timings', e.target.value)}
                      placeholder="e.g., 1 tablet thrice daily after food"
                      required
                      className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
                {/* Delete Button */}
                <div className="flex-shrink-0 mt-2 sm:mt-0 sm:self-end">
                  <button
                    type="button" // Prevent form submission
                    onClick={() => handleDeleteMedication(med.id)}
                    disabled={medications.length <= 1} // Disable if only one item left
                    className={`text-red-500 hover:text-red-700 p-1 rounded-full ${medications.length <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-100'}`}
                    title="Delete Medication"
                  >
                    {/* Simple X icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Medication Button */}
          <button
            type="button" // Prevent form submission
            onClick={handleAddMedication}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Medication
          </button>

          {/* Error Message */}
          {error && <p className="text-sm text-red-600 mt-2 p-2 bg-red-50 rounded border border-red-200">{error}</p>}
        </div>

        {/* Modal Footer - Dynamic Button Text */}
        <div className="flex justify-end items-center p-4 border-t space-x-3 bg-gray-50 rounded-b-lg">
          <button
            type="button" // Prevent form submission
            onClick={onClose}
            className="px-4 py-2 rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="button" // Prevent form submission, handled by onClick
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : (isUpdateMode ? 'Update Prescription' : 'Save Prescription')}
          </button>
        </div>
      </div>
      {/* Add simple animation style */}
      <style>{`
          @keyframes modal-scale-in {
              from { transform: scale(0.95); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
          }
          .animate-modal-scale-in {
              animation: modal-scale-in 0.2s ease-out forwards;
          }
      `}</style>
    </div>
  );
}

export default AddPrescriptionModal;