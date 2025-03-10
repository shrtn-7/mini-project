// PatientDashboard.js
import React, { useState } from "react";
import { useParams } from 'react-router-dom'

const Sidebar = ({ isOpen, toggleSidebar }) => {
  
  return (
    <div
      className={`fixed inset-y-0 left-0 bg-gray-800 text-white w-64 p-5 transition-transform transform ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } md:relative md:translate-x-0`}
    >
      <button
        className="absolute top-4 right-4 md:hidden"
        onClick={toggleSidebar}
      >
        {/* Close icon (inline SVG) */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <ul className="mt-10 space-y-4">
        <li>
          <a href="#profile" className="hover:text-gray-300">
            Profile
          </a>
        </li>
        <li>
          <a href="#appointments" className="hover:text-gray-300">
            Appointments
          </a>
        </li>
        <li>
          <a href="#notifications" className="hover:text-gray-300">
            Notifications
          </a>
        </li>
        <li>
          <a href="#medical-records" className="hover:text-gray-300">
            Medical Records
          </a>
        </li>
        <li>
          <a href="#settings" className="hover:text-gray-300">
            Settings
          </a>
        </li>
      </ul>
    </div>
  );
};

const DashboardContent = ({ toggleSidebar }) => {
  const params = useParams();
  return (
    <div className="flex-1 p-6 md:p-8">
      {/* Mobile menu button */}
      <button className="md:hidden mb-4" onClick={toggleSidebar}>
        {/* Hamburger icon (inline SVG) */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <h2 className="text-2xl font-bold mb-6">Welcome, {params.patient}</h2>
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-3">Upcoming Appointments</h3>
        <ul className="list-disc pl-5">
          <li>Appointment 1 - 2025-03-15 10:00 AM</li>
          <li>Appointment 2 - 2025-03-22 02:00 PM</li>
        </ul>
      </div>
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-3">Notifications</h3>
        <ul className="list-disc pl-5">
          <li>You have a new lab result available.</li>
          <li>Reminder: Appointment tomorrow at 10:00 AM.</li>
        </ul>
      </div>
      <div>
        <h3 className="text-xl font-semibold mb-3">Recent Medical History</h3>
        <ul className="list-disc pl-5">
          <li>General Check-up - 2025-03-01</li>
          <li>Blood Test - 2025-02-20</li>
        </ul>
      </div>
    </div>
  );
};

const PatientDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="flex min-h-screen">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <DashboardContent toggleSidebar={toggleSidebar} />
    </div>
  );
};

export default PatientDashboard;
