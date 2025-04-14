import { useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";

const WORK_START_HOUR = 11;
const WORK_END_HOUR = 19;

function AppointmentSystem() {
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [bookedTimes, setBookedTimes] = useState([]);
  const [isSunday, setIsSunday] = useState(false); // State to track if Sunday is selected
  const [dateError, setDateError] = useState(""); // Error message for date selection

  const token = localStorage.getItem("token");

  // Generate time slots ONLY within working hours
  const timeSlots = Array.from({ length: WORK_END_HOUR - WORK_START_HOUR }, (_, i) => {
    const hour = WORK_START_HOUR + i;
    return `${hour.toString().padStart(2, "0")}:00`;
  });

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const res = await axios.get("http://localhost:5000/appointments", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAppointments(res.data);
      } catch (err) {
        console.error("Failed to fetch appointments", err);
      }
    };

    fetchAppointments();
  }, [token]);

  useEffect(() => {
    // Update bookedTimes whenever selectedDate or appointments change
    const filtered = appointments
      .filter((appt) => dayjs(appt.appointment_date).format("YYYY-MM-DD") === selectedDate)
      .map((appt) => dayjs(appt.appointment_date).format("HH:mm"));
    setBookedTimes(filtered);
  }, [selectedDate, appointments]);

  const handleDateChange = (e) => {
    const dateValue = e.target.value;
    setSelectedDate(dateValue);
    setSelectedTime(""); // Reset time when date changes
    setDateError("");    // Reset date error
    setIsSunday(false);  // Reset Sunday flag

    if (dateValue) {
      const dayOfWeek = dayjs(dateValue).day(); // Sunday is 0
      if (dayOfWeek === 0) {
        setIsSunday(true);
        setDateError("Clinic is closed on Sundays. Please select another date.");
      }
    }
  };

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime) {
      return alert("Please select both date and time!");
    }
    if (isSunday) { // Double check
      return alert("Cannot book on Sunday.");
    }

    const appointmentDateTime = dayjs(`${selectedDate} ${selectedTime}`).format('YYYY-MM-DD HH:mm:00');

    try {
      const res = await axios.post(
        "http://localhost:5000/appointments/book",
        { appointment_date: appointmentDateTime },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(res.data.message);
      setSelectedDate("");
      setSelectedTime("");

      // Refresh appointments after booking
      const updated = await axios.get("http://localhost:5000/appointments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAppointments(updated.data);
    } catch (err) {
      alert(err.response?.data?.error || "Booking failed!");
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold">Book an Appointment</h2>
      <p className="text-gray-600 mb-4">Clinic Hours: Monday - Saturday, 11:00 AM - 7:00 PM</p>

      <div className="mt-4 flex flex-col space-y-3 md:flex-row md:space-y-0 md:space-x-3 items-start">
        <div>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange} // Use the new handler
            className={`border p-2 ${dateError ? 'border-red-500' : ''}`}
            min={dayjs().format("YYYY-MM-DD")}
          />
          {dateError && <p className="text-red-500 text-xs mt-1">{dateError}</p>}
        </div>

        <select
          value={selectedTime}
          onChange={(e) => setSelectedTime(e.target.value)}
          className="border p-2"
          // Disable if no date selected OR if it's Sunday
          disabled={!selectedDate || isSunday}
        >
          <option value="">Select Time</option>
            {timeSlots.map((time) => {
                const isBooked = bookedTimes.includes(time); // Check if already booked
                // Add check here later if fetching blocked slots from backend
                const isDisabled = isBooked /* || isBlocked */; 
                
                return (
                <option
                    key={time}
                    value={time}
                    disabled={isDisabled} 
                >
                    {/* Display time in AM/PM format */}
                    {dayjs(`1970-01-01 ${time}`).format('h:mm A')} 
                    {isBooked ? " (Booked)" : ""}
                    {/* {isBlocked ? " (Unavailable)" : ""} */}
                </option>
                );
            })}
        </select>

        <button
          onClick={handleBooking}
          className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            // Disable if no date/time selected OR if it's Sunday
            disabled={!selectedDate || !selectedTime || isSunday}
        >
          Book
        </button>
      </div>

      <h3 className="mt-6 text-xl font-semibold">Your Appointments</h3>
      <ul className="mt-2">
        {appointments.map((appt) => (
          <li key={appt.id} className="border p-2 mt-2 rounded">
            {new Date(appt.appointment_date).toLocaleString()} - Status:{" "}
            <span className="font-semibold">{appt.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AppointmentSystem;
