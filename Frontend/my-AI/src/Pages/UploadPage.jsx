import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const UploadPage = () => {
  const [pptFile, setPptFile] = useState(null);
  const [userImage, setUserImage] = useState(null); // Optional user image
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null); // Success message
  const navigate = useNavigate();

  // Handle PPT file selection
  const handlePptChange = (event) => {
    const file = event.target.files[0];
    if (file && (file.type === "application/vnd.ms-powerpoint" || file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation")) {
      setPptFile(file);
      setError(null); // Clear any previous errors
    } else {
      setError("Please select a valid PowerPoint file (.ppt or .pptx)");
      setPptFile(null);
    }
  };

  // Handle user image selection (optional)
  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setUserImage(file);
      setError(null);
    } else {
      setError("Please select a valid image file");
      setUserImage(null);
    }
  };

  // Handle form submission
  const handleUpload = async (event) => {
    event.preventDefault();
    if (!pptFile) {
      setError("Please select a PowerPoint file to upload");
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setMessage(null);

      // Create FormData object for file upload
      const formData = new FormData();
      formData.append("ppt", pptFile); // Matches backend multer field
      if (userImage) {
        formData.append("userImage", userImage); // Optional field
      }

      // Send request to backend
      const response = await axios.post("http://localhost:5100/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("Upload successful:", response.data);

      // Extract relevant data from response
      const { folderName, imageUrls, pptUrl, pdfUrl, userImageUrl, audioTaskId, animationTaskId } = response.data;
      console.log("Folder name:", folderName);
      console.log("Image URLs:", imageUrls);
      console.log("PPT URL:", pptUrl);
      console.log("PDF URL:", pdfUrl);
      if (userImageUrl) console.log("User Image URL:", userImageUrl);
      if (audioTaskId) console.log("Audio Task ID:", audioTaskId);
      if (animationTaskId) console.log("Animation Task ID:", animationTaskId);

      setMessage("File uploaded successfully! Processing has started.");

      // Navigate to WelcomePage with some data
      navigate("/welcome", {
        state: {
          name: "John Doe", // Replace with actual user name from auth context if available
          folderName,
          imageUrls, // Pass image URLs for display or further use
        },
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      const errorMsg = error.response?.data?.error || "Failed to upload the file. Please try again.";
      setError(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-200">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-6 text-center">Upload Your Presentation</h2>

        {/* Display messages */}
        {message && <p className="text-green-500 mb-4 text-center">{message}</p>}
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

        {/* Upload form */}
        <form onSubmit={handleUpload} className="space-y-6">
          {/* PPT File Input */}
          <div>
            <label htmlFor="ppt" className="block text-sm font-medium text-gray-700 mb-1">
              PowerPoint File (.ppt or .pptx) <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              id="ppt"
              accept=".ppt,.pptx"
              onChange={handlePptChange}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={uploading}
            />
          </div>

          {/* User Image Input (Optional) */}
          <div>
            <label htmlFor="userImage" className="block text-sm font-medium text-gray-700 mb-1">
              User Image (Optional)
            </label>
            <input
              type="file"
              id="userImage"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={uploading}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`w-full py-3 rounded-lg text-white transition duration-200 ${
              uploading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
            }`}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UploadPage;