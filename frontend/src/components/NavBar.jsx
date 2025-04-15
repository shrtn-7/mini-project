import React, { useContext } from 'react'; // Import useContext
import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate for redirection
import { UserContext } from '../context/UserContext'; // Import the UserContext

function Navbar() {

  // Get user state and setter function from the UserContext
  const { user, setUser } = useContext(UserContext) || {}; // Use || {} for safety if context is momentarily undefined
  const navigate = useNavigate(); // Initialize navigate hook

  const handleLogout = () => {
    // 1. Clear the user state in the context
    if (setUser) { // Check if setUser exists before calling
      setUser(null); 
    }
    
    // 2. Remove the token from local storage (VERY IMPORTANT)
    localStorage.removeItem('token');
    
    // 3. Redirect the user to the login page
    navigate('/login'); 
  };
  // Determine the home link based on login status and role
  const homeLink = !user ? '/login' : (user.role === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard');

  return (
    <nav className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md">
      <Link to={homeLink} className="text-xl font-bold hover:text-blue-200 transition-colors"> 
          MediSync
      </Link>

      <div>
        {!user ? ( 
          // --- Logged OUT View ---
          <>
            <Link to="/login" className="mr-4 hover:text-blue-200 transition-colors">Login</Link>
            <Link to="/register" className="hover:text-blue-200 transition-colors">Register</Link>
          </>
        ) : (
          // --- Logged IN View ---
          <>
            {/* Optional: Display welcome message */}
            <span className="mr-4 text-sm">Welcome, {user.name || user.email}!</span> 
            
            {/* Dashboard Link (Role Specific) */}
            {user.role === "patient" && <Link to="/patient-dashboard" className="mr-4 hover:text-blue-200 transition-colors">Dashboard</Link>}
            {user.role === "doctor" && <Link to="/doctor-dashboard" className="mr-4 hover:text-blue-200 transition-colors">Dashboard</Link>}
            
            {/* Logout Button */}
            <button 
                onClick={handleLogout} 
                className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-white font-medium transition-colors"
                title="Logout" // Accessibility
            >
                Logout
            </button> 
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
