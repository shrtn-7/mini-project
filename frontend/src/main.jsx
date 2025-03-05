import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// import App from './App.jsx'
import Dashboard from './Dashboard.jsx'
// import PatientRegistration from '../PatientRegistration.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* <App /> */}
    {/* <PatientRegistration/> */}
    <Dashboard/>
  </StrictMode>,
)
