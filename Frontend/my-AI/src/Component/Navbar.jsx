import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";

const Navbar = ({ user, setUser }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("supabaseSession");
    setUser(null);
    navigate("/login");
  };

  return (
    <nav className="fixed top-0 left-0 w-full bg-white shadow-lg z-50">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <img src="Vector.png" alt="Logo" className="h-8 w-10" />
          <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">
            PresentPal
          </span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden lg:flex justify-center space-x-9 flex-1">
          <Link to="/" className="text-gray-600 hover:text-blue-600 transition-colors">
            Home
          </Link>
          <Link to="/about" className="text-gray-600 hover:text-blue-600 transition-colors">
            About
          </Link>
          <Link to="/services" className="text-gray-600 hover:text-blue-600 transition-colors">
            Services
          </Link>
          {/* Dropdown Menu */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              More
            </button>
            {isDropdownOpen && (
              <div className="absolute bg-white rounded-lg shadow-lg top-full mt-2 w-40">
                <Link
                  to="/Reaserch"
                  className="block px-4 py-2 text-gray-600 hover:bg-gray-100 hover:text-blue-600"
                >
                  Research
                </Link>
                <Link
                  to="/Contact"
                  className="block px-4 py-2 text-gray-600 hover:bg-gray-100 hover:text-blue-600"
                >
                  Contact
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Conditional Rendering for Login/Signup or User Name and Logout */}
        <div className="hidden lg:flex space-x-4 items-center">
          {user ? (
            <>
              <Link to="/upload" className="text-gray-600 hover:text-blue-600 transition-colors">
                <span className="mt-2">{user.user_metadata.name}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="px-6 py-2 text-white bg-red-500 hover:bg-red-600 rounded-lg shadow-md transition-all"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">
                <button className="px-6 py-2 text-white bg-blue-500 hover:bg-blue-600 rounded-lg shadow-md transition-all">
                  Login
                </button>
              </Link>
              <Link to="/signup">
                <button className="px-6 py-2 text-blue-500 border border-blue-500 hover:bg-blue-500 hover:text-white rounded-lg shadow-md transition-all">
                  Signup
                </button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="text-gray-600 lg:hidden focus:outline-none"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            {isMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden mt-4 space-y-2 text-center">
          <Link to="/" className="block text-gray-600 hover:text-blue-600 transition-colors">
            Home
          </Link>
          <Link to="/about" className="block text-gray-600 hover:text-blue-600 transition-colors">
            About
          </Link>
          <Link to="/services" className="block text-gray-600 hover:text-blue-600 transition-colors">
            Services
          </Link>
          <Link to="/Reaserch" className="block text-gray-600 hover:text-blue-600 transition-colors">
            Research
          </Link>
          <Link to="/Contact" className="block text-gray-600 hover:text-blue-600 transition-colors">
            Contact
          </Link>
          {user ? (
            <>
              <Link to="/upload" className="block text-gray-600 hover:text-blue-600 transition-colors">
                <span className="font-bold">Welcome, {user.user_metadata.name}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full px-6 py-2 text-white bg-red-500 hover:bg-red-600 rounded-lg shadow-md transition-all"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">
                <button className="w-full px-6 py-2 text-white bg-blue-500 hover:bg-blue-600 rounded-lg shadow-md transition-all">
                  Login
                </button>
              </Link>
              <Link to="/signup">
                <button className="w-full px-6 py-2 text-blue-500 border border-blue-500 hover:bg-blue-500 hover:text-white rounded-lg shadow-md transition-all">
                  Signup
                </button>
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;