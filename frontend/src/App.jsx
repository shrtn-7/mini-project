import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./components/Login";
import Register from "./components/Register";
import PatientDashboard from "./components/PatientDashboard";
import DoctorDashboard from "./components/DoctorDashboard";
import AppointmentSystem from "./components/AppointmentSystem";
import MedicalRecords from "./components/MedicalRecords";

function App() {

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-4">
        <Routes>
          <Route path="/login" element={<Login/>} /> 
          <Route path="/register" element={<Register />} />
          <Route path="/patient-dashboard" element={<PatientDashboard />} />
          <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
          <Route path="/book-appointment" element={<AppointmentSystem />} />
        </Routes>
      </div>
    </>
  );
}

export default App;