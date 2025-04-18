import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { UserContext } from '../context/UserContext'; // To get current user info

// Define working hours boundaries (these could eventually be fetched/set)
const DEFAULT_WORK_START_HOUR = 11;
const DEFAULT_WORK_END_HOUR = 19;

function DoctorSettings() {
  const { user } = useContext(UserContext) || {}; // Get logged-in user info

  // --- Profile State ---
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' }); // For success/error messages
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  // --- Schedule Settings State ---
  const [startTime, setStartTime] = useState('11:00'); // Default value
  const [endTime, setEndTime] = useState('19:00');   // Default value
  const [workingDays, setWorkingDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']); // Default value
  const [appointmentDuration, setAppointmentDuration] = useState(30); // Default value (minutes)
  const [breakTimeStart, setBreakTimeStart] = useState('13:00'); // Default value
  const [breakTimeEnd, setBreakTimeEnd] = useState('14:00');   // Default value
  const [scheduleMessage, setScheduleMessage] = useState({ type: '', text: '' });
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);

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

  // Populate profile form with current user data on load
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  // Fetch current schedule settings and availability on load
  useEffect(() => {
    const fetchSettings = async () => {
      if (!token) return;
      
      // Fetch Schedule Settings (using the new backend endpoint)
      setIsScheduleLoading(true); // Indicate loading for schedule part
      try {
        const scheduleRes = await axios.get("http://localhost:5000/schedule/settings", { 
            headers: { Authorization: `Bearer ${token}` } 
        });
        const settings = scheduleRes.data;
        // Update state with fetched settings, using defaults if values are null/undefined
        setStartTime(settings.start_time?.substring(0, 5) || '11:00'); // Format HH:mm
        setEndTime(settings.end_time?.substring(0, 5) || '19:00');     // Format HH:mm
        setWorkingDays(settings.working_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']); // Ensure it's an array
        setAppointmentDuration(settings.appointment_duration || 30);
        setBreakTimeStart(settings.break_start_time?.substring(0, 5) || '13:00'); // Format HH:mm
        setBreakTimeEnd(settings.break_end_time?.substring(0, 5) || '14:00');     // Format HH:mm
      } catch (err) {
         console.error("Error fetching schedule settings:", err);
         setScheduleMessage({ type: 'error', text: 'Could not load current schedule settings.' });
         // Keep default values if fetch fails
      } finally {
          setIsScheduleLoading(false);
      }

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

  // Profile Update Handler (Connects to backend PUT /users/profile)
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileMessage({ type: '', text: '' }); 

    if (newPassword && newPassword !== confirmPassword) {
      setProfileMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword && !currentPassword) {
       setProfileMessage({ type: 'error', text: 'Please enter your current password to set a new one.' });
       return;
    }

    setIsProfileLoading(true);
    try {
      const payload = { name, email };
      // Only include password fields if a new password is being set
      if (newPassword && currentPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }
      
      // Call the backend endpoint created in routes/users.js
      const response = await axios.put('http://localhost:5000/users/profile', payload, { 
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setProfileMessage({ type: 'success', text: response.data.message || 'Profile updated successfully!' });
      
      // Optionally update user context or local storage if name/email changed
      // This depends on how UserContext is implemented
      if (user && setUser) { // Assuming setUser is available from context
         setUser({...user, name: payload.name, email: payload.email });
      }

      // Clear password fields after successful update
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); 
    } catch (err) {
      console.error("Profile update error:", err);
      setProfileMessage({ type: 'error', text: err.response?.data?.error || "Failed to update profile." });
    } finally {
      setIsProfileLoading(false);
    }
  };

  // Schedule Settings Update Handler (Connects to backend PUT /schedule/settings)
  const handleScheduleUpdate = async (e) => {
    e.preventDefault();
    setScheduleMessage({ type: '', text: '' });
    setIsScheduleLoading(true);
    const scheduleData = {
        startTime,
        endTime,
        workingDays,
        appointmentDuration,
        breakStartTime, // Ensure backend expects HH:mm
        breakEndTime    // Ensure backend expects HH:mm
    };
    
    try {
      // Call the backend endpoint created in routes/schedule.js
      const response = await axios.put('http://localhost:5000/schedule/settings', scheduleData, { 
        headers: { Authorization: `Bearer ${token}` },
      });
      setScheduleMessage({ type: 'success', text: response.data.message || 'Schedule settings updated successfully!' });
    } catch (err) {
      console.error("Schedule update error:", err);
      setScheduleMessage({ type: 'error', text: err.response?.data?.error || "Failed to update schedule settings." });
    } finally {
      setIsScheduleLoading(false);
    }
  };

  // Handler for working days checkboxes
  const handleWorkingDayChange = (day) => {
    setWorkingDays(prev => {
      const updatedDays = prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day];
      // Keep days sorted for consistency
      return updatedDays.sort((a, b) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(a) - ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(b));
    });
  };

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
        <h3 className="text-xl font-semibold mb-5 text-gray-700">Change Profile</h3>
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          {/* Name Field */}
          <div>
            <label htmlFor="profileName" className="block text-sm font-medium text-gray-600 mb-1">Name</label>
            <input
              type="text"
              id="profileName" // Changed id to avoid conflict
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          {/* Email Field */}
          <div>
            <label htmlFor="profileEmail" className="block text-sm font-medium text-gray-600 mb-1">Email</label>
            <input
              type="email"
              id="profileEmail" // Changed id to avoid conflict
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          {/* Current Password Field */}
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-600 mb-1">Current Password <span className="text-xs text-gray-500">(Required to change password)</span></label>
            <input
              type="password"
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          {/* New Password Field */}
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-600 mb-1">New Password</label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
               autoComplete="new-password"
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          {/* Confirm New Password Field */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-600 mb-1">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          {/* Message Area */}
          {profileMessage.text && (
            <p className={`text-sm mt-2 ${profileMessage.type === 'error' ? 'text-red-600' : profileMessage.type === 'success' ? 'text-green-600' : 'text-blue-600'}`}>
              {profileMessage.text}
            </p>
          )}
          {/* Submit Button */}
          <div className="pt-2 text-right">
            <button 
              type="submit"
              disabled={isProfileLoading}
              className="inline-flex justify-center py-2 px-5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isProfileLoading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </section>

      {/* --- Change Schedule Section --- */}
      <section className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h3 className="text-xl font-semibold mb-5 text-gray-700">Change Schedule</h3>
        
        {/* General Schedule Settings Form */}
        <form onSubmit={handleScheduleUpdate} className="space-y-6 border-b pb-6 mb-6">
          {/* Working Hours */}
          <fieldset>
            <legend className="text-base font-medium text-gray-900 mb-2">Working Hours</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startTime" className="block text-sm font-medium text-gray-600 mb-1">Start Time</label>
                <input type="time" id="startTime" value={startTime} onChange={(e) => setStartTime(e.target.value)} step="3600" /* Step by hour */ className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-gray-600 mb-1">End Time</label>
                <input type="time" id="endTime" value={endTime} onChange={(e) => setEndTime(e.target.value)} step="3600" /* Step by hour */ className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
              </div>
            </div>
          </fieldset>

          {/* Working Days */}
          <fieldset>
            <legend className="text-base font-medium text-gray-900 mb-2">Working Days</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-2"> {/* Adjusted gap */}
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <label key={day} className="inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={workingDays.includes(day)} 
                    onChange={() => handleWorkingDayChange(day)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 h-4 w-4" // Standard checkbox size
                   />
                  <span className="ml-2 text-sm text-gray-700">{day}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Appointment Settings */}
           <fieldset>
            <legend className="text-base font-medium text-gray-900 mb-2">Appointment Settings</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-600 mb-1">Appointment Duration (minutes)</label>
                <input type="number" id="duration" value={appointmentDuration} onChange={(e) => setAppointmentDuration(parseInt(e.target.value) || 0)} min="15" step="5" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="breakStart" className="block text-sm font-medium text-gray-600 mb-1">Break Time</label>
                 <div className="flex items-center gap-2 mt-1">
                    <input type="time" id="breakStart" value={breakTimeStart} onChange={(e) => setBreakTimeStart(e.target.value)} step="900" /* Step by 15 min */ className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    <span className="text-gray-500">to</span>
                     <input type="time" id="breakEnd" value={breakTimeEnd} onChange={(e) => setBreakTimeEnd(e.target.value)} step="900" /* Step by 15 min */ className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                 </div>
              </div>
            </div>
          </fieldset>
          
          {/* Message Area */}
          {scheduleMessage.text && (
            <p className={`text-sm mt-2 ${scheduleMessage.type === 'error' ? 'text-red-600' : scheduleMessage.type === 'success' ? 'text-green-600' : 'text-blue-600'}`}>
              {scheduleMessage.text}
            </p>
          )}
          {/* Submit Button */}
          <div className="pt-2 text-right">
            <button 
              type="submit"
              disabled={isScheduleLoading}
              className="inline-flex justify-center py-2 px-5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isScheduleLoading ? 'Saving...' : 'Save Schedule'}
            </button>
          </div>
        </form>

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
