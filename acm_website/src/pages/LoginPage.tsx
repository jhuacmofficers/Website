import React, { useState } from 'react';
import './../styles/LoginPage.css';
import { auth } from '../firebase/config';
import { createUserWithEmailAndPassword,
         onAuthStateChanged,
         sendPasswordResetEmail,
         signInWithEmailAndPassword } from "firebase/auth";


interface LoginPageProps {
  navigateTo: (page: string, errorMessage?: string) => void;
  error?: string;
}

const LoginPage: React.FC<LoginPageProps> = ({ navigateTo, error }) => {

  const [userCredentials, setUserCredentials] = useState({email: '', password: ''});
  const [localError, setLocalError] = useState('');
  const handleCredentials = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserCredentials({...userCredentials, [e.target.name]: e.target.value});
  };

  onAuthStateChanged(auth, (user) => {
    if (user) {
      if (error?.includes('booking')) {
        navigateTo('booking');
      } else {
        navigateTo('home');
      }
    }
  });

  function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLocalError('');
    userCredentials.email = userCredentials.email.toLowerCase();

    // validate jhu email
    const domain = userCredentials.email.split('@')[1];
    const validDomains = ['jh.edu', 'jhu.edu', 'cs.jhu.com'];
    if (!validDomains.includes(domain)) {
      setLocalError('Error: Invalid email domain. Please use a valid JHU email.');
      return;
    }
    // signup with email and password
    createUserWithEmailAndPassword(auth, userCredentials.email, userCredentials.password)
      .then(() => {
        // Sign-up successful
      })
      // handle errors
      .catch((error) => {
        setLocalError(error.message);
    });

  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLocalError('');
    userCredentials.email = userCredentials.email.toLowerCase();

    signInWithEmailAndPassword(auth, userCredentials.email, userCredentials.password)
      .then(() => {
        // Login successful
      })
      .catch((error) => {
        setLocalError(error.message);
      });
  };

  function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    const input = prompt("Please enter your JHU email address to reset your password:");
    if (!input) {
      setLocalError("Error: No email provided.");
      return;
    }
    const email = input.toLowerCase();

    sendPasswordResetEmail(auth, email)
      .then(() => {
        alert("Password reset email sent! Please check your inbox for instructions.");
      })
      .catch((error) => {
        setLocalError(error.message);
      });
  }

  return (
    <div className="login-page">
      <div className="about-background" style={{ zIndex: -1 }}></div>
      <div className="login-container">
        <div className="login-box">
          <form onSubmit={handleLogin}>
            {(error || localError) && (
              <div className="error-message">
                {error || localError}
              </div>
            )}
            <div className="input-group">
              <label htmlFor="email" className="sr-only">Email</label>
              <input
                type="email"
                id="email"
                placeholder="EMAIL"
                name="email"
                onChange={(e) => handleCredentials(e)}
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                type="password"
                id="password"
                placeholder="PASSWORD"
                name="password"
                onChange={(e) => handleCredentials(e)}
                required
              />
            </div>
            <button className="login-button" onClick={(e) => handleLogin(e)}>LOGIN</button>
            <button className="signup-button" onClick={(e) => handleSignup(e)}>
              SIGN-UP
            </button>
            <p onClick={handlePasswordReset} className="forgot-password">Forgot password?</p>
          </form>
        </div>
      </div>
      <button className="home-button" onClick={() => navigateTo('home')}>Back to Home</button>
    </div>
  );
};

export default LoginPage;