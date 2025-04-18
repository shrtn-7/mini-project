import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom'; // Although Link might not be needed here unless linking elsewhere
import PatientDetailsModal from './PatientDetailsModal'; // Reuse the modal

function DoctorAllAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [modalData, setModalData] = useState({ profile: null, records: [] });
  const [isLoadingModal, setIsLoadingModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(null); // Track which appointment status is being updated/cancelled

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
      // Sort appointments by date ASC
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

  // Function to handle viewing patient details (reused from Dashboard)
  const handleViewPatientDetails = async (patientId) => {
    if (!patientId) return;
    setSelectedPatientId(patientId);
    setIsModalOpen(true);
    setIsLoadingModal(true);
    setModalData({ profile: null, records: [] });
    try {
      const [profileRes, recordsRes] = await Promise.all([
        axios.get(`http://localhost:5000/users/${patientId}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`http://localhost:5000/medical-records/${patientId}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setModalData({ profile: profileRes.data, records: recordsRes.data });
    } catch (err) {
      console.error("Error fetching patient details or records:", err);
      setModalData({ profile: null, records: [] });
    } finally {
      setIsLoadingModal(false);
    }
  };

  // Function to close the modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPatientId(null);
  };

  // Function to handle confirming an appointment
  const handleConfirmAppointment = async (appointmentId) => {
    setUpdatingStatus(appointmentId); // Indicate loading for this item
    setError('');
    try {
      await axios.put(`http://localhost:5000/appointments/confirm/${appointmentId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Update the status locally for immediate feedback
      setAppointments(prev => prev.map(appt => 
        appt.id === appointmentId ? { ...appt, status: 'confirmed' } : appt
      ));
      alert("Appointment confirmed!");
    } catch (err) {
      console.error("Error confirming appointment:", err);
      setError(err.response?.data?.error || "Failed to confirm appointment.");
      alert(error || "Failed to confirm appointment."); // Show error alert
    } finally {
      setUpdatingStatus(null); // Reset loading indicator
    }
  };

  // Function to handle cancelling an appointment
  const handleCancelAppointment = async (appointmentId) => {
     const confirmCancel = window.confirm("Are you sure you want to cancel this appointment?");
     if (!confirmCancel) return;

     setUpdatingStatus(appointmentId); // Indicate loading for this item
     setError('');
     try {
        await axios.delete(`http://localhost:5000/appointments/cancel/${appointmentId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        // Remove from list locally for immediate feedback
        setAppointments(prev => prev.filter(appt => appt.id !== appointmentId));
        alert("Appointment cancelled successfully!");
     } catch (err) {
        console.error("Error cancelling appointment:", err);
        setError(err.response?.data?.error || "Failed to cancel appointment.");
        alert(error || "Failed to cancel appointment."); // Show error alert
     } finally {
        setUpdatingStatus(null); // Reset loading indicator
     }
  };

  return (
    <div className="p-4"> {/* Use standard padding, App.jsx handles overall padding */}
      <h2 className="text-3xl font-bold mb-6 text-gray-800">Appointments</h2>

      {error && <p className="text-red-500 bg-red-100 p-3 rounded mb-4">{error}</p>}

      {isLoading ? (
        <p className="text-gray-500">Loading appointments...</p>
      ) : appointments.length > 0 ? (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow"> {/* Optional card styling */}
          <ul className="space-y-4">
            {appointments.map((appointment) => (
              <li
                key={appointment.id}
                className="border rounded p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4" // Responsive layout
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
                  <p className="text-gray-700">
                    Date: {dayjs(appointment.appointment_date).format("ddd, MMM D, YYYY - h:mm A")}
                  </p>
                  <p className="text-gray-700">
                    Status:
                    <span className={`ml-2 text-sm font-medium px-2 py-0.5 rounded ${
                      appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800' // Default/Cancelled
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
                    // Disable if already confirmed or if currently updating this one
                    disabled={appointment.status === 'confirmed' || updatingStatus === appointment.id}
                  >
                    {/* Show loading state */}
                    {updatingStatus === appointment.id && appointment.status !== 'confirmed' ? 'Confirming...' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => handleCancelAppointment(appointment.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                     // Disable if currently updating this one
                    disabled={updatingStatus === appointment.id}
                  >
                     {/* Show loading state */}
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

      {/* Render the Modal */}
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
