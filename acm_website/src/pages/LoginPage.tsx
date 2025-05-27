import React, { useState, useEffect } from 'react';
import './LoginPage.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase/config';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '../components/AuthProvider';


const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const state = location.state as { from?: { pathname: string }; message?: string } | null;
  const from = state?.from?.pathname || '/';
  const initialMessage = state?.message;

  const [userCredentials, setUserCredentials] = useState({email: '', password: ''});
  const [localError, setLocalError] = useState('');
  const handleCredentials = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserCredentials({...userCredentials, [e.target.name]: e.target.value});
  };

  const [localError, setLocalError] = useState(initialMessage || '');

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

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
            {localError && (
              <div className="error-message">
                {localError}
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
      <button className="home-button" onClick={() => navigate('/')}>Back to Home</button>
    </div>
  );
};

export default LoginPage;