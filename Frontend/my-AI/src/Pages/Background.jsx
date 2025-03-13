import React, { useEffect, useRef } from 'react';
import { Application } from '@splinetool/runtime';
import { useNavigate } from 'react-router-dom';

const Background = ({ user }) => {
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (canvasRef.current) {
      const app = new Application(canvasRef.current);
      app.load('https://prod.spline.design/WWhsZVwFsvhC9NaH/scene.splinecode');
    }
  }, []);

  return (
    <div className="h-screen bg-white overflow-hidden relative">
      <canvas ref={canvasRef} className="w-full h-full"></canvas>
      <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 z-20 text-center">
        <p className="text-blue-500 text-lg md:text-xl font-semibold mb-4 max-w-xl">
          PresentPal transforms your PowerPoint presentations into interactive experiences. Bring your slides to life!
        </p>
        {!user && ( // Only show buttons if user is not logged in
          <div className="flex justify-center gap-4">
            <button
              className="px-6 py-3 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-700 transition-all"
              onClick={() => navigate('/signup')}
            >
              Sign Up
            </button>
            <button
              className="px-6 py-3 bg-gray-700 text-white rounded-lg shadow-md hover:bg-gray-900 transition-all"
              onClick={() => navigate('/login')}
            >
              Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Background;