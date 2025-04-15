import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { UserContext } from "../context/UserContext";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // --- Get setUser from context ---
  const { setUser } = useContext(UserContext);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    // Ensure setUser is available from context provider
    if (!setUser) {
      console.error("Login Error: setUser context function is unavailable.");
      setError("An internal error occurred. Please try again later.");
      return;
    }

    try {
      const response = await axios.post("http://localhost:5000/auth/login", {
        email,
        password,
      });

      const { user: loggedInUser, token } = response.data;

      localStorage.setItem("token", token); // Store the new token

      setUser(loggedInUser);

      // Redirect based on role
      navigate(loggedInUser.role === "doctor" ? "/doctor-dashboard" : "/patient-dashboard");
    } catch (err) {
      console.error("Login API failed:", err);
      const errorMessage = err.response?.data?.error || // Check for backend error first
        (err instanceof ReferenceError ? "An internal login error occurred." : "Login failed. Please check credentials."); // Show generic if it was the ReferenceError
      setError(errorMessage);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h2 className="text-2xl mb-4">Login</h2>
      <form onSubmit={handleLogin} className="flex flex-col space-y-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="border p-2 rounded"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="border p-2 rounded"
        />
        {error && <p className="text-red-500">{error}</p>}

        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Login</button>
      </form>
      <p className="text-center text-sm mt-4 text-gray-600">
        Don't have an account? <Link to="/register" className="text-blue-600 hover:underline">Register here</Link>
      </p>
    </div>
  );
}

export default Login;
