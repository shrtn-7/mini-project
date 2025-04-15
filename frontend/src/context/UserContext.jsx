import { createContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode"; // Correct import

export const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    console.log("UserProvider Effect: Checking token...");
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decodedUser = jwtDecode(token); // Correct usage
        const currentTime = Date.now() / 1000;

        if (decodedUser.exp < currentTime) {
          console.log("UserProvider Effect: Token expired."); // Debug
          throw new Error("Token expired"); // Treat expired token as invalid
        }
        
        console.log("UserProvider Effect: Token found and valid. Setting user:", decodedUser); // Debug


        setUser(decodedUser); // decodedUser contains name, email, role, etc.
      } catch (error) {
        // This catches decoding errors AND the expiry error thrown above
        console.error("UserProvider Effect: Invalid token encountered.", error); // Debug
        localStorage.removeItem('token'); // *** Remove the invalid/expired token ***
        setUser(null); // Ensure user state is null
      }
    } else {
      console.log("UserProvider Effect: No token found."); // Debug
      setUser(null); // Ensure user state is null if no token exists
    }
  }, []);

  console.log("UserContext Rendering - User:", user); // Debug: See context value changes

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}
