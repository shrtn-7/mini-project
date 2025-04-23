import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom'; 
import PatientDetailsModal from './PatientDetailsModal'; 
import AddPrescriptionModal from './AddPrescriptionModal'; // Import the modal component

function DoctorAllAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // State for Patient Details Modal 
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [selectedPatientIdForDetails, setSelectedPatientIdForDetails] = useState(null);
  const [patientModalData, setPatientModalData] = useState({ profile: null, records: [] });
  const [isLoadingPatientModal, setIsLoadingPatientModal] = useState(false);

  // State for Add Prescription Modal
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [selectedAppointmentForPrescription, setSelectedAppointmentForPrescription] = useState(null); 

  const token = localStorage.getItem("token");

  // Function to fetch all appointments
  const fetchAppointments = useCallback(async () => { 
    if (!token) return; setIsLoading(true); setError('');
    try {
      const res = await axios.get("http://localhost:5000/appointments", { headers: { Authorization: `Bearer ${token}` } });
      const sortedAppointments = res.data.sort((a, b) => dayjs(a.appointment_date).valueOf() - dayjs(b.appointment_date).valueOf());
      setAppointments(sortedAppointments);
    } catch (err) { console.error("Error fetching appointments:", err); setError("Failed to load appointments. Please try again."); } 
    finally { setIsLoading(false); }
  }, [token]);

  // Fetch appointments on component mount
  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  // Function to handle viewing patient details 
  const handleViewPatientDetails = async (patientId) => { 
    if (!patientId || !token) { console.error("Patient ID or token missing."); return; }
    setSelectedPatientIdForDetails(patientId); setIsPatientModalOpen(true); setIsLoadingPatientModal(true); setPatientModalData({ profile: null, records: [] }); 
    try {
      const response = await axios.get(`http://localhost:5000/patient/profile-and-records/${patientId}`, { headers: { Authorization: `Bearer ${token}` } });
      setPatientModalData({ profile: response.data.profile, records: response.data.records });
    } catch (err) { console.error("Error fetching patient details or records for modal:", err); setPatientModalData({ profile: null, records: [] }); alert(err.response?.data?.message || "Could not load patient details."); } 
    finally { setIsLoadingPatientModal(false); }
  };

  // Function to close the patient details modal
  const closePatientModal = () => { 
    setIsPatientModalOpen(false); setSelectedPatientIdForDetails(null); 
  };

  // Handler for Add Prescription Button Click - Opens the modal
  const handleAddPrescriptionClick = (appointment) => {
      console.log("Opening prescription modal for appointment:", appointment);
      setSelectedAppointmentForPrescription({
          id: appointment.id,
          patient_id: appointment.patient_id,
          patientName: appointment.patientName,
          appointment_date: appointment.appointment_date 
      });
      setIsPrescriptionModalOpen(true); // Open the modal
  };

  // Handler to close the prescription modal
  const closePrescriptionModal = () => {
      setIsPrescriptionModalOpen(false);
      setSelectedAppointmentForPrescription(null); 
  };

  // Handler to save prescription (Calls Backend)
  const handleSavePrescription = async (prescriptionData) => {
      console.log("Attempting to save prescription:", prescriptionData);
      if (!token) {
          throw new Error("Authentication token not found."); 
      }
      try {
          // Call the backend endpoint defined in routes/medicalRecords.js
          const response = await axios.post(
              'http://localhost:5000/medical-records/prescription', 
              prescriptionData, 
              { 
                  headers: { Authorization: `Bearer ${token}` }
              }
          );

          console.log("Prescription saved successfully via backend:", response.data);
          alert(response.data.message || "Prescription saved!"); 

          // Update appointment status locally in the full list
          setAppointments(prev => prev.map(appt => 
              appt.id === prescriptionData.appointmentId 
                  ? { ...appt, status: 'completed' } // Update status
                  : appt
          ));
          closePrescriptionModal(); // Close modal on success

      } catch (error) {
          console.error("Error saving prescription:", error);
          // Re-throw the error so the modal can display it
          throw new Error(error.response?.data?.error || "Failed to save prescription. Please try again."); 
      }
  };

  return (
    <div className="p-4"> 
      <h2 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-2">All Appointments</h2>

      {error && <p className="text-red-600 bg-red-100 p-3 rounded mb-4">{error}</p>}

      {isLoading ? ( 
        <p className="text-gray-500 text-center mt-10">Loading appointments...</p> 
      ) : appointments.length > 0 ? (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow"> 
          <ul className="space-y-4">
            {appointments.map((appointment) => (
              <li 
                key={appointment.id} 
                className="border rounded p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4"
              >
                {/* Appointment Details */}
                <div className="flex-grow">
                  <p className="font-semibold"> 
                    Patient: 
                    <button 
                      onClick={() => handleViewPatientDetails(appointment.patient_id)} 
                      className="text-blue-600 hover:underline ml-2 focus:outline-none" 
                      title="View Patient Details"
                    > 
                      {appointment.patientName} 
                    </button> 
                  </p>
                  <p className="text-sm text-gray-700"> 
                    Date: {dayjs(appointment.appointment_date).format("ddd, MMM D, YYYY - h:mm A")} 
                  </p>
                  <p className="text-sm text-gray-700"> 
                    Status: 
                    <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded ${ 
                      appointment.status === 'completed' ? 'bg-gray-200 text-gray-700' : 
                      appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                      appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-gray-100 text-gray-800' // Default style
                    }`}> 
                      {appointment.status} 
                    </span> 
                  </p>
                </div>
                {/* Add Prescription Button */}
                <div className="flex-shrink-0 flex mt-2 sm:mt-0"> 
                  <button 
                    onClick={() => handleAddPrescriptionClick(appointment)} // Call handler to open modal
                    className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm font-medium disabled:opacity-50" 
                    title="Add Prescription"
                    disabled={appointment.status === 'completed'} // Disable if completed
                  >
                     {appointment.status === 'completed' ? 'Prescribed' : 'Add Prescription'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : ( 
        <p className="text-gray-500 italic text-center mt-10">No appointments found.</p> 
      )}

      {/* Render Patient Details Modal */}
      <PatientDetailsModal
        isOpen={isPatientModalOpen} 
        onClose={closePatientModal} 
        data={patientModalData}     
        isLoading={isLoadingPatientModal} 
      />

       {/* Render Add Prescription Modal */}
      <AddPrescriptionModal
          isOpen={isPrescriptionModalOpen}
          onClose={closePrescriptionModal}
          appointmentInfo={selectedAppointmentForPrescription} 
          onSave={handleSavePrescription} 
      /> 
      
    </div>
  );
}

export default DoctorAllAppointments;
