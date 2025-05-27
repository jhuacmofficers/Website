import React, { useState, useEffect } from 'react';
import { auth } from '../firebase/config';
import { onAuthStateChanged } from "firebase/auth";
import '../styles/HomePage.css';

interface HomePageProps {
  navigateTo: (page: string, errorMessage?: string) => void;
  error?: string;
}

const HomePage: React.FC<HomePageProps> = ({ navigateTo, error }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
      setIsAdmin(user?.email === "jhuacmweb@gmail.com");
    });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 relative-z-1">
      <div className="about-background about-background-low"></div>
      
      {error && (
        <div className="error-message relative-z-2">
          {error}
        </div>
      )}
      
      <h1 className="text-4xl font-bold mb-4 text-gray-800 relative-z-2">Welcome to JHU ACM</h1>
      <p className="text-xl mb-8 text-gray-600 relative-z-2">Association for Computing Machinery</p>
      <div className="flex gap-4 relative-z-2">
        <button 
          className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          onClick={() => navigateTo('about')}
        >
          About Us
        </button>
        <button 
          className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          onClick={() => navigateTo('events')}
        >
          Events
        </button>
        <button 
          className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          onClick={() => navigateTo('booking')}
        >
          Book Lounge
        </button>
        <button 
          className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          onClick={() => navigateTo(isAdmin ? 'admin' : isLoggedIn ? 'profile' : 'login')}
        >
          {isAdmin ? 'Admin' : isLoggedIn ? 'Profile' : 'Login'}
        </button>
      </div>
      
      <div
        onClick={() => navigateTo('credits')}
        className="credits-footer"
      >
        Made with lots of ❤️ by JHU ACM
      </div>
    </div>
  );
};

export default HomePage;
