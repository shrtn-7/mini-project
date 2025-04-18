import React, { useContext } from "react"; 
import { Routes, Route, useLocation, Navigate } from "react-router-dom"; // Import Navigate
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar"; // Import Sidebar component
import Login from "./components/Login";
import Register from "./components/Register";
import PatientDashboard from "./components/PatientDashboard";
import DoctorDashboard from "./components/DoctorDashboard";
import AppointmentSystem from "./components/AppointmentSystem";
import DoctorAllAppointments from "./components/DoctorAllAppointments";
import DoctorSettings from "./components/DoctorSettings";
// import MedicalRecords from "./components/MedicalRecords"; // Uncomment if used
import { UserContext } from './context/UserContext'; // Import UserContext

function App() {
  // Get user data from context
  const { user } = useContext(UserContext) || {};
  // Get current URL location
  const location = useLocation(); 

  // Determine if the sidebar should be displayed
  // Conditions: User must be logged in, role must be 'doctor', and not on login/register pages
  const showSidebar = user && user.role === 'doctor' && 
                      location.pathname !== '/login' && 
                      location.pathname !== '/register';

  // Component to handle default redirection based on login status and role
  const DefaultRoute = () => {
    if (!user) {
      // If not logged in, redirect to login
      return <Navigate to="/login" replace />;
    }
    // If logged in, redirect to the appropriate dashboard
    return user.role === 'doctor' 
      ? <Navigate to="/doctor-dashboard" replace /> 
      : <Navigate to="/patient-dashboard" replace />;
  };

  return (
    // Outermost container: Uses Flexbox column layout, takes full screen height
    <div className="flex flex-col h-screen">
      {/* Navbar always displayed at the top */}
      {/* Ensure Navbar has a defined height, e.g., className="h-16 ..." */}
      <Navbar /> 
      
      {/* Container for content below navbar */}
      {/* Uses Flexbox row layout (default for 'flex'), takes remaining vertical space (flex-1), prevents parent overflow */}
      <div className="flex flex-1 overflow-hidden"> 
        
        {/* Conditionally render the Sidebar */}
        {/* Sidebar should have fixed width (e.g., w-60), full height (h-full), and flex-shrink-0 */}
        {showSidebar && <Sidebar />}

        {/* Main Content Area */}
        {/* Takes remaining horizontal space (flex-grow) */}
        {/* Allows internal vertical scrolling (overflow-y-auto) */}
        {/* Sets padding and background color */}
        <main className="flex-grow p-6 overflow-y-auto bg-white"> 
          {/* Define application routes */}
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Patient Routes */}
            <Route path="/patient-dashboard" element={<PatientDashboard />} />
            <Route path="/book-appointment" element={<AppointmentSystem />} />
            {/* Add other patient-specific routes here */}

            {/* Doctor Routes */}
            <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
            
            <Route path="/doctor/all-appointments" element={<DoctorAllAppointments />} />

            <Route path="/doctor/settings" element={<DoctorSettings />} /> 
            
            {/* Default Route Handler for '/' */}
            <Route path="/" element={<DefaultRoute />} />

            {/* Optional: Catch-all route to redirect undefined paths */}
            {/* <Route path="*" element={<Navigate to="/" replace />} /> */}

          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
