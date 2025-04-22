import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom'; 
import PatientDetailsModal from './PatientDetailsModal'; // Reuse the modal

function DoctorAllAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // *** State for Modal (Needs to be present in this component) ***
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [modalData, setModalData] = useState({ profile: null, records: [] });
  const [isLoadingModal, setIsLoadingModal] = useState(false);
  // *** End State for Modal ***

  const [updatingStatus, setUpdatingStatus] = useState(null); 

  const token = localStorage.getItem("token");

  // Function to fetch all appointments
  const fetchAppointments = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await axios.get("http://localhost:5000/appointments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sortedAppointments = res.data.sort((a, b) =>
        dayjs(a.appointment_date).valueOf() - dayjs(b.appointment_date).valueOf()
      );
      setAppointments(sortedAppointments);
    } catch (err) {
      console.error("Error fetching appointments:", err);
      setError("Failed to load appointments. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Fetch appointments on component mount
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // *** Function to handle viewing patient details (Needs to be present and correct) ***
  const handleViewPatientDetails = async (patientId) => {
    if (!patientId || !token) {
        console.error("Patient ID or token missing.");
        // Optionally show an error to the user
        return;
    }

    setSelectedPatientId(patientId); // Set the selected patient
    setIsModalOpen(true);           // Open the modal
    setIsLoadingModal(true);        // Set loading state for modal
    setModalData({ profile: null, records: [] }); // Clear previous data

    try {
      // Fetch profile and DETAILED records using the correct endpoint
      const response = await axios.get(`http://localhost:5000/patient/profile-and-records/${patientId}`, {
          headers: { Authorization: `Bearer ${token}` }
      });

      // Set the fetched data for the modal
      setModalData({ profile: response.data.profile, records: response.data.records });

    } catch (err) {
      console.error("Error fetching patient details or records for modal:", err);
      // Set error state or clear data
      setModalData({ profile: null, records: [] }); 
      // Optionally display an error message within the modal or via an alert
      alert(err.response?.data?.message || "Could not load patient details.");
    } finally {
      setIsLoadingModal(false); // Stop loading modal state
    }
  };
  // *** End handleViewPatientDetails ***

  // Function to close the modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPatientId(null); // Clear selected patient ID
  };

  // Function to handle confirming an appointment
  const handleConfirmAppointment = async (appointmentId) => {
    setUpdatingStatus(appointmentId); 
    setError('');
    try {
      await axios.put(`http://localhost:5000/appointments/confirm/${appointmentId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAppointments(prev => prev.map(appt => 
        appt.id === appointmentId ? { ...appt, status: 'confirmed' } : appt
      ));
      // alert("Appointment confirmed!"); // Optional: Use less intrusive feedback
    } catch (err) {
      console.error("Error confirming appointment:", err);
      const errorMsg = err.response?.data?.error || "Failed to confirm appointment.";
      setError(errorMsg);
      alert(errorMsg); 
    } finally {
      setUpdatingStatus(null); 
    }
  };

  // Function to handle cancelling an appointment
  const handleCancelAppointment = async (appointmentId) => {
     const confirmCancel = window.confirm("Are you sure you want to cancel this appointment?");
     if (!confirmCancel) return;

     setUpdatingStatus(appointmentId); 
     setError('');
     try {
        await axios.delete(`http://localhost:5000/appointments/cancel/${appointmentId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        setAppointments(prev => prev.filter(appt => appt.id !== appointmentId));
        // alert("Appointment cancelled successfully!"); // Optional feedback
     } catch (err) {
        console.error("Error cancelling appointment:", err);
        const errorMsg = err.response?.data?.error || "Failed to cancel appointment.";
        setError(errorMsg);
        alert(errorMsg); 
     } finally {
        setUpdatingStatus(null); 
     }
  };

  return (
    <div className="p-4"> 
      <h2 className="text-3xl font-bold mb-6 text-gray-800">All Appointments</h2>

      {error && <p className="text-red-600 bg-red-100 p-3 rounded mb-4">{error}</p>}

      {isLoading ? (
        <p className="text-gray-500">Loading appointments...</p>
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
                    {/* *** Ensure onClick calls the correct function with patient_id *** */}
                    <button
                      onClick={() => handleViewPatientDetails(appointment.patient_id)} 
                      className="text-blue-600 hover:underline ml-2 focus:outline-none"
                      title="View Patient Details"
                    >
                      {appointment.patientName}
                    </button>
                  </p>
                  <p className="text-gray-700">
                    Date: {dayjs(appointment.appointment_date).format("ddd, MMM D, YYYY - h:mm A")}
                  </p>
                  <p className="text-gray-700">
                    Status:
                    <span className={`ml-2 text-sm font-medium px-2 py-0.5 rounded ${
                      appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800' 
                    }`}>
                      {appointment.status}
                    </span>
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 flex-shrink-0 mt-2 sm:mt-0">
                  <button
                    onClick={() => handleConfirmAppointment(appointment.id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={appointment.status === 'confirmed' || updatingStatus === appointment.id}
                  >
                    {updatingStatus === appointment.id && appointment.status !== 'confirmed' ? 'Confirming...' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => handleCancelAppointment(appointment.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={updatingStatus === appointment.id}
                  >
                    {updatingStatus === appointment.id ? 'Cancelling...' : 'Cancel'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-gray-500 italic">No appointments found.</p>
      )}

      {/* *** Render the Modal with correct props *** */}
      <PatientDetailsModal
        isOpen={isModalOpen}
        onClose={closeModal}
        data={modalData}
        isLoading={isLoadingModal}
      />
    </div>
  );
}

export default DoctorAllAppointments;
