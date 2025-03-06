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
      {/* <NavBar/> */}
      <Routes>
        <Route path = '/' element = {<Home/>} ></Route>
        <Route path = '/register' element = {<PatientRegistration/>} ></Route>
        <Route path = '/:patient/dashboard' element = {<PatientDashboard/>} ></Route>
      </Routes>
    </>
  )
}

export default App
