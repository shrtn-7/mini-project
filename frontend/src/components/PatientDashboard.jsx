import { useContext, useEffect, useState } from "react";
import { UserContext } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function PatientDashboard() {
  const { user } = useContext(UserContext) || {};
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [newFiles, setNewFiles] = useState([]);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const res = await axios.get("http://localhost:5000/appointments", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAppointments(res.data);
      } catch (err) {
        console.error("Error fetching appointments", err);
      }
    };

    if (token) {
      fetchAppointments();
    }
  }, [token]);

  const handleBookAppointment = () => {
    navigate("/book-appointment");
  };

  const handleCancelAppointment = async (id) => {
    try {
      const confirmCancel = window.confirm("Are you sure you want to cancel this appointment?");
      if (!confirmCancel) return;

      await axios.delete(`http://localhost:5000/appointments/cancel/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setAppointments((prev) => prev.filter((appt) => appt.id !== id));
    } catch (err) {
      console.error("Error cancelling appointment", err);
    }
  };

  const handleFileUpload = (e) => {
    const files = e.target.files;
    const uploaded = Array.from(files).map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));
    setMedicalRecords((prev) => [...prev, ...uploaded]);
    setNewFiles([]);
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold">Welcome, {user?.name || "Guest"}</h2>
      <p className="mt-2">Manage your appointments and medical records here.</p>

      {/* Booking Appointments */}
      <div className="mt-4">
        <h3 className="text-xl font-bold">Book an Appointment</h3>
        <button
          onClick={handleBookAppointment}
          className="bg-blue-600 text-white px-4 py-2 rounded mt-2"
        >
          Book Appointment
        </button>

        {/* Upcoming Appointments */}
        <h3 className="text-xl font-bold mt-6">Upcoming Appointments</h3>
        <ul className="mt-2 space-y-2">
          {appointments.length > 0 ? (
            appointments.map((appointment) => (
              <li
                key={appointment.id}
                className="flex justify-between items-center border p-2 rounded shadow"
              >
                <div>
                  {new Date(appointment.appointment_date).toLocaleString()} -{" "}
                  <span className="font-semibold">{appointment.status}</span>
                </div>
                <button
                  onClick={() => handleCancelAppointment(appointment.id)}
                  className="bg-red-600 text-white px-3 py-1 rounded"
                >
                  Cancel
                </button>
              </li>
            ))
          ) : (
            <li>No appointments yet.</li>
          )}
        </ul>
      </div>

      {/* Medical Records */}
      <div className="mt-8">
        <h3 className="text-xl font-bold">Medical Records</h3>
        <input
          type="file"
          multiple
          onChange={handleFileUpload}
          className="mt-4 border p-2 w-full"
        />
        <ul className="mt-4 space-y-2">
          {medicalRecords.map((record, index) => (
            <li key={index} className="border p-2 rounded">
              <a href={record.url} target="_blank" rel="noopener noreferrer">
                {record.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default PatientDashboard;
