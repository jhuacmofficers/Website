import React, { useState, useEffect } from 'react';
import { auth } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

interface NavbarProps {
  navigateTo: (page: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ navigateTo }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
      setIsAdmin(user?.email === 'jhuacmweb@gmail.com');
    });
    return unsubscribe;
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 w-full bg-indigo-600 text-white py-4 px-6 shadow-md z-50">
      <div className="flex justify-end space-x-8">
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
            onClick={() => navigateTo(isAdmin ? 'admin' : isLoggedIn ? 'profile' : 'login')}
            className="font-['Mulish'] text-white hover:text-indigo-200 transition-colors cursor-pointer px-12 py-4"
          >
            {isAdmin ? 'Admin' : isLoggedIn ? 'Profile' : 'Login'}
          </span>
        </div>
    </nav>
  );
};

export default Navbar; 