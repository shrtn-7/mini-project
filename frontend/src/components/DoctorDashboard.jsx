import { useContext, useState, useEffect } from "react";
import { UserContext } from "../context/UserContext";
import axios from "axios";
import PatientDetailsModal from './PatientDetailsModal';

function DoctorDashboard() {
  const { user } = useContext(UserContext) || {};
  const [appointments, setAppointments] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [modalData, setModalData] = useState({ profile: null, records: [] });
  const [isLoadingModal, setIsLoadingModal] = useState(false);

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
