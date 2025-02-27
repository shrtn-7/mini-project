import React, { useState } from 'react';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Toggle Sidebar for mobile view
  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div
        className={`${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } fixed inset-0 z-50 bg-gray-500 bg-opacity-75 md:relative md:translate-x-0 transition-transform duration-300 md:w-64 w-48`}
      >
        <button
          className="text-gray-800 p-2"
          onClick={toggleSidebar}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <div className="text-white p-5">
          <h1 className="text-2xl font-bold mb-8">My Sidebar</h1>
          <ul>
            <li className="mb-4">
              <a href="/" className="hover:text-gray-400">Home</a>
            </li>
            <li className="mb-4">
              <a href="/about" className="hover:text-gray-400">About</a>
            </li>
            <li className="mb-4">
              <a href="/services" className="hover:text-gray-400">Services</a>
            </li>
            <li className="mb-4">
              <a href="/contact" className="hover:text-gray-400">Contact</a>
            </li>
          </ul>
        </div>
      </div>

      {/* Main Content */}
      {/* <div className="flex-1 bg-gray-100 p-8">
        <button
          className="md:hidden text-gray-800 p-2"
          onClick={toggleSidebar}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <h2 className="text-3xl font-bold">Main Content Area</h2>
        <p>
          This is the main content area. You can add any other content here.
        </p>
      </div> */}
    </div>
  );
};

export default Sidebar;
