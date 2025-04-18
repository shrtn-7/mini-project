import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import dayjs from "dayjs";

const WORK_START_HOUR = 11;
const WORK_END_HOUR = 19;

function AppointmentSystem() {
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [bookedTimes, setBookedTimes] = useState([]);
  const [isSunday, setIsSunday] = useState(false);
  const [dateError, setDateError] = useState("");
  const [isLoading, setIsLoading] = useState(false); 
  const [isCancelling, setIsCancelling] = useState(null);

  const token = localStorage.getItem("token");

  const timeSlots = Array.from({ length: WORK_END_HOUR - WORK_START_HOUR }, (_, i) => {
    const hour = WORK_START_HOUR + i;
    return `${hour.toString().padStart(2, "0")}:00`;
  });

  const fetchAppointments = useCallback(async () => {
    if (!token) return;
    setIsLoading(true); 
    try {
      const res = await axios.get("http://localhost:5000/appointments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Sort appointments by date when fetching
      const sortedAppointments = res.data.sort((a, b) => 
        dayjs(a.appointment_date).valueOf() - dayjs(b.appointment_date).valueOf()
      );
      setAppointments(sortedAppointments);
    } catch (err) {
      console.error("Failed to fetch appointments", err);
    } finally {
      setIsLoading(false); 
    }
  }, [token]); 

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]); 

  useEffect(() => {
    const filtered = appointments
      .filter((appt) => dayjs(appt.appointment_date).format("YYYY-MM-DD") === selectedDate)
      .map((appt) => dayjs(appt.appointment_date).format("HH:mm"));
    setBookedTimes(filtered);
  }, [selectedDate, appointments]);

  const handleDateChange = (e) => {
    const dateValue = e.target.value;
    setSelectedDate(dateValue);
    setSelectedTime("");
    setDateError("");
    setIsSunday(false);

    if (dateValue) {
      const dayOfWeek = dayjs(dateValue).day();
      if (dayOfWeek === 0) {
        setIsSunday(true);
        setDateError("Clinic is closed on Sundays. Please select another date.");
      }
    }
  };

  // --- MODIFIED Booking Handler (Uses direct state update) ---
  const handleBooking = async () => {
    if (!selectedDate || !selectedTime || isLoading) {
      if (!isLoading) alert("Please select both date and time!");
      return;
    }
    if (isSunday) {
      alert("Cannot book on Sunday.");
      return;
    }

    const appointmentDateTime = dayjs(`${selectedDate} ${selectedTime}`).format('YYYY-MM-DD HH:mm:00');
    const formattedTime = dayjs(appointmentDateTime).format("h:mm A");
    const formattedDate = dayjs(appointmentDateTime).format("MMMM D, YYYY");

    const confirmBooking = window.confirm(`Confirm booking for ${formattedTime} on ${formattedDate}?`);

    if (confirmBooking) {
      setIsLoading(true); 
      try {
        // --- 1. Perform Booking POST ---
        // Now expect the new appointment object in the response data
        const postResponse = await axios.post( 
          "http://localhost:5000/appointments/book",
          { appointment_date: appointmentDateTime },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // --- 2. Direct State Update ---
        const newAppointment = postResponse.data.appointment; 
        if (newAppointment) {
           // Add the new appointment to the existing list and sort
           setAppointments(prevAppointments => 
               [...prevAppointments, newAppointment].sort((a, b) => 
                   dayjs(a.appointment_date).valueOf() - dayjs(b.appointment_date).valueOf()
               )
           );
        } else {
           // Fallback if backend didn't return the appointment - refetch (shouldn't happen ideally)
           console.warn("Backend did not return new appointment object, refetching list.");
           fetchAppointments(); 
        }

        // --- 3. Provide User Feedback ---
        alert(postResponse.data.message || `Appointment booked successfully!`); 

        // --- 4. Clear Inputs ---
        setSelectedDate("");
        setSelectedTime("");

      } catch (err) {
        console.error("Booking error occurred!", err);
        if (err.response) {
           console.error("Error response data:", err.response.data);
           alert(err.response.data.error || "Booking failed! Please try again.");
        } else {
           alert("Booking failed! An unknown error occurred.");
        }
      } finally {
        setIsLoading(false); 
      }
    } else {
      console.log("Booking cancelled by user.");
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    // Find the appointment details for the confirmation message
    const appointmentToCancel = appointments.find(appt => appt.id === appointmentId);
    if (!appointmentToCancel) return; // Should not happen

    const formattedTime = dayjs(appointmentToCancel.appointment_date).format("h:mm A");
    const formattedDate = dayjs(appointmentToCancel.appointment_date).format("MMMM D, YYYY");

    const confirmCancel = window.confirm(`Are you sure you want to cancel the appointment for ${formattedTime} on ${formattedDate}?`);

    if (confirmCancel) {
      setIsCancelling(appointmentId); // Set cancelling state for this specific appointment
      try {
        // Call the backend endpoint to delete the appointment
        await axios.delete(`http://localhost:5000/appointments/cancel/${appointmentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // --- Direct State Update on Success ---
        // Remove the cancelled appointment from the local state immediately
        setAppointments(prevAppointments => 
          prevAppointments.filter(appt => appt.id !== appointmentId)
        );

        alert("Appointment cancelled successfully!"); // Success feedback

      } catch (err) {
        console.error("Cancellation error occurred!", err);
         if (err.response) {
           console.error("Error response data:", err.response.data);
           alert(err.response.data.error || "Cancellation failed! Please try again.");
        } else {
           alert("Cancellation failed! An unknown error occurred.");
        }
        // Optionally refetch list on error to ensure consistency
        // fetchAppointments(); 
      } finally {
        setIsCancelling(null); // Reset cancelling state
      }
    } else {
      console.log("Cancellation cancelled by user.");
    }
  };

  // --- JSX Rendering (No changes needed from previous version) ---
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold">Book an Appointment</h2>
      <p className="text-gray-600 mb-4">Clinic Hours: Monday - Saturday, 11:00 AM - 7:00 PM</p>

      <div className="mt-4 flex flex-col space-y-3 md:flex-row md:space-y-0 md:space-x-3 items-start">
        {/* Date Input */}
        <div>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            className={`border p-2 ${dateError ? 'border-red-500' : ''}`}
            min={dayjs().format("YYYY-MM-DD")}
            disabled={isLoading} // Disable when loading
          />
          {dateError && <p className="text-red-500 text-xs mt-1">{dateError}</p>}
        </div>

        {/* Time Select */}
        <select
          value={selectedTime}
          onChange={(e) => setSelectedTime(e.target.value)}
          className="border p-2"
          disabled={!selectedDate || isSunday || isLoading} // Disable when loading
        >
          <option value="">Select Time</option>
            {timeSlots.map((time) => {
                const isBooked = bookedTimes.includes(time);
                const isDisabled = isBooked;
                return (
                <option key={time} value={time} disabled={isDisabled}>
                    {dayjs(`1970-01-01 ${time}`).format('h:mm A')}
                    {isBooked ? " (Booked)" : ""}
                </option>
                );
            })}
        </select>

        {/* Book Button */}
        <button
          onClick={handleBooking}
          className={`px-4 py-2 rounded text-white ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
          disabled={!selectedDate || !selectedTime || isSunday || isLoading} // Disable when loading
        >
          {isLoading ? 'Booking...' : 'Book'} {/* Show loading text */}
        </button>
      </div>

       {/* Appointments List Section */}
      <h3 className="mt-8 text-xl font-semibold border-t pt-4">Your Appointments</h3>
      {isLoading && appointments.length === 0 && <p className="mt-4 text-blue-600">Loading appointments...</p>}

      {!isLoading && appointments.length === 0 ? (
          <p className="mt-2 text-gray-500">No appointments scheduled yet.</p>
        ) : ( // Render list even if loading, it will just update
          <ul className="mt-2 space-y-3"> {/* Added space-y-3 */}
            {appointments.map((appt) => (
              // --- MODIFIED: List item with Cancel button ---
              <li 
                key={appt.id} 
                className="border p-3 rounded shadow-sm flex justify-between items-center bg-white" // Added padding, shadow, flex
              >
                {/* Appointment Details */}
                <div>
                  <span className="font-medium">
                    {dayjs(appt.appointment_date).format("YYYY-MM-DD h:mm A")}
                  </span>
                  <span className={`ml-3 text-sm px-2 py-0.5 rounded ${appt.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                     Status: {appt.status}
                  </span>
                </div>

                {/* Cancel Button */}
                <button
                  onClick={() => handleCancelAppointment(appt.id)}
                  // Disable button if this specific appointment is being cancelled
                  disabled={isCancelling === appt.id} 
                  className={`ml-4 px-3 py-1 rounded text-sm text-white transition-colors ${
                    isCancelling === appt.id 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-red-500 hover:bg-red-600' 
                  }`}
                >
                  {/* Show different text while cancelling */}
                  {isCancelling === appt.id ? 'Cancelling...' : 'Cancel'}
                </button>
              </li>
              // --- End MODIFIED ---
            ))}
          </ul>
        )
      }
    </div>
  );
}

export default AppointmentSystem;