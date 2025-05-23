import React, { useState, useEffect } from 'react';
import { auth } from '../firebase/config';
import { onAuthStateChanged } from "firebase/auth";

interface NavbarProps {
  navigateTo: (page: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ navigateTo }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
  }, []);

  return (
    <nav className="absolute top-0 left-0 right-0 w-full h-[15vh] bg-indigo-600 text-white py-4 px-6 shadow-md z-50">
      <div className="w-full h-[15vh] flex justify-end items-end">
        <div className="flex space-x-16">
          <span 
            onClick={() => navigateTo('home')}
            className="font-['Mulish'] text-white hover:text-indigo-200 transition-colors cursor-pointer px-12 py-4"
          >
            Home
          </span>
          <span 
            onClick={() => navigateTo('events')}
            className="font-['Mulish'] text-white hover:text-indigo-200 transition-colors cursor-pointer px-12 py-4"
          >
            Events
          </span>
          <span 
            onClick={() => navigateTo('about')}
            className="font-['Mulish'] text-white hover:text-indigo-200 transition-colors cursor-pointer px-12 py-4"
          >
            About Us
          </span>
          <span 
            onClick={() => navigateTo('credits')}
            className="font-['Mulish'] text-white hover:text-indigo-200 transition-colors cursor-pointer px-12 py-4"
          >
            Credits
          </span>
          <span 
            onClick={() => navigateTo(isLoggedIn ? 'profile' : 'login')}
            className="font-['Mulish'] text-white hover:text-indigo-200 transition-colors cursor-pointer px-12 py-4"
          >
            {isLoggedIn ? 'Profile' : 'Login'}
          </span>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 