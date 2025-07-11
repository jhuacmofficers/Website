import React, { useState, useEffect } from 'react';
import '../styles/LoginPage.css';
import { auth } from '../firebase/config';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, User } from "firebase/auth";
import { registerUser, migrateUserData } from '../api';

interface LoginPageProps {
  navigateTo: (page: string, errorMessage?: string) => void;
  error?: string;
}

const LoginPage: React.FC<LoginPageProps> = ({ navigateTo, error }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in, migrate their data if needed and navigate to profile
        try {
          await migrateUserData();
          navigateTo('profile', 'Welcome back!');
        } catch (error) {
          console.error('Error during user migration:', error);
          // Even if migration fails, still navigate to profile
          navigateTo('profile', 'Welcome back!');
        }
      }
    });

    return () => unsubscribe();
  }, [navigateTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);

    try {
      if (isSignUp) {
        // Sign up
        if (password !== confirmPassword) {
          setAuthError('Passwords do not match');
          return;
        }

        if (password.length < 6) {
          setAuthError('Password must be at least 6 characters long');
          return;
        }

        // Create user with Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Register user in our backend
        await registerUser({
          email: email,
          firstName: '',
          lastName: '',
          discord: '',
          profilePicURL: ''
        });

        // User will be redirected by the onAuthStateChanged listener
      } else {
        // Sign in
        await signInWithEmailAndPassword(auth, email, password);
        // User will be redirected by the onAuthStateChanged listener
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      
      // Handle specific Firebase auth errors
      switch (error.code) {
        case 'auth/user-not-found':
          setAuthError('No account found with this email. Please sign up first.');
          break;
        case 'auth/wrong-password':
          setAuthError('Incorrect password. Please try again.');
          break;
        case 'auth/email-already-in-use':
          setAuthError('An account with this email already exists. Please sign in instead.');
          break;
        case 'auth/invalid-email':
          setAuthError('Please enter a valid email address.');
          break;
        case 'auth/weak-password':
          setAuthError('Password should be at least 6 characters long.');
          break;
        case 'auth/too-many-requests':
          setAuthError('Too many failed attempts. Please try again later.');
          break;
        default:
          setAuthError(error.message || 'An error occurred during authentication');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setAuthError('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>{isSignUp ? 'Join ACM' : 'Sign In'}</h1>
          <p>
            {isSignUp 
              ? 'Create an account to access ACM events and resources' 
              : 'Welcome back to ACM'}
          </p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {authError && (
          <div className="error-message">
            {authError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              disabled={loading}
              minLength={6}
            />
          </div>

          {isSignUp && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm your password"
                disabled={loading}
                minLength={6}
              />
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              className="toggle-mode-button"
              onClick={toggleMode}
              disabled={loading}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>

        <div className="login-info">
          <h3>Why join ACM?</h3>
          <ul>
            <li>Access to exclusive workshops and tech talks</li>
            <li>Networking opportunities with industry professionals</li>
            <li>Book the ACM lounge for study sessions</li>
            <li>Participate in hackathons and coding competitions</li>
            <li>Connect with like-minded computer science students</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;