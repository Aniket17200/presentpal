import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import './App.css';
import Navbar from './Component/Navbar';
import LoginPage from './Pages/LoginPage';
import HomePage from './Pages/HomePage';
import AboutPage from './Pages/AboutPage';
import ServicesPage from './Pages/ServicesPage';
import Reaserch from './Pages/Reaserch';
import Contact from './Pages/Contact';
import UploadPage from './Pages/UploadPage';
import WelcomePage from './Pages/WelcomePage';
import Signup from './Pages/Signup';
import Dashboard from './Component/Dashboard';
import ResetPassword from './Pages/ResetPassword';
 import QnAPage from './Pages/QnAPage';

function App() {
  const [user, setUser] = useState(null);

  // Check if the user is already logged in
  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('supabaseSession'));
    if (session) {
      setUser(session.user);
    }
  }, []);

  return (
    <Router>
      <div className="relative">
        {/* Navbar with z-index for visibility */}
        <div className="z-30">
          <Navbar user={user} setUser={setUser} />
        </div>

        {/* Routes */}
        <Routes>
        <Route path="/" element={<HomePage user={user} />} /> {/* Homepage is the default */}
          <Route path="/about" element={<AboutPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route
            path="/login"
            element={user ? <Navigate to="/dashboard" /> : <LoginPage setUser={setUser} />}
          />
          <Route path="/Reaserch" element={<Reaserch />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/signup"
            element={user ? <Navigate to="/dashboard" /> : <Signup setUser={setUser} />}
          />
          <Route
            path="/dashboard"
            element={user ? <Dashboard user={user} setUser={setUser} /> : <Navigate to="/login" />}
          />
          <Route path="/welcome" element={<WelcomePage />} /> {/* New route for the Welcome page */}
          {/* Redirect to homepage or 404 for any unmatched paths */}
          <Route path="*" element={<HomePage />} /> {/* Or a 404 page */}
          <Route path="/qna" element={<QnAPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;