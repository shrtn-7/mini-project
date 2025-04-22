import React, { useContext, useEffect, useState } from "react";
import { UserContext } from "../context/UserContext"; // For user context
import { useNavigate } from "react-router-dom"; // For navigation
import axios from "axios"; // For API calls
import dayjs from "dayjs"; // For date formatting

function PatientDashboard() {
  // Get user info from context
  const { user } = useContext(UserContext) || {};
  // Hook for navigation
  const navigate = useNavigate();

  // State for upcoming appointments
  const [appointments, setAppointments] = useState([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);

  // State for detailed medical records
  const [detailedRecords, setDetailedRecords] = useState([]); 
  const [isLoadingRecords, setIsLoadingRecords] = useState(false); 
  const [recordsError, setRecordsError] = useState(''); // State for record fetching errors

  // Get auth token
  const token = localStorage.getItem("token");

  // Effect to fetch data when component mounts or token changes
  useEffect(() => {
    // Function to fetch upcoming appointments
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

    // Function to fetch detailed medical records
    const fetchDetailedRecords = async () => {
      if (!token) return;
      setIsLoadingRecords(true);
      setRecordsError(''); 
      try {
        const res = await axios.get("http://localhost:5000/patient/detailed-records", { 
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log("Fetched Detailed Records Data:", res.data); // *** DEBUG LOG ***
        // Ensure the response is an array before setting state
        if (Array.isArray(res.data)) {
            setDetailedRecords(res.data); 
        } else {
            console.error("Received non-array data for detailed records:", res.data);
            setDetailedRecords([]); // Set to empty array if data is invalid
            setRecordsError("Received invalid data format for medical records.");
        }
      } catch (err) {
        console.error("Error fetching detailed medical records", err);
        setRecordsError("Could not load medical records history."); 
      } finally {
        setIsLoadingRecords(false);
      }
    };

    if (token) {
      fetchAppointments();
      fetchDetailedRecords(); 
    }
  }, [token]); 

  // Handler to navigate to appointment booking page
  const handleBookAppointment = () => {
    navigate("/book-appointment");
  };

  // Handler to navigate to the record upload page
  const handleGoToUpload = () => {
    navigate("/upload-record"); 
  };

  // Handler to cancel an appointment
  const handleCancelAppointment = async (id) => {
    const appointmentToCancel = appointments.find(appt => appt.id === id);
    if (!appointmentToCancel) return;
    const formattedTime = dayjs(appointmentToCancel.appointment_date).format("h:mm A");
    const formattedDate = dayjs(appointmentToCancel.appointment_date).format("MMMM D, YYYY");
    const confirmCancel = window.confirm(`Are you sure you want to cancel the appointment for ${formattedTime} on ${formattedDate}?`);
    if (!confirmCancel) return;

    try {
      await axios.delete(`http://localhost:5000/appointments/cancel/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAppointments((prev) => prev.filter((appt) => appt.id !== id));
      alert("Appointment cancelled successfully!"); 
    } catch (err) {
      console.error("Error cancelling appointment", err);
      alert(err.response?.data?.error || "Failed to cancel appointment."); 
    }
  };

  // --- JSX Rendering ---
  return (
    <div className="p-4 md:p-6 space-y-8"> 
      {/* Welcome Message */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Welcome, {user?.name || "Patient"}!</h2>
        <p className="mt-1 text-gray-600">Manage your appointments and medical records here.</p>
      </div>

      {/* Appointments Section */}
      <section className="bg-white p-4 sm:p-6 rounded-lg shadow-md border border-gray-200">
        {/* ... (Appointments list remains the same) ... */}
         <h3 className="text-xl font-semibold mb-4 text-gray-700">Appointments</h3>
        <button
          onClick={handleBookAppointment}
          className="mb-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Book New Appointment
        </button>
        <h4 className="text-lg font-medium mb-3 text-gray-600">Upcoming</h4>
        {isLoadingAppointments ? (
            <p className="text-gray-500">Loading appointments...</p>
        ) : appointments.length > 0 ? (
          <ul className="space-y-3">
            {appointments.map((appointment) => (
              <li
                key={appointment.id}
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center border p-3 rounded shadow-sm bg-gray-50"
              >
                <div className="mb-2 sm:mb-0">
                  <span className="font-medium text-gray-800">
                    {dayjs(appointment.appointment_date).format("ddd, MMM D, YYYY - h:mm A")}
                  </span>
                  <span className={`ml-3 text-xs font-semibold px-2 py-0.5 rounded-full ${
                      appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                      'bg-yellow-100 text-yellow-800' 
                    }`}
                  >
                    {appointment.status}
                  </span>
                </div>
                <button
                  onClick={() => handleCancelAppointment(appointment.id)}
                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors text-sm font-medium flex-shrink-0"
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 italic">No upcoming appointments scheduled.</p>
        )}
      </section>

      {/* Medical Records Section */}
      <section className="bg-white p-4 sm:p-6 rounded-lg shadow-md border border-gray-200">
        <h3 className="text-xl font-semibold mb-4 text-gray-700">Medical Records</h3>
        {/* Button to upload new record */}
        <button
          onClick={handleGoToUpload}
          className="mb-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors text-sm font-medium"
        >
          Upload New Record / Files
        </button>

        {/* Records History List */}
        <h4 className="text-lg font-medium mb-3 text-gray-600">History</h4>
        {isLoadingRecords ? (
          <p className="text-gray-500">Loading records history...</p>
        ) : recordsError ? (
           <p className="text-red-600 bg-red-100 p-3 rounded">{recordsError}</p>
        ) : detailedRecords.length > 0 ? (
          <ul className="space-y-4">
            {detailedRecords.map((record) => (
              <li key={record.id} className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                {/* Record Metadata */}
                <p className="text-xs text-gray-500 mb-2">Recorded on: {dayjs(record.created_at).format('YYYY-MM-DD HH:mm')}</p>
                {/* Record Details */}
                <div className="space-y-2">
                  <div>
                    <strong className="block text-sm text-gray-800">Problem / Reason:</strong>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{record.problem || 'N/A'}</p>
                  </div>
                  <div>
                    <strong className="block text-sm text-gray-800">Previous Medications:</strong>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{record.previous_medications || 'N/A'}</p>
                  </div>
                  <div>
                    <strong className="block text-sm text-gray-800">Medical History:</strong>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{record.medical_history || 'N/A'}</p>
                  </div>
                </div>
                
                {/* --- CORRECTED Files Section --- */}
                <div className="mt-3 space-y-2">
                  {/* Display Prescription Links */}
                  {/* Check if prescriptions array exists */}
                  {Array.isArray(record.prescriptions) && ( 
                    <div>
                      <strong className="text-sm font-medium text-gray-800">Uploaded Prescriptions:</strong>
                      {/* Check if array has items */}
                      {record.prescriptions.length > 0 ? (
                        <ul className="list-disc list-inside ml-4 mt-1">
                          {record.prescriptions.map((url, index) => (
                            // Ensure 'url' is a non-empty string before rendering link
                            url && typeof url === 'string' ? (
                              <li key={`rec-${record.id}-presc-${index}`} className="text-sm">
                                <a 
                                  href={`http://localhost:5000${url}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-blue-600 hover:underline hover:text-blue-800"
                                  title={`View Prescription PDF ${index + 1}`} 
                                >
                                  {url.substring(url.lastIndexOf('/') + 1) || `Prescription Document ${index + 1}`}
                                </a>
                              </li>
                            ) : null // Don't render if url is invalid
                          ))}
                        </ul>
                      ) : (
                        // Show message if array is empty
                        <p className="text-sm text-gray-500 italic ml-4">None uploaded.</p> 
                      )}
                    </div>
                  )}

                  {/* Display Lab Report Links */}
                   {/* Check if lab_reports array exists */}
                  {Array.isArray(record.lab_reports) && ( 
                    <div>
                      <strong className="text-sm font-medium text-gray-800">Uploaded Lab Reports:</strong>
                       {/* Check if array has items */}
                      {record.lab_reports.length > 0 ? (
                        <ul className="list-disc list-inside ml-4 mt-1">
                          {record.lab_reports.map((url, index) => (
                            // Ensure 'url' is a non-empty string
                            url && typeof url === 'string' ? (
                              <li key={`rec-${record.id}-lab-${index}`} className="text-sm">
                                <a 
                                  href={`http://localhost:5000${url}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-blue-600 hover:underline hover:text-blue-800"
                                  title={`View Lab Report PDF ${index + 1}`} 
                                >
                                  {url.substring(url.lastIndexOf('/') + 1) || `Lab Report Document ${index + 1}`}
                                </a>
                              </li>
                            ) : null // Don't render if url is invalid
                          ))}
                        </ul>
                      ) : (
                         // Show message if array is empty
                        <p className="text-sm text-gray-500 italic ml-4">None uploaded.</p>
                      )}
                    </div>
                  )}
                </div> 
                {/* --- End Files Section --- */}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 italic">No detailed medical records have been uploaded yet.</p>
        )}
      </section>
      
    </div>
  );
}

export default PatientDashboard;
