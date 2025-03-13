import React from "react";
import { motion } from "framer-motion";

const services = [
  {
    title: "AI-Powered Virtual Avatars",
    description: "Deliver presentations with AI-driven avatars featuring realistic expressions, voice modulation, and gestures.",
    image: "aIavtar.jpg",
  },
  {
    title: "Smart Voice Narration",
    description: "Convert text-based slides into natural, human-like speech with AI-powered voice synthesis.",
    image: "voice1.jpg",
  },
  {
    title: "Interactive Presentations",
    description: "AI avatars react to content and engage with audiences using intelligent gestures and animations.",
    image: "interactpresent.png",
  },
  {
    title: "Real-Time Q&A",
    description: "AI handles audience questions with smart, context-aware responses, ensuring a seamless experience.",
    image: "QNA.jpg",
  },
  {
    title: "Multi-Platform Integration",
    description: "Easily integrate Google Slides, PowerPoint, PDFs, and cloud storage for smooth presentations.",
    image: "multiplatform.png",
  },
  {
    title: "AI Speech Analysis",
    description: "Track engagement metrics, voice modulation, and clarity with AI-powered analytics.",
    image: "voiceunderstand.avif",
  },
];

const ServicesPage = () => {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center px-6 py-16">
      {/* Title Section */}
      <motion.h1
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-5xl font-bold text-blue-600 text-center mb-8 p-9"
      >
        🚀 Our AI-Powered Services
      </motion.h1>

      {/* Service Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
        {services.map((service, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: index * 0.2 }}
            className="relative p-6 bg-white border border-gray-200 rounded-3xl shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-2 hover:scale-105 text-center"
          >
            {/* Service Image */}
            <img
              src={service.image}
              alt={service.title}
              className="w-32 h-32 object-cover rounded-lg mx-auto mb-4"
              onError={(e) => (e.target.src = "https://via.placeholder.com/150")}
            />

            {/* Service Title */}
            <h2 className="text-2xl font-semibold text-gray-800">{service.title}</h2>

            {/* Service Description */}
            <p className="text-gray-500 mt-2 text-md">{service.description}</p>
          </motion.div>
        ))}
      </div>

      {/* Call to Action Button */}
      <motion.a
        href="/signup"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mt-12 px-6 py-3 bg-blue-500 hover:bg-blue-700 transition-all rounded-lg shadow-lg text-lg font-semibold text-white"
      >
        Get Started Today
      </motion.a>
    </div>
  );
};

export default ServicesPage;
