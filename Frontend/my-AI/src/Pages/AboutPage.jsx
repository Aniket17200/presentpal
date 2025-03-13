import React from "react";

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center px-6 py-16 relative">
      {/* Background Effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-blue-100 opacity-50 pointer-events-none"></div>

      {/* Title */}
      <h1 className="text-5xl font-extrabold text-blue-500 mb-6 text-center drop-shadow-lg">
        Revolutionizing Presentations with AI-Powered Virtual Avatars
      </h1>

      {/* Description */}
      <p className="max-w-3xl text-lg text-gray-700 text-center mb-12 leading-relaxed">
        PresentPal enables AI-driven virtual avatars to deliver your presentations when you can't be there. Whether you’re busy, traveling, or unavailable, your AI-powered assistant ensures your message is delivered seamlessly with gestures and voice.
      </p>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 text-center">
        {[
          { title: "🎤 AI Narration", description: "Your avatar speaks with natural AI voices." },
          { title: "🤖 Virtual Avatar", description: "Customize avatars to match your personality & style." },
          { title: "📊 Live & Pre-Recorded", description: "Choose between real-time or pre-recorded presentations." },
          { title: "⚡ Gesture Sync", description: "Avatars use AI to mimic human expressions and gestures." },
          { title: "📡 Smart Q&A", description: "AI responds to audience questions in real-time." },
          { title: "🔗 Seamless Integration", description: "Works with Google Slides, PowerPoint & PDFs." },
        ].map((feature, index) => (
          <div
            key={index}
            className="p-6 bg-white/80 backdrop-blur-lg shadow-2xl rounded-2xl hover:scale-105 transition-all border border-gray-200 hover:shadow-blue-400"
          >
            <h3 className="text-2xl font-semibold text-blue-500">{feature.title}</h3>
            <p className="text-gray-700 mt-2">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* Call-to-Action */}
      <div className="mt-12">
        <a
          href="/signup"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-800 transition-all rounded-lg shadow-lg text-lg font-semibold text-white transform hover:scale-105"
        >
          Get Started
        </a>
      </div>
    </div>
  );
};

export default AboutPage;
