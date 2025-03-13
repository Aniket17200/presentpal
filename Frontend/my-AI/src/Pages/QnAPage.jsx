import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const QnAPage = () => {
  const navigate = useNavigate();
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  const [isListening, setIsListening] = useState(false);
  const [question, setQuestion] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const getRecognition = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech Recognition not supported");
      return null;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    return recognition;
  };

  const fetchAudioResponse = async (question) => {
    try {
      setIsProcessing(true);
      setError(null);

      const response = await fetch("http://localhost:5100/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `API request failed with status ${response.status}`
        );
      }

      const data = await response.json();

      if (!data.audioUrl) {
        throw new Error("No audio URL returned from the server");
      }

      setAudioUrl(data.audioUrl);

      if (audioRef.current) {
        audioRef.current.src = data.audioUrl;
        audioRef.current.load();
        audioRef.current
          .play()
          .catch((err) => console.error("Playback error:", err));
      }
    } catch (error) {
      console.error("Error:", error);
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecognition = () => {
    if (isListening || isProcessing || isSpeaking) return;

    setError(null);
    setAudioUrl(null);
    setIsSpeaking(false);

    const recognition = getRecognition();
    if (!recognition) {
      setError("Speech Recognition is not supported in this browser.");
      return;
    }

    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      const result = event.results[0];
      if (result.isFinal) {
        const transcript = result[0].transcript;
        setQuestion(transcript);
        setInterimTranscript("");
        fetchAudioResponse(transcript);
      } else {
        setInterimTranscript(result[0].transcript);
      }
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => {
      console.error("Recognition error:", event);
      setIsListening(false);
      setError("Speech recognition error. Please try again.");
    };

    setIsListening(true);
    recognition.start();
  };

  return (
    <div className="relative h-screen  flex flex-col items-center justify-center text-black">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute mt-14 top-8 left-8 p-3  py-4 px-4 shadow-md rounded-2xl  bg-blue-500 transition-all transform hover:scale-105"
      >
        ← Back
      </button>

      {/* 3D Rotating Fluid Shape */}
      <button
        onClick={startRecognition}
        disabled={isListening || isProcessing || isSpeaking}
        className={`w-[30vw] h-[30vw] max-w-[300px] max-h-[300px] rounded-full shadow-lg border-0 p-0
          bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 
          shadow-cyan-500/50 transition-all duration-500 
          transform hover:scale-110 hover:rotate-12
          ${isListening ? "animate-pulse" : isProcessing ? "animate-spin" : isSpeaking ? "animate-bounce" : "animate-floating"}
        `}
      ></button>

      {/* Status Messages */}
      <div className="mt-4 text-center">
        {error ? (
          <p className="text-black">{error}</p>
        ) : isSpeaking ? (
          <>
            <p className="text-lg font-semibold  text-black">
              You asked: {question}
            </p>
            <p className=" text-black">Answering...</p>
          </>
        ) : isProcessing ? (
          <p className=" text-black">Processing your question...</p>
        ) : isListening ? (
          <p className=" text-black">Listening... {interimTranscript}</p>
        ) : (
          <p className=" text-black">Click the button to ask a question</p>
        )}
      </div>

      {/* Audio Element (Hidden) */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          autoPlay
          onPlay={() => setIsSpeaking(true)}
          onEnded={() => setIsSpeaking(false)}
          onError={() => {
            setError("Failed to play audio response");
            setIsSpeaking(false);
          }}
        />
      )}
    </div>
  );
};

export default QnAPage;
