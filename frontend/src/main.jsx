import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import Navbar from "./components/Navbar";
// import Dashboard from "./pages/Dashboard";
// import Forecasts from "./pages/Forecasts";

// <BrowserRouter>
//   <Navbar />
//   <Routes>
//     <Route path="/"          element={<Dashboard />} />
//     <Route path="/forecasts" element={<Forecasts />} />
//     <Route path="/upload"    element={<UploadData />} />
//     <Route path="/reports"   element={<Reports />} />
//     <Route path="/settings"  element={<Settings />} />
//     <Route path="/login"     element={<Login />} />
//   </Routes>
// </BrowserRouter>