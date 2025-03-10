import React from 'react'
import NavBar from './components/NavBar.jsx'
import './App.css'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home.jsx'
import PatientRegistration from './pages/PatientRegistration.jsx'
import PatientDashboard from './pages/PatientDashboard.jsx'


function App() {

  return (
    <>
      <NavBar/>
      <Routes>
        <Route path = '/' element = {<Home/>} ></Route>
        <Route path = '/register' element = {<PatientRegistration/>} ></Route>
        <Route path = '/:patient/dashboard' element = {<PatientDashboard/>} ></Route>
      </Routes>
    </>
  )
}

export default App

// import React from 'react';
// import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
// import NavBar from './components/NavBar.jsx';
// import Sidebar from './components/Sidebar.jsx';
// import Home from './pages/Home.jsx';
// import PatientRegistration from './pages/PatientRegistration.jsx';
// import PatientDashboard from './pages/PatientDashboard.jsx';
// import Profile from './pages/Profile.jsx';
// import Bookings from './pages/Bookings.jsx';

// // Layout for public routes (with NavBar)
// const PublicLayout = () => (
//   <div className="min-h-screen bg-gray-100">
//     <NavBar />
//     <div className="container mx-auto px-4 py-6">
//       <Outlet />
//     </div>
//   </div>
// );

// // Layout for dashboard routes (with Sidebar)
// const DashboardLayout = () => (
//   <div className="flex min-h-screen">
//     <Sidebar />
//     <div className="flex-1 bg-white p-6">
//       <Outlet />
//     </div>
//   </div>
// );

// // ProtectedRoute to check if user is logged in
// const ProtectedRoute = ({ isLoggedIn }) => {
//   return isLoggedIn ? <Outlet /> : <Navigate to="/" />;
// };

// function App() {
//   // Replace with your actual authentication logic
//   const isLoggedIn = true;

//   return (
//       <Routes>
//         {/* Public routes with NavBar */}
//         <Route element={<PublicLayout />}>
//           <Route path="/" element={<Home />} />
//           <Route path="/register" element={<PatientRegistration />} />
//         </Route>

//         {/* Dashboard routes (protected) with Sidebar */}
//         <Route element={<ProtectedRoute isLoggedIn={isLoggedIn} />}>
//           <Route element={<DashboardLayout />}>
//             <Route path="/dashboard" element={<PatientDashboard />} />
//             <Route path="/dashboard/profile" element={<Profile />} />
//             <Route path="/dashboard/bookings" element={<Bookings />} />
//             {/* Add more nested routes as needed */}
//           </Route>
//         </Route>
//       </Routes>
//   );
// }

// export default App;

