import { createContext, useState, useEffect } from "react";
import * as jwtDecode from "jwt-decode"; // Correct import

export const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decodedUser = jwtDecode.jwtDecode(token); // Correct usage
        setUser(decodedUser); // decodedUser contains name, email, role, etc.
      } catch (err) {
        console.error("Invalid token", err);
        setUser(null);
      }
    }
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}
