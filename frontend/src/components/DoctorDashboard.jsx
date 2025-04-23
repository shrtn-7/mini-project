import React, { useContext, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import axios from "axios";
import PatientDetailsModal from './PatientDetailsModal';
import AddPrescriptionModal from './AddPrescriptionModal'; // Import the modal
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(isBetween);
dayjs.extend(customParseFormat);

// Define default working hours (can be fetched from settings later)
const WORK_START_HOUR = 11;
const WORK_END_HOUR = 19;

function DoctorDashboard() {
  // Get user context
  const { user } = useContext(UserContext) || {};

  // State for appointments list
  const [appointments, setAppointments] = useState([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);

  // State for Patient Details Modal
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [selectedPatientIdForDetails, setSelectedPatientIdForDetails] = useState(null);
  const [patientModalData, setPatientModalData] = useState({ profile: null, records: [] });
  const [isLoadingPatientModal, setIsLoadingPatientModal] = useState(false);

  // --- Prescription Modal State ---
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [selectedAppointmentForPrescription, setSelectedAppointmentForPrescription] = useState(null);
  const [prescriptionDataForModal, setPrescriptionDataForModal] = useState(null); // Holds existing data if found
  const [isLoadingPrescriptionCheck, setIsLoadingPrescriptionCheck] = useState(false); // Loading state for checking existing prescription
  // --- End Prescription Modal State ---


  // Get auth token
  const token = localStorage.getItem("token");

  // Effect to fetch appointments and availability data on mount/token change
  useEffect(() => {
    // Function to fetch appointments
    const fetchAppointments = async () => {
      if (!token) return;
      setIsLoadingAppointments(true);
      try {
        const res = await axios.get("http://localhost:5000/appointments", {
          headers: { Authorization: `Bearer ${token}` },
        });
         const sortedAppointments = res.data.sort((a, b) =>
            dayjs(a.appointment_date).valueOf() - dayjs(b.appointment_date).valueOf()
        );
        setAppointments(sortedAppointments);
      } catch (err) {
        console.error("Error fetching appointments", err);
      } finally {
        setIsLoadingAppointments(false);
      }
    };

    // Function to fetch availability blocks
    const fetchAvailability = async () => {
      if (!token) return;
      setAvailabilityLoading(true); setAvailabilityError('');
      try {
        const [daysRes, slotsRes] = await Promise.all([
          axios.get("http://localhost:5000/availability/blocked/days", { headers: { Authorization: `Bearer ${token}` } }),
          axios.get("http://localhost:5000/availability/blocked/slots", { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setBlockedDays(daysRes.data.map(d => d.block_date).sort());
        setBlockedSlots(slotsRes.data.map(s => s.slot_datetime).sort());
      } catch (err) {
        console.error("Error fetching availability", err);
        setAvailabilityError("Failed to load availability data.");
      } finally {
        setAvailabilityLoading(false);
      }
    };

    if (token) {
      fetchAppointments();
      fetchAvailability();
    }
  }, [token]);

  // Function to handle opening the patient details modal
  const handleViewPatientDetails = async (patientId) => {
      if (!patientId || !token) return; // Added token check
      setSelectedPatientIdForDetails(patientId);
      setIsPatientModalOpen(true);
      setIsLoadingPatientModal(true);
      setPatientModalData({ profile: null, records: [] });
      try {
        const response = await axios.get(`http://localhost:5000/patient/profile-and-records/${patientId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setPatientModalData({ profile: response.data.profile, records: response.data.records });
      } catch (err) {
        console.error("Error fetching patient details or detailed records:", err);
        setPatientModalData({ profile: null, records: [] });
        alert(err.response?.data?.message || "Could not load patient details.");
      } finally {
        setIsLoadingPatientModal(false);
      }
  };

  // Function to close the patient details modal
  const closePatientModal = () => {
    setIsPatientModalOpen(false);
    setSelectedPatientIdForDetails(null);
  };

  // --- UPDATED: Prescription Handling ---

  // Handler to fetch data and then open the prescription modal
  const handleOpenPrescriptionModal = async (appointment) => {
    if (!appointment || !token) return;

    setIsLoadingPrescriptionCheck(true); // Indicate loading
    setSelectedAppointmentForPrescription({ // Keep basic appointment info
        id: appointment.id,
        patient_id: appointment.patient_id,
        patientName: appointment.patientName,
        appointment_date: appointment.appointment_date
    });
    setPrescriptionDataForModal(null); // Reset previous data

    try {
      // Fetch existing prescription data
      const response = await axios.get(
        `http://localhost:5000/medical-records/for-patient/${appointment.patient_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // If successful (200 OK), store the fetched data
      console.log("Existing prescription found:", response.data);
      setPrescriptionDataForModal(response.data); // Contains { recordId, diagnosisNotes, medications }

    } catch (err) {
      if (err.response && err.response.status === 404) {
        // 404 means no prescription exists, which is fine - proceed in "Add" mode
        console.log("No existing prescription found for patient:", appointment.patient_id);
        setPrescriptionDataForModal(null); // Ensure it's null for "Add" mode
      } else {
        // Handle other errors (e.g., network, server error)
        console.error("Error checking for existing prescription:", err);
        alert("Could not check for existing prescription. Please try again.");
        setIsLoadingPrescriptionCheck(false);
        return; // Don't open the modal on error
      }
    }

    setIsLoadingPrescriptionCheck(false); // Done loading
    setIsPrescriptionModalOpen(true); // Open the modal
  };


  // Handler to close the prescription modal
  const closePrescriptionModal = () => {
      setIsPrescriptionModalOpen(false);
      setSelectedAppointmentForPrescription(null);
      setPrescriptionDataForModal(null); // Clear fetched data when closing
  };

  // Handler to save prescription (Calls Backend POST endpoint)
  const handleSavePrescription = async (prescriptionData) => {
      console.log("Attempting to save prescription:", prescriptionData);
      if (!token) {
          throw new Error("Authentication token not found. Please log in again.");
      }
      try {
          const response = await axios.post(
              'http://localhost:5000/medical-records/prescription',
              prescriptionData, // contains { patientId, appointmentId, diagnosis, medicationList }
              {
                  headers: { Authorization: `Bearer ${token}` }
              }
          );

          console.log("Prescription saved/updated successfully via backend:", response.data);
          alert(response.data.message || "Prescription saved!");

          // Update appointment status locally in the dashboard list
          setAppointments(prev => prev.map(appt =>
              appt.id === prescriptionData.appointmentId
                  ? { ...appt, status: 'completed' } // Update status
                  : appt
          ));
          closePrescriptionModal(); // Close modal on success

      } catch (error) {
          console.error("Error saving prescription:", error);
          throw new Error(error.response?.data?.error || "Failed to save prescription. Please try again.");
      }
  };
  // --- End Prescription Handling ---


  // Generate time options for blocking specific slots within working hours
  const timeOptionsForBlocking = Array.from({ length: WORK_END_HOUR - WORK_START_HOUR }, (_, i) => {
      const hour = WORK_START_HOUR + i;
      return `${hour.toString().padStart(2, "0")}:00`;
  });
  // --- End Availability Handlers ---


  // --- JSX Rendering ---
  return (
    <div className="p-4">
      {/* Welcome Header */}
      <h2 className="text-2xl font-bold">Welcome, Dr. {user?.name || "Guest"}</h2>
      <p className="mt-2 text-gray-600">Manage your daily schedule and patient records.</p>

      {/* Appointments Section */}
      <div className="mt-6">
        <h3 className="text-xl font-bold text-gray-700">Upcoming Appointments</h3>
        {isLoadingAppointments ? (
            <p className="mt-2 text-gray-500">Loading appointments...</p>
        ) : appointments.length > 0 ? (
          <>
            <ul className="mt-2 space-y-4">
              {appointments.slice(0, 4).map((appointment) => (
                <li
                  key={appointment.id}
                  className="border p-4 rounded shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                >
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
                     <p className="text-sm text-gray-600">
                       Date: {dayjs(appointment.appointment_date).format("ddd, MMM D, YYYY - h:mm A")}
                     </p>
                     <p className="text-sm text-gray-600">
                       Status:
                       <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${
                         appointment.status === 'completed' ? 'bg-gray-200 text-gray-700' :
                         appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                         appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                         'bg-red-100 text-red-800'
                       }`}>
                         {appointment.status}
                       </span>
                     </p>
                  </div>
                  {/* Add/Update Prescription Button */}
                  <div className="flex-shrink-0 flex mt-2 sm:mt-0">
                    <button
                      onClick={() => handleOpenPrescriptionModal(appointment)} // Use the new handler
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs font-medium disabled:opacity-50"
                      title="Add or Update Prescription"
                      disabled={appointment.status === 'completed' || isLoadingPrescriptionCheck} // Disable while checking or if completed
                    >
                      {isLoadingPrescriptionCheck ? 'Checking...' : (appointment.status === 'completed' ? 'Prescribed' : 'Add/Update Prescription')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {appointments.length > 4 && (
              <div className="mt-4 text-right">
                <Link
                  to="/doctor/all-appointments"
                  className="text-blue-600 hover:underline text-sm font-medium"
                >
                  View All Appointments &rarr;
                </Link>
              </div>
            )}
          </>
        ) : (
          <p className="mt-2 text-gray-500 italic">No upcoming appointments found.</p>
        )}
      </div>
      {/* --- End Appointments Section --- */}

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
          existingData={prescriptionDataForModal} // Pass fetched data here
      />

    </div>
  );
}

export default DoctorDashboard;