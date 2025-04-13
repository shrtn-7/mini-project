import { Link } from "react-router-dom";

function Navbar({ user, setUser }) {
  const handleLogout = () => {
    setUser(null);
  };

  return (
    <nav className="bg-blue-600 text-white p-4 flex justify-between">
      <h1 className="text-xl font-bold">MediSync</h1>
      <div>
        {!user ? (
          <>
            <Link to="/login" className="mr-4">Login</Link>
            <Link to="/register">Register</Link>
          </>
        ) : (
          <>
            {user.role === "patient" && <Link to="/patient-dashboard" className="mr-4">Dashboard</Link>}
            {user.role === "doctor" && <Link to="/doctor-dashboard" className="mr-4">Dashboard</Link>}
            <button onClick={handleLogout} className="bg-red-500 px-3 py-1 rounded">Logout</button>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
