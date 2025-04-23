import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { UserContext } from '../context/UserContext'; // To get current user info

// Define working hours boundaries (these could eventually be fetched/set)
const DEFAULT_WORK_START_HOUR = 11;
const DEFAULT_WORK_END_HOUR = 19;

function DoctorSettings() {
  const { user } = useContext(UserContext) || {}; // Get logged-in user info

  
  // --- Schedule Settings State ---
  const [startTime, setStartTime] = useState('11:00'); // Default value
  const [endTime, setEndTime] = useState('19:00');   // Default value

  // --- Availability Blocking State (Moved from DoctorDashboard) ---
  const [blockedDays, setBlockedDays] = useState([]); 
  const [blockedSlots, setBlockedSlots] = useState([]); 
  const [blockDayDate, setBlockDayDate] = useState('');
  const [blockSlotDate, setBlockSlotDate] = useState('');
  const [blockSlotTime, setBlockSlotTime] = useState('');
  const [availabilityError, setAvailabilityError] = useState('');
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  // --- End Availability Blocking State ---

  const token = localStorage.getItem("token");

  // Fetch current schedule settings and availability on load
  useEffect(() => {
    const fetchSettings = async () => {
      if (!token) return;
      // Fetch Availability Blocks (existing endpoint)
      setAvailabilityLoading(true);
      setAvailabilityError('');
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

    fetchSettings();
  }, [token]); // Fetch when component mounts or token changes


  // --- Handlers ---

  // --- Availability Blocking Handlers (Functional - Use existing backend) ---
  const handleBlockDay = async (e) => { 
     e.preventDefault();
     if (!blockDayDate) { setAvailabilityError("Please select a date to block."); return; }
     if (dayjs(blockDayDate).day() === 0) { setAvailabilityError("Cannot block Sunday."); return; }
     if (blockedDays.includes(blockDayDate)) { setAvailabilityError("This day is already blocked."); return; }
     setAvailabilityLoading(true); setAvailabilityError('');
     try {
       const res = await axios.post("http://localhost:5000/availability/block/day",{ block_date: blockDayDate }, { headers: { Authorization: `Bearer ${token}` } });
       setBlockedDays(prev => [...prev, res.data.block_date].sort());
       setBlockDayDate(''); 
     } catch (err) { setAvailabilityError(err.response?.data?.error || "Failed to block day."); } 
     finally { setAvailabilityLoading(false); }
  };
  const handleUnblockDay = async (dateToUnblock) => { 
     const confirmUnblock = window.confirm(`Are you sure you want to make ${dateToUnblock} available again?`);
     if (!confirmUnblock) return;
     setAvailabilityLoading(true); setAvailabilityError('');
     try {
       await axios.delete("http://localhost:5000/availability/unblock/day",{ headers: { Authorization: `Bearer ${token}` }, data: { block_date: dateToUnblock } });
       setBlockedDays(prev => prev.filter(d => d !== dateToUnblock));
     } catch (err) { setAvailabilityError(err.response?.data?.error || "Failed to unblock day."); } 
     finally { setAvailabilityLoading(false); }
  };
  const handleBlockSlot = async (e) => { 
      e.preventDefault();
     if (!blockSlotDate || !blockSlotTime) { setAvailabilityError("Please select both date and time."); return; }
     const dateTimeToBlock = dayjs(`${blockSlotDate} ${blockSlotTime}`);
     if (!dateTimeToBlock.isValid()) { setAvailabilityError("Invalid date or time selected."); return; }
     if (dateTimeToBlock.day() === 0) { setAvailabilityError("Cannot block slots on Sunday."); return; }
     // Use fetched/set schedule settings for validation
     const currentStartTime = startTime ? parseInt(startTime.split(':')[0]) : DEFAULT_WORK_START_HOUR;
     const currentEndTime = endTime ? parseInt(endTime.split(':')[0]) : DEFAULT_WORK_END_HOUR;
     if (dateTimeToBlock.hour() < currentStartTime || dateTimeToBlock.hour() >= currentEndTime) { 
         setAvailabilityError(`Cannot block slots outside configured working hours (${dayjs('1970-01-01 '+startTime).format('h:mm A')} - ${dayjs('1970-01-01 '+endTime).format('h:mm A')}).`); 
         return; 
     }
     const formattedDateTime = dateTimeToBlock.format('YYYY-MM-DD HH:mm:00'); 
     if (blockedSlots.includes(formattedDateTime)) { setAvailabilityError("This specific time slot is already blocked."); return; }
     if (blockedDays.includes(dateTimeToBlock.format('YYYY-MM-DD'))) { setAvailabilityError("Cannot block a slot on a day that is already fully blocked."); return; }
     setAvailabilityLoading(true); setAvailabilityError('');
     try {
       const res = await axios.post("http://localhost:5000/availability/block/slot",{ slot_datetime: formattedDateTime }, { headers: { Authorization: `Bearer ${token}` } });
       setBlockedSlots(prev => [...prev, res.data.slot_datetime].sort());
       setBlockSlotDate(''); setBlockSlotTime(''); 
     } catch (err) { setAvailabilityError(err.response?.data?.error || "Failed to block slot."); } 
     finally { setAvailabilityLoading(false); }
  };
  const handleUnblockSlot = async (dateTimeToUnblock) => { 
     const formattedDateTime = dayjs(dateTimeToUnblock).format('YYYY-MM-DD HH:mm:00'); 
     const confirmUnblock = window.confirm(`Are you sure you want to unblock the slot: ${dayjs(formattedDateTime).format('YYYY-MM-DD h:mm A')}?`);
     if (!confirmUnblock) return;
     setAvailabilityLoading(true); setAvailabilityError('');
     try {
       await axios.delete("http://localhost:5000/availability/unblock/slot",{ headers: { Authorization: `Bearer ${token}` }, data: { slot_datetime: formattedDateTime } });
       setBlockedSlots(prev => prev.filter(dt => dt !== formattedDateTime));
     } catch (err) { setAvailabilityError(err.response?.data?.error || "Failed to unblock slot."); } 
     finally { setAvailabilityLoading(false); }
  };
  // Generate time options based on fetched/set schedule settings
  const timeOptionsForBlocking = Array.from({ length: (endTime ? parseInt(endTime.split(':')[0]) : DEFAULT_WORK_END_HOUR) - (startTime ? parseInt(startTime.split(':')[0]) : DEFAULT_WORK_START_HOUR) }, (_, i) => { 
      const hour = (startTime ? parseInt(startTime.split(':')[0]) : DEFAULT_WORK_START_HOUR) + i; 
      return `${hour.toString().padStart(2, "0")}:00`; 
  });
  // --- End Availability Blocking Handlers ---


  return (
    // Constrain width and center the settings page content
    <div className="p-4 space-y-8 max-w-4xl mx-auto"> 
      <h2 className="text-3xl font-bold text-gray-800 border-b pb-2">Settings</h2>

      {/* --- Change Profile Section --- */}
      <section className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        
        {/* Availability Blocking Section (Moved from Dashboard - Functional) */}
        <div className="mt-6 space-y-6">
            <h4 className="text-lg font-medium text-gray-900">Manage Specific Unavailability</h4>
            {availabilityError && <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{availabilityError}</p>}
            
            {/* Block Full Day Form & List */}
            <div className="border p-4 rounded-md bg-gray-50">
                 <h5 className="font-medium text-gray-700 mb-2">Block Full Day</h5>
                 <form onSubmit={handleBlockDay} className="flex items-center gap-3 mb-4">
                    <input type="date" value={blockDayDate} onChange={(e) => setBlockDayDate(e.target.value)} min={dayjs().format("YYYY-MM-DD")} required className="border p-2 rounded flex-grow focus:ring-blue-500 focus:border-blue-500"/>
                    <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50" disabled={availabilityLoading}>Block Day</button>
                 </form>
                 <h6 className="text-sm font-medium text-gray-600 mb-1">Blocked Days:</h6>
                 {availabilityLoading && blockedDays.length === 0 ? <p className="text-xs text-gray-500">Loading...</p> : null}
                 {!availabilityLoading && blockedDays.length === 0 ? <p className="text-xs text-gray-500 italic">No full days blocked.</p> : null}
                 {blockedDays.length > 0 && (
                    <ul className="space-y-1 max-h-32 overflow-y-auto">
                    {blockedDays.map((date) => (
                        <li key={date} className="flex justify-between items-center p-1 bg-red-100 rounded text-xs">
                        <span>{dayjs(date).format('ddd, MMM D, YYYY')}</span>
                        <button onClick={() => handleUnblockDay(date)} className="bg-green-500 hover:bg-green-600 text-white px-2 py-0.5 rounded text-xs disabled:opacity-50" disabled={availabilityLoading}>Unblock</button>
                        </li>
                    ))}
                    </ul>
                 )}
            </div>

            {/* Block Time Slot Form & List */}
            <div className="border p-4 rounded-md bg-gray-50">
                 <h5 className="font-medium text-gray-700 mb-2">Block Specific Time Slot</h5>
                 <form onSubmit={handleBlockSlot} className="flex flex-wrap items-center gap-3 mb-4"> {/* Use flex-wrap */}
                    <input type="date" value={blockSlotDate} onChange={(e) => setBlockSlotDate(e.target.value)} min={dayjs().format("YYYY-MM-DD")} required className="border p-2 rounded focus:ring-blue-500 focus:border-blue-500"/>
                    <select value={blockSlotTime} onChange={(e) => setBlockSlotTime(e.target.value)} required className="border p-2 rounded focus:ring-blue-500 focus:border-blue-500">
                        <option value="">Time</option>
                        {timeOptionsForBlocking.map(time => (<option key={time} value={time}>{dayjs(`1970-01-01 ${time}`).format('h:mm A')}</option>))}
                    </select>
                    <button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50" disabled={availabilityLoading}>Block Slot</button>
                 </form>
                 <h6 className="text-sm font-medium text-gray-600 mb-1">Blocked Slots:</h6>
                 {availabilityLoading && blockedSlots.length === 0 ? <p className="text-xs text-gray-500">Loading...</p> : null}
                 {!availabilityLoading && blockedSlots.length === 0 ? <p className="text-xs text-gray-500 italic">No specific time slots blocked.</p> : null}
                 {blockedSlots.length > 0 && (
                    <ul className="space-y-1 max-h-32 overflow-y-auto">
                    {blockedSlots.map((datetime) => (
                        <li key={datetime} className="flex justify-between items-center p-1 bg-yellow-100 rounded text-xs">
                        <span>{dayjs(datetime).format('ddd, MMM D - h:mm A')}</span>
                        <button onClick={() => handleUnblockSlot(datetime)} className="bg-green-500 hover:bg-green-600 text-white px-2 py-0.5 rounded text-xs disabled:opacity-50" disabled={availabilityLoading}>Unblock</button>
                        </li>
                    ))}
                    </ul>
                 )}
            </div>
        </div>
      </section>

    </div>
  );
}

export default DoctorSettings;
