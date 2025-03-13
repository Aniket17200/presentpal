import React from "react";
import { useNavigate } from "react-router-dom";
import UploadPage from "../Pages/UploadPage";

const Dashboard = ({ user, setUser }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("supabaseSession");
    setUser(null);
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-100">
        <UploadPage/>
       
      
    </div>
  );
};

export default Dashboard;