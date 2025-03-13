import React from "react";
import { motion } from "framer-motion";

const teamMembers = [
  { name: "Aniket Gaikwad", role: "Developer", email: "aniketgaikwad72002@gmail.com", image: "aniket.jpg" },
  { name: "Darpan Thakre", role: "Developer", email: "darpanthakre@gmail.com", image: "darpan1.jpg" },
  { name: "Harsh Bande", role: "Developer", email: "harshbande@gmail.com", image: "harsh.jpg" },
  { name: "Chinmaya Tiwari", role: "Developer", email: "chinmayaTiwari@gmail.com", image: "chinmaya.jpg" },
  { name: "Dipansu Shriwas ", role: "Developer", email: "DipansuShriwas@gmail.com", image: "dipansu.jpg" },
  { name: "Aditya Mankar", role: "Developer", email: "AdityaMankar@gmail.com", image: "aditya.jpg" },
  { name: "Abhinva Badwekar ", role: "Developer", email: "Abhinavabadwekar@gmail.com", image: "abhinav1.jpg" },
  { name: "Juhi pode", role: "Developer", email: "juiMeshram@gmail.com", image: "juipode.jpg" },
];

const ContactPage = () => {
  return (
    <div className="min-h-screen bg-white py-12 mt-20">
      <h1 className="text-4xl font-bold text-center text-gray-900 mb-10">Our Founder and developer</h1>

      <div className="flex flex-wrap justify-center gap-8 px-4">
        {teamMembers.map((member, index) => (
          <motion.div
            key={index}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gray-100 shadow-xl rounded-xl p-6 w-72 flex flex-col items-center transition-all"
          >
            <img src={member.image} alt={member.name} className="w-24 h-24 rounded-full shadow-md mb-4" />
            <h2 className="text-xl font-semibold text-gray-800">{member.name}</h2>
            <p className="text-gray-600">{member.role}</p>
            <a href={`mailto:${member.email}`} className="mt-3 text-blue-500 hover:underline">
              {member.email}
            </a>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ContactPage;
