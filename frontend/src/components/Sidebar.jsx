import React, { useContext } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext'; // Import the UserContext

// Import icons (using lucide-react for this example)
import { LayoutDashboard, Users, CalendarDays, Settings, LogOut } from 'lucide-react';

function Sidebar() {
  const { setUser } = useContext(UserContext) || {};
  const navigate = useNavigate();

  const handleLogout = () => {
    if (setUser) {
      setUser(null); 
    }
    localStorage.removeItem('token'); 
    navigate('/login'); 
  };

  const navItems = [
    { name: 'Dashboard', href: '/doctor-dashboard', icon: LayoutDashboard },
    { name: 'Patients', href: '#', icon: Users }, // Placeholder link
    { name: 'Appointments', href: '#', icon: CalendarDays }, // Placeholder link
    { name: 'Settings', href: '#', icon: Settings }, // Placeholder link
  ];

  return (
    // Updated classes: Set fixed width, full height within parent, allow vertical scroll if needed
    <aside className="w-60 h-full bg-gray-50 border-r border-gray-200 flex flex-col justify-between p-4 overflow-y-auto flex-shrink-0"> 
      {/* flex-shrink-0 prevents the sidebar from shrinking if content is too wide */}
      <nav>
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900' 
                  }`
                }
                end={item.href === '/doctor-dashboard'}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                <span>{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="flex items-center space-x-3 w-full px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors mt-4" // Added margin-top
        title="Logout"
      >
        <LogOut className="h-5 w-5" aria-hidden="true" />
        <span>Logout</span>
      </button>
    </aside>
  );
}

export default Sidebar;
