import { useContext, useState, useEffect } from "react";
import { UserContext } from "../context/UserContext";
import axios from "axios";
import PatientDetailsModal from './PatientDetailsModal';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(isBetween);
dayjs.extend(customParseFormat);
// Define working hours (can share from a config file later)
const WORK_START_HOUR = 11;
const WORK_END_HOUR = 19;   // Exclusive end hour (up to 18:xx)

function DoctorDashboard() {
  const { user } = useContext(UserContext) || {};
  const [appointments, setAppointments] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [modalData, setModalData] = useState({ profile: null, records: [] });
  const [isLoadingModal, setIsLoadingModal] = useState(false);

  // --- Availability State ---
  const [blockedDays, setBlockedDays] = useState([]); // Stores dates 'YYYY-MM-DD'
  const [blockedSlots, setBlockedSlots] = useState([]); // Stores datetimes 'YYYY-MM-DD HH:MM:SS'
  const [blockDayDate, setBlockDayDate] = useState('');
  const [blockSlotDate, setBlockSlotDate] = useState('');
  const [blockSlotTime, setBlockSlotTime] = useState('');
  const [availabilityError, setAvailabilityError] = useState('');
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  // --- End Availability State ---

  const token = localStorage.getItem("token");

  useEffect(() => {
    // Fetch appointments and medical records for the doctor
    const fetchAppointments = async () => {
      try {
        const res = await axios.get("http://localhost:5000/appointments", { // Use the correct endpoint
          headers: { Authorization: `Bearer ${token}` },
        });
        setAppointments(res.data);
      } catch (err) {
        console.error("Error fetching appointments", err);
      }
    };

    const fetchMedicalRecords = async () => {
      try {
        const res = await axios.get("http://localhost:5000/medical-records", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMedicalRecords(res.data);
      } catch (err) {
        console.error("Error fetching medical records", err);
      }
    };

    if (token) {
      fetchAppointments();
      fetchMedicalRecords();
    }
  }, [token]);

  // Fetch Blocked Days and Slots on Mount
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!token) return;
      setAvailabilityLoading(true);
      setAvailabilityError('');
      try {
        const [daysRes, slotsRes] = await Promise.all([
          axios.get("http://localhost:5000/availability/blocked/days", { headers: { Authorization: `Bearer ${token}` } }),
          axios.get("http://localhost:5000/availability/blocked/slots", { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setBlockedDays(daysRes.data.map(d => d.block_date)); // Store just the dates
        setBlockedSlots(slotsRes.data.map(s => s.slot_datetime)); // Store datetimes
      } catch (err) {
        console.error("Error fetching availability", err);
        setAvailabilityError("Failed to load availability data.");
      } finally {
        setAvailabilityLoading(false);
      }
    };
    fetchAvailability();
  }, [token]);

  // Function to handle clicking on a patient/appointment
  const handleViewPatientDetails = async (patientId) => {
    if (!patientId) return;

    setSelectedPatientId(patientId);
    setIsModalOpen(true);
    setIsLoadingModal(true);
    setModalData({ profile: null, records: [] }); // Clear previous data

    try {
      // Fetch patient profile and medical records concurrently
      const [profileRes, recordsRes] = await Promise.all([
        axios.get(`http://localhost:5000/users/${patientId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`http://localhost:5000/medical-records/${patientId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setModalData({ profile: profileRes.data, records: recordsRes.data });

    } catch (err) {
      console.error("Error fetching patient details or records:", err);
      // Optionally set some error state to display in the modal
      setModalData({ profile: null, records: [] }); // Clear data on error
    } finally {
      setIsLoadingModal(false);
    }
  };

  // Function to close the modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPatientId(null);
    // Optionally clear modalData here if needed
  };

  // --- NEW Availability Handlers ---
  const handleBlockDay = async (e) => {
    e.preventDefault();
    if (!blockDayDate) {
      setAvailabilityError("Please select a date to block.");
      return;
    }
    if (dayjs(blockDayDate).day() === 0) {
      setAvailabilityError("Cannot block Sunday (already implicitly unavailable).");
      return;
    }
    if (blockedDays.includes(blockDayDate)) {
      setAvailabilityError("This day is already blocked.");
      return;
    }

    setAvailabilityLoading(true); setAvailabilityError('');
    try {
      const res = await axios.post("http://localhost:5000/availability/block/day",
        { block_date: blockDayDate }, { headers: { Authorization: `Bearer ${token}` } });
      setBlockedDays([...blockedDays, res.data.block_date].sort());
      setBlockDayDate(''); // Clear input
    } catch (err) {
      setAvailabilityError(err.response?.data?.error || "Failed to block day.");
    } finally { setAvailabilityLoading(false); }
  };

  const handleUnblockDay = async (dateToUnblock) => {
    const confirmUnblock = window.confirm(`Are you sure you want to make ${dateToUnblock} available again?`);
    if (!confirmUnblock) return;

    setAvailabilityLoading(true); setAvailabilityError('');
    try {
      await axios.delete("http://localhost:5000/availability/unblock/day",
        { headers: { Authorization: `Bearer ${token}` }, data: { block_date: dateToUnblock } });
      setBlockedDays(blockedDays.filter(d => d !== dateToUnblock));
    } catch (err) {
      setAvailabilityError(err.response?.data?.error || "Failed to unblock day.");
    } finally { setAvailabilityLoading(false); }
  };

  const handleBlockSlot = async (e) => {
    e.preventDefault();
    if (!blockSlotDate || !blockSlotTime) {
      setAvailabilityError("Please select both date and time for the slot.");
      return;
    }
    const dateTimeToBlock = dayjs(`${blockSlotDate} ${blockSlotTime}`);
    if (!dateTimeToBlock.isValid()) {
      setAvailabilityError("Invalid date or time selected.");
      return;
    }
    // Frontend checks mirroring backend logic for faster feedback
    if (dateTimeToBlock.day() === 0) {
      setAvailabilityError("Cannot block slots on Sunday.");
      return;
    }
    if (dateTimeToBlock.hour() < WORK_START_HOUR || dateTimeToBlock.hour() >= WORK_END_HOUR) {
      setAvailabilityError(`Cannot block slots outside working hours (${WORK_START_HOUR}:00 - ${WORK_END_HOUR}:00).`);
      return;
    }
    const formattedDateTime = dateTimeToBlock.format('YYYY-MM-DD HH:mm:00'); // Match backend storage format
    if (blockedSlots.includes(formattedDateTime)) {
      setAvailabilityError("This specific time slot is already blocked.");
      return;
    }
    // Check if the entire day is already blocked
    if (blockedDays.includes(dateTimeToBlock.format('YYYY-MM-DD'))) {
      setAvailabilityError("Cannot block a slot on a day that is already fully blocked.");
      return;
    }


    setAvailabilityLoading(true); setAvailabilityError('');
    try {
      const res = await axios.post("http://localhost:5000/availability/block/slot",
        { slot_datetime: formattedDateTime }, { headers: { Authorization: `Bearer ${token}` } });
      setBlockedSlots([...blockedSlots, res.data.slot_datetime].sort());
      setBlockSlotDate(''); setBlockSlotTime(''); // Clear inputs
    } catch (err) {
      setAvailabilityError(err.response?.data?.error || "Failed to block slot.");
    } finally { setAvailabilityLoading(false); }
  };

  const handleUnblockSlot = async (dateTimeToUnblock) => {
    const formattedDateTime = dayjs(dateTimeToUnblock).format('YYYY-MM-DD HH:mm:00'); // Use consistent format
    const confirmUnblock = window.confirm(`Are you sure you want to unblock the slot: ${dayjs(formattedDateTime).format('YYYY-MM-DD h:mm A')}?`);
    if (!confirmUnblock) return;

    setAvailabilityLoading(true); setAvailabilityError('');
    try {
      await axios.delete("http://localhost:5000/availability/unblock/slot",
        { headers: { Authorization: `Bearer ${token}` }, data: { slot_datetime: formattedDateTime } });
      setBlockedSlots(blockedSlots.filter(dt => dt !== formattedDateTime));
    } catch (err) {
      setAvailabilityError(err.response?.data?.error || "Failed to unblock slot.");
    } finally { setAvailabilityLoading(false); }
  };

  // Generate time options ONLY within working hours (11 AM to 6 PM slots)
  const timeOptionsForBlocking = Array.from({ length: WORK_END_HOUR - WORK_START_HOUR }, (_, i) => {
    const hour = WORK_START_HOUR + i;
    return `${hour.toString().padStart(2, "0")}:00`;
  });

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold">Welcome, Dr. {user?.name || "Guest"}</h2>
      <p className="mt-2">Manage your daily schedule and patient records.</p>

      {/* Appointments Section */}
      <div className="mt-6">
        <h3 className="text-xl font-bold">Appointments</h3>
        {appointments.length > 0 ? (
          <ul className="mt-2 space-y-4">
            {appointments.map((appointment) => (
              <li
                key={appointment.id}
                className="border p-4 rounded shadow-lg flex justify-between items-center"
              >
                <div>
                  {/* Make Patient Name clickable */}
                  <p><strong>Patient:</strong>
                    <button
                      onClick={() => handleViewPatientDetails(appointment.patient_id)}
                      className="text-blue-600 hover:underline ml-2 font-semibold"
                    >
                      {appointment.patientName}
                    </button>
                    {/* ({appointment.patient_id})  */}
                    {/* Show ID for clarity */}
                  </p>
                  <p><strong>Date:</strong> {new Date(appointment.appointment_date).toLocaleString()}</p>
                  <p><strong>Status:</strong> {appointment.status}</p>
                </div>
                <div>
                  {/* Keep Confirm/Cancel buttons if needed */}
                  <button className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50" disabled={appointment.status === 'confirmed'}>Confirm</button>
                  <button className="bg-red-600 text-white px-4 py-2 rounded ml-2">Cancel</button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No appointments yet.</p>
        )}
      </div>

      {/* Medical Records Section */}
      {/* <div className="mt-8">
        <h3 className="text-xl font-bold">Medical Records</h3>
        {medicalRecords.length > 0 ? (
          <ul className="mt-2 space-y-4">
            {medicalRecords.map((record, index) => (
              <li key={index} className="border p-4 rounded shadow-lg">
                <div>
                  <p><strong>Patient:</strong> {record.patientName}</p>
                  <p><strong>Uploaded:</strong> {new Date(record.uploadedAt).toLocaleDateString()}</p>
                  <a
                    href={record.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600"
                  >
                    View Record
                  </a>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No medical records available.</p>
        )}
      </div> */}
      {/* Medical Records Section - Keep it maybe for adding records later? */}
      {/* Or remove if records are only viewed via modal */}
      {/* <div className="mt-8">
         <h3 className="text-xl font-bold">Medical Records</h3>
         <p>Select a patient from the appointments list to view their records.</p>
      </div>  */}

      {/* --- Revised Availability Section --- */}
      <div className="mt-8 border-t pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Column 1: Block Full Days */}
        <section>
          <h3 className="text-xl font-bold mb-4">Manage Full Day Unavailability</h3>
          <form onSubmit={handleBlockDay} className="flex items-center gap-3 border p-4 rounded mb-4">
            <input
              type="date"
              value={blockDayDate}
              onChange={(e) => setBlockDayDate(e.target.value)}
              min={dayjs().format("YYYY-MM-DD")}
              required
              className="border p-2 rounded"
            />
            <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded disabled:opacity-50" disabled={availabilityLoading}>Block Day</button>
          </form>

          <h4 className="text-lg font-semibold mb-2">Blocked Days:</h4>
          {availabilityLoading && blockedDays.length === 0 ? <p>Loading...</p> : null}
          {!availabilityLoading && blockedDays.length === 0 ? <p className="text-gray-500 italic">No full days blocked.</p> : null}
          {blockedDays.length > 0 && (
            <ul className="space-y-2 max-h-48 overflow-y-auto border rounded p-3">
              {blockedDays.map((date) => (
                <li key={date} className="flex justify-between items-center p-2 bg-red-100 rounded">
                  <span>{dayjs(date).format('ddd, MMM D, YYYY')}</span>
                  <button onClick={() => handleUnblockDay(date)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50" disabled={availabilityLoading}>Make Available</button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Column 2: Block Specific Slots */}
        <section>
          <h3 className="text-xl font-bold mb-4">Manage Specific Slot Unavailability</h3>
          <form onSubmit={handleBlockSlot} className="flex flex-col sm:flex-row items-center gap-3 border p-4 rounded mb-4">
            <input
              type="date"
              value={blockSlotDate}
              onChange={(e) => setBlockSlotDate(e.target.value)}
              min={dayjs().format("YYYY-MM-DD")}
              required
              className="border p-2 rounded"
            />
            <select
              value={blockSlotTime}
              onChange={(e) => setBlockSlotTime(e.target.value)}
              required
              className="border p-2 rounded"
            >
              <option value="">Select Time</option>
              {timeOptionsForBlocking.map(time => (
                <option key={time} value={time}>{dayjs(`1970-01-01 ${time}`).format('h:mm A')}</option>
              ))}
            </select>
            <button type="submit" className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded disabled:opacity-50" disabled={availabilityLoading}>Block Slot</button>
          </form>

          <h4 className="text-lg font-semibold mb-2">Blocked Slots:</h4>
          {availabilityLoading && blockedSlots.length === 0 ? <p>Loading...</p> : null}
          {!availabilityLoading && blockedSlots.length === 0 ? <p className="text-gray-500 italic">No specific time slots blocked.</p> : null}
          {blockedSlots.length > 0 && (
            <ul className="space-y-2 max-h-48 overflow-y-auto border rounded p-3">
              {blockedSlots.map((datetime) => (
                <li key={datetime} className="flex justify-between items-center p-2 bg-yellow-100 rounded">
                  <span>{dayjs(datetime).format('ddd, MMM D - h:mm A')}</span>
                  <button onClick={() => handleUnblockSlot(datetime)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50" disabled={availabilityLoading}>Unblock Slot</button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Common Error Display */}
        {availabilityError && <p className="text-red-600 text-center font-medium mt-4 col-span-1 md:col-span-2">{availabilityError}</p>}

      </div>
      {/* --- End Availability Section --- */}

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

export default DoctorDashboard;
