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

  // State for Availability Management section
  const [blockedDays, setBlockedDays] = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [blockDayDate, setBlockDayDate] = useState('');
  const [blockSlotDate, setBlockSlotDate] = useState('');
  const [blockSlotTime, setBlockSlotTime] = useState('');
  const [availabilityError, setAvailabilityError] = useState('');
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

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


  // --- Availability Handlers ---
  const handleBlockDay = async (e) => {
      e.preventDefault();
      if (!blockDayDate || !token) return;
      setAvailabilityLoading(true); setAvailabilityError('');
      try {
          await axios.post('http://localhost:5000/availability/block/day', { block_date: blockDayDate }, { headers: { Authorization: `Bearer ${token}` } });
          setBlockedDays(prev => [...prev, blockDayDate].sort());
          setBlockDayDate(''); // Clear input
          alert(`Blocked date: ${dayjs(blockDayDate).format('YYYY-MM-DD')}`);
      } catch (err) {
          console.error("Error blocking day:", err);
          setAvailabilityError(err.response?.data?.error || 'Failed to block day.');
      } finally {
          setAvailabilityLoading(false);
      }
  };

  const handleUnblockDay = async (dateToUnblock) => {
       if (!dateToUnblock || !token) return;
       setAvailabilityLoading(true); setAvailabilityError('');
       try {
           await axios.delete(`http://localhost:5000/availability/unblock/day/${dateToUnblock}`, { headers: { Authorization: `Bearer ${token}` } });
           setBlockedDays(prev => prev.filter(d => d !== dateToUnblock));
           alert(`Unblocked date: ${dayjs(dateToUnblock).format('YYYY-MM-DD')}`);
       } catch (err) {
           console.error("Error unblocking day:", err);
           setAvailabilityError(err.response?.data?.error || 'Failed to unblock day.');
       } finally {
           setAvailabilityLoading(false);
       }
  };

  const handleBlockSlot = async (e) => {
     e.preventDefault();
     if (!blockSlotDate || !blockSlotTime || !token) return;
     const slotDateTime = `${blockSlotDate} ${blockSlotTime}:00`; // Combine date and time
     setAvailabilityLoading(true); setAvailabilityError('');
     try {
         await axios.post('http://localhost:5000/availability/block/slot', { slot_datetime: slotDateTime }, { headers: { Authorization: `Bearer ${token}` } });
         setBlockedSlots(prev => [...prev, slotDateTime].sort());
         setBlockSlotDate(''); // Clear inputs
         setBlockSlotTime('');
         alert(`Blocked slot: ${dayjs(slotDateTime).format('YYYY-MM-DD h:mm A')}`);
     } catch (err) {
         console.error("Error blocking slot:", err);
         setAvailabilityError(err.response?.data?.error || 'Failed to block slot.');
     } finally {
         setAvailabilityLoading(false);
     }
  };

  const handleUnblockSlot = async (dateTimeToUnblock) => {
      if (!dateTimeToUnblock || !token) return;
      setAvailabilityLoading(true); setAvailabilityError('');
      try {
          // Encode the datetime string for the URL parameter
          const encodedDateTime = encodeURIComponent(dateTimeToUnblock);
          await axios.delete(`http://localhost:5000/availability/unblock/slot/${encodedDateTime}`, { headers: { Authorization: `Bearer ${token}` } });
          setBlockedSlots(prev => prev.filter(s => s !== dateTimeToUnblock));
          alert(`Unblocked slot: ${dayjs(dateTimeToUnblock).format('YYYY-MM-DD h:mm A')}`);
      } catch (err) {
          console.error("Error unblocking slot:", err);
          setAvailabilityError(err.response?.data?.error || 'Failed to unblock slot.');
      } finally {
          setAvailabilityLoading(false);
      }
  };

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

      {/* --- Availability Section --- */}
       <div className="mt-8 border-t pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
         {/* Block Full Days Section */}
         <section className="bg-white p-4 sm:p-6 rounded-lg shadow-md border border-gray-200">
           <h3 className="text-xl font-semibold mb-4 text-gray-700">Manage Full Day Unavailability</h3>
           <form onSubmit={handleBlockDay} className="flex items-center gap-3 mb-4">
             <input type="date" value={blockDayDate} onChange={(e) => setBlockDayDate(e.target.value)} min={dayjs().format("YYYY-MM-DD")} required className="border p-2 rounded-md flex-grow focus:ring-blue-500 focus:border-blue-500"/>
             <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50" disabled={availabilityLoading}>Block Day</button>
           </form>
           <h4 className="text-lg font-medium mb-2 text-gray-600">Blocked Days:</h4>
           {availabilityLoading && blockedDays.length === 0 ? <p className="text-sm text-gray-500">Loading...</p> : null}
           {!availabilityLoading && blockedDays.length === 0 ? <p className="text-sm text-gray-500 italic">No full days blocked.</p> : null}
           {blockedDays.length > 0 && (
             <ul className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3 bg-gray-50">
               {blockedDays.map((date) => (
                 <li key={date} className="flex justify-between items-center p-2 bg-red-100 rounded text-sm">
                   <span>{dayjs(date).format('ddd, MMM D, YYYY')}</span>
                   <button onClick={() => handleUnblockDay(date)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs disabled:opacity-50" disabled={availabilityLoading}>Make Available</button>
                 </li>
               ))}
             </ul>
           )}
         </section>
         {/* Block Specific Slots Section */}
         <section className="bg-white p-4 sm:p-6 rounded-lg shadow-md border border-gray-200">
           <h3 className="text-xl font-semibold mb-4 text-gray-700">Manage Specific Slot Unavailability</h3>
           <form onSubmit={handleBlockSlot} className="flex flex-wrap items-center gap-3 mb-4">
             <input type="date" value={blockSlotDate} onChange={(e) => setBlockSlotDate(e.target.value)} min={dayjs().format("YYYY-MM-DD")} required className="border p-2 rounded-md focus:ring-blue-500 focus:border-blue-500"/>
             <select value={blockSlotTime} onChange={(e) => setBlockSlotTime(e.target.value)} required className="border p-2 rounded-md focus:ring-blue-500 focus:border-blue-500">
               <option value="">Select Time</option>
               {timeOptionsForBlocking.map(time => (<option key={time} value={time}>{dayjs(`1970-01-01 ${time}`).format('h:mm A')}</option>))}
             </select>
             <button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50" disabled={availabilityLoading}>Block Slot</button>
           </form>
           <h4 className="text-lg font-medium mb-2 text-gray-600">Blocked Slots:</h4>
           {availabilityLoading && blockedSlots.length === 0 ? <p className="text-sm text-gray-500">Loading...</p> : null}
           {!availabilityLoading && blockedSlots.length === 0 ? <p className="text-sm text-gray-500 italic">No specific time slots blocked.</p> : null}
           {blockedSlots.length > 0 && (
             <ul className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3 bg-gray-50">
               {blockedSlots.map((datetime) => (
                 <li key={datetime} className="flex justify-between items-center p-2 bg-yellow-100 rounded text-sm">
                   <span>{dayjs(datetime).format('ddd, MMM D - h:mm A')}</span>
                   <button onClick={() => handleUnblockSlot(datetime)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs disabled:opacity-50" disabled={availabilityLoading}>Unblock Slot</button>
                 </li>
               ))}
             </ul>
           )}
         </section>
         {/* Availability Error Display */}
         {availabilityError && <p className="text-red-600 text-center font-medium mt-4 col-span-1 md:col-span-2 bg-red-100 p-2 rounded">{availabilityError}</p>}
       </div>
      {/* --- End Availability Section --- */}

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