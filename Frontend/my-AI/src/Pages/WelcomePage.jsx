import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";

const WelcomePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { name, folderName, imageUrls } = location.state || {};
  const [images, setImages] = useState(imageUrls || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [videoUrls, setVideoUrls] = useState([]);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!folderName) {
      setError("No folder name provided. Please upload a file first.");
      return;
    }

    const fetchVideoStatus = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log(`Fetching video status for folder: ${folderName}`);
        const response = await axios.get(`http://localhost:5100/status/final-videos/${folderName}`);
        console.log("Video status response:", response.data);

        if (response.data.status === "completed") {
          setVideoUrls(response.data.videoUrls);
          console.log("Video URLs set:", response.data.videoUrls);
        } else if (response.data.status === "processing") {
          console.log("Videos still processing, retrying in 5 seconds...");
          setTimeout(fetchVideoStatus, 5000);
        } else if (response.data.status === "failed") {
          setError("Video processing failed: " + (response.data.error || "Unknown error"));
        } else {
          console.log("Videos not ready yet, retrying in 5 seconds...");
          setTimeout(fetchVideoStatus, 5000);
        }
      } catch (error) {
        console.error("Error fetching video status:", error);
        setError("Failed to fetch video status. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchVideoStatus();
  }, [folderName]);

  useEffect(() => {
    if (videoUrls.length > 0 && videoRef.current) {
      setIsVideoLoading(true);
      const videoUrl = videoUrls[currentImageIndex] || "";
      console.log(`Setting video URL for slide ${currentImageIndex + 1}: ${videoUrl}`);
      setIsPlaying(true);
      videoRef.current.src = videoUrl;
      videoRef.current.load();
      videoRef.current.play().catch((err) => console.error("Video play error:", err));
    }
  }, [currentImageIndex, videoUrls]);

  if (!folderName || !imageUrls || imageUrls.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-200">
        <p className="text-red-500">No data provided. Please upload a file first.</p>
      </div>
    );
  }

  const handleNextImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const handlePreviousImage = () => {
    setCurrentImageIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const togglePlayPause = () => {
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-200 pt-20">
      {/* Left Sidebar (Slide Bar) */}
      <div className="w-1/6 p-4 overflow-y-auto scrollbar-hide bg-white bg-opacity-70 backdrop-blur-md rounded-r-lg shadow-xl">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">Slides</h2>
        {images.map((imageUrl, index) => (
          <img
            key={index}
            src={imageUrl}
            alt={`Slide ${index + 1}`}
            className={`w-full h-auto mb-2 rounded cursor-pointer transition-transform transform hover:scale-105 ${
              index === currentImageIndex ? "border-2 border-blue-500" : "border border-gray-200"
            }`}
            onClick={() => setCurrentImageIndex(index)}
          />
        ))}
      </div>

      {/* Main Slide Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {loading && <p className="text-blue-500 mb-4">Loading videos...</p>}
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <div className="relative">
          <img
            src={images[currentImageIndex]}
            alt={`Slide ${currentImageIndex + 1}`}
            className="w-full h-auto max-h-[80vh] rounded-lg shadow-2xl"
          />
          <button
            onClick={handlePreviousImage}
            className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white p-3 rounded-full shadow-lg hover:bg-gray-100 transition-all"
            aria-label="Previous Image"
          >
            ←
          </button>
          <button
            onClick={handleNextImage}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white p-3 rounded-full shadow-lg hover:bg-gray-100 transition-all"
            aria-label="Next Image"
          >
            →
          </button>
        </div>
      </div>

      {/* Right Sidebar (Video and Controls) */}
      <div className="w-1/5 p-4 bg-white bg-opacity-70 backdrop-blur-md rounded-l-lg shadow-xl">
        <div className="flex flex-col items-center space-y-4 h-full">
          {/* Video Container */}
          <div className="mt-14 w-full h-[55vh] rounded-xl shadow-xl overflow-hidden relative">
            {videoUrls.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-200 bg-opacity-75">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-700">Waiting for video processing...</p>
              </div>
            ) : isVideoLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-200 bg-opacity-75">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-700">Loading video...</p>
              </div>
            ) : null}
            <video
              ref={videoRef}
              className="w-full h-full object-fill"
              autoPlay
              onCanPlay={() => setIsVideoLoading(false)}
              onEnded={handleNextImage}
            />
          </div>
          {/* Controls */}
          <div className="flex flex-row space-x-4">
            <button
              onClick={togglePlayPause}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button
              onClick={() => navigate("/qna", { state: { videoUrl: videoUrls[currentImageIndex] } })}
              className="px-4 py-2 bg-teal-500 text-white rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              Q&A
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;