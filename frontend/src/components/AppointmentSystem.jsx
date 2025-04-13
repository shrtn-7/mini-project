import { useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";

function AppointmentSystem() {
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [bookedTimes, setBookedTimes] = useState([]);

  const token = localStorage.getItem("token");

  // Available time slots from 9:00 to 17:00
  const timeSlots = Array.from({ length: 9 }, (_, i) => {
    const hour = 9 + i;
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

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime) {
      return alert("Please select both date and time!");
    }

    const appointmentDateTime = `${selectedDate} ${selectedTime}`;

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

      <div className="mt-4 flex flex-col space-y-3 md:flex-row md:space-y-0 md:space-x-3">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border p-2"
          min={dayjs().format("YYYY-MM-DD")}
        />

        <select
          value={selectedTime}
          onChange={(e) => setSelectedTime(e.target.value)}
          className="border p-2"
          disabled={!selectedDate}
        >
          <option value="">Select Time</option>
          {timeSlots.map((time) => (
            <option
              key={time}
              value={time}
              disabled={bookedTimes.includes(time)}
            >
              {time} {bookedTimes.includes(time) ? "(Booked)" : ""}
            </option>
          ))}
        </select>

        <button
          onClick={handleBooking}
          className="bg-green-600 text-white px-4 py-2 rounded"
          disabled={!selectedDate || !selectedTime}
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
