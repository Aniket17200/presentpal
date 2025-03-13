import React from 'react';
import Background from './Background';

const HomePage = ({ user }) => {
  return (
    <div>
      <div className="absolute inset-0 z-10">
        <Background user={user} />
      </div>
      <h1 className="text-blue-950 text-3xl lg:text-4xl font-bold text-center absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
        PresentPal AI
      </h1>
    </div>
  );
};

export default HomePage;