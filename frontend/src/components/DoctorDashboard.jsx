import { useState, useEffect } from "react";
import axios from "axios";

function DoctorDashboard({ user }) {
  const [appointments, setAppointments] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);

  const token = localStorage.getItem("token");

  useEffect(() => {
    // Fetch appointments and medical records for the doctor
    const fetchAppointments = async () => {
      try {
        const res = await axios.get("http://localhost:5000/appointments/doctor", {
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
                  <p><strong>Patient:</strong> {appointment.patientName}</p>
                  <p><strong>Date:</strong> {new Date(appointment.appointment_date).toLocaleString()}</p>
                  <p><strong>Status:</strong> {appointment.status}</p>
                </div>
                <div>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded">Confirm</button>
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
      <div className="mt-8">
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
      </div>
    </div>
  );
}

export default DoctorDashboard;
