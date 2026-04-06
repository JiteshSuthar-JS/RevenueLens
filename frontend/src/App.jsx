// import './App.css'
// import Navbar from './components/Navbar';
// import Dashboard from './pages/Dashboard'; 
// import Reports from './pages/Reports';
// import UploadData from './pages/UploadData';
// import Login from './pages/Login';
// import { BrowserRouter, Routes, Route } from "react-router-dom";

// function App() {
//   return (
//     <div>
//       <BrowserRouter>
//         <Navbar />
//         <Routes>
//           <Route path="/" element={<Dashboard />} /> 
//           <Route path="/reports" element={<Reports />} />
//           <Route path="/upload" element={<UploadData />} />
//           <Route path="/login" element={<Login />} />
//         </Routes> 
//       </BrowserRouter> 
//     </div>
//   );
// }

// export default App

import './App.css'
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import UploadData from './pages/UploadData';
import Login from './pages/Login';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// If NOT logged in → redirect to /login
const ProtectedRoute = ({ children }) => {
  const user = localStorage.getItem("user");
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// If already logged in → redirect to dashboard (don't show login again)
const PublicRoute = ({ children }) => {
  const user = localStorage.getItem("user");
  if (user) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <div>
      <BrowserRouter>
        <Routes>

          {/* Login — no Navbar, redirects to home if already logged in */}
          <Route path="/login" element={
            <PublicRoute><Login /></PublicRoute>
          } />

          {/* Protected pages — must be logged in */}
          <Route path="/" element={
            <ProtectedRoute><Navbar /><Dashboard /></ProtectedRoute>
          } />

          <Route path="/reports" element={
            <ProtectedRoute><Navbar /><Reports /></ProtectedRoute>
          } />

          <Route path="/upload" element={
            <ProtectedRoute><Navbar /><UploadData /></ProtectedRoute>
          } />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App