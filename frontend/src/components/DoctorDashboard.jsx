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
  
  // State for Add Prescription Modal
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [selectedAppointmentForPrescription, setSelectedAppointmentForPrescription] = useState(null); 

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
        // Ensure sorting happens on the frontend
         const sortedAppointments = res.data.sort((a, b) => 
            dayjs(a.appointment_date).valueOf() - dayjs(b.appointment_date).valueOf()
        );
        setAppointments(sortedAppointments); 
      } catch (err) { 
        console.error("Error fetching appointments", err); 
        // Optionally set an error state
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

    // Fetch data if token exists
    if (token) { 
      fetchAppointments(); 
      fetchAvailability(); 
    }
  }, [token]); // Re-run if token changes

  // Function to handle opening the patient details modal
  const handleViewPatientDetails = async (patientId) => { 
      if (!patientId) return;
      setSelectedPatientIdForDetails(patientId); 
      setIsPatientModalOpen(true); 
      setIsLoadingPatientModal(true); 
      setPatientModalData({ profile: null, records: [] }); 
      try {
        // Fetch profile and detailed records
        const response = await axios.get(`http://localhost:5000/patient/profile-and-records/${patientId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setPatientModalData({ profile: response.data.profile, records: response.data.records }); 
      } catch (err) { 
        console.error("Error fetching patient details or detailed records:", err); 
        setPatientModalData({ profile: null, records: [] }); 
        alert(err.response?.data?.message || "Could not load patient details."); // Show error
      } finally { 
        setIsLoadingPatientModal(false); 
      }
  };

  // Function to close the patient details modal
  const closePatientModal = () => { 
    setIsPatientModalOpen(false); 
    setSelectedPatientIdForDetails(null); 
  };

  // Handler for Add Prescription Button Click - Opens the modal
  const handleAddPrescriptionClick = (appointment) => {
      console.log("Opening prescription modal for appointment:", appointment);
      // Store the necessary info from the appointment object
      setSelectedAppointmentForPrescription({
          id: appointment.id,
          patient_id: appointment.patient_id,
          patientName: appointment.patientName,
          appointment_date: appointment.appointment_date 
      });
      setIsPrescriptionModalOpen(true); // Set state to open the modal
  };

  // Handler to close the prescription modal
  const closePrescriptionModal = () => {
      setIsPrescriptionModalOpen(false);
      setSelectedAppointmentForPrescription(null); // Clear selected appointment info
  };

  // Handler to save prescription (Calls Backend)
  const handleSavePrescription = async (prescriptionData) => {
      console.log("Attempting to save prescription:", prescriptionData);
      if (!token) {
          // Throw error to be caught by the modal's save handler
          throw new Error("Authentication token not found. Please log in again."); 
      }
      try {
          // Call the backend endpoint defined in routes/medicalRecords.js
          const response = await axios.post(
              'http://localhost:5000/medical-records/prescription', 
              prescriptionData, // Send { patientId, appointmentId, diagnosis, medicationList }
              { 
                  headers: { Authorization: `Bearer ${token}` }
              }
          );

          console.log("Prescription saved successfully via backend:", response.data);
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
          // Re-throw the error so the modal can display it
          throw new Error(error.response?.data?.error || "Failed to save prescription. Please try again."); 
      }
  };

  // --- Availability Handlers (Remain the same) ---
  const handleBlockDay = async (e) => { /* ... */ };
  const handleUnblockDay = async (dateToUnblock) => { /* ... */ };
  const handleBlockSlot = async (e) => { /* ... */ };
  const handleUnblockSlot = async (dateTimeToUnblock) => { /* ... */ };
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
        {/* Loading State */}
        {isLoadingAppointments ? ( 
            <p className="mt-2 text-gray-500">Loading appointments...</p> 
        ) : appointments.length > 0 ? ( 
          <> {/* Fragment for list and button */}
            {/* List of Appointments (Max 4) */}
            <ul className="mt-2 space-y-4">
              {appointments.slice(0, 4).map((appointment) => (
                <li 
                  key={appointment.id} 
                  className="border p-4 rounded shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
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
                     <p className="text-sm text-gray-600"> 
                       Date: {dayjs(appointment.appointment_date).format("ddd, MMM D,<y_bin_46> - h:mm A")} 
                     </p>
                     <p className="text-sm text-gray-600"> 
                       Status: 
                       <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${ 
                         appointment.status === 'completed' ? 'bg-gray-200 text-gray-700' : 
                         appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                         appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                         'bg-red-100 text-red-800' // Default/Cancelled style
                       }`}>
                         {appointment.status}
                       </span>
                     </p>
                  </div>
                  {/* Add Prescription Button */}
                  <div className="flex-shrink-0 flex mt-2 sm:mt-0"> 
                    <button 
                      onClick={() => handleAddPrescriptionClick(appointment)} // Call the handler to open modal
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs font-medium disabled:opacity-50" 
                      title="Add Prescription"
                      disabled={appointment.status === 'completed'} // Disable if already completed
                    >
                      {appointment.status === 'completed' ? 'Prescribed' : 'Add Prescription'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {/* View All Appointments Link */}
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
          // No Appointments Message
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
      /> 
      
    </div>
  );
}

export default DoctorDashboard;

