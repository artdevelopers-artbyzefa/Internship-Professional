import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="text-center max-w-md w-full bg-white p-8 rounded-3xl shadow-xl">
        <div className="text-secondary text-8xl font-black mb-4">404</div>
        <h1 className="text-primary text-2xl font-bold mb-4">Page Not Found</h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link 
          to="/"
          className="inline-block w-full bg-primary text-white font-bold py-3 px-6 rounded-xl hover:bg-blue-800 transition-all shadow-lg hover:shadow-primary/20 active:scale-95"
        >
          Go Back Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
