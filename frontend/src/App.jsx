import './App.css'
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard'; 
import Reports from './pages/Reports';
import UploadData from './pages/UploadData';
import Login from './pages/Login';
import { BrowserRouter, Routes, Route } from "react-router-dom";

function App() {
  return (
    <div>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Dashboard />} /> 
          <Route path="/reports" element={<Reports />} />
          <Route path="/upload" element={<UploadData />} />
          <Route path="/login" element={<Login />} />
        </Routes> 
      </BrowserRouter> 
    </div>
  );
}

export default App