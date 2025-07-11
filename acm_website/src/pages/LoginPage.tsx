import React, { useState, useEffect, useCallback } from 'react';
import '../styles/LoginPage.css'; // Import the CSS file for styling
import { auth } from '../firebase/config';
import { createUserWithEmailAndPassword,
         onAuthStateChanged,
         sendPasswordResetEmail,
         signInWithEmailAndPassword } from "firebase/auth";
import { collection, doc, getDocs, getFirestore, setDoc, updateDoc } from "firebase/firestore";

interface LoginPageProps {
  navigateTo: (page: string, errorMessage?: string) => void;
  error?: string;
}

const LoginPage: React.FC<LoginPageProps> = ({ navigateTo, error }) => {

  const [userCredentials, setUserCredentials] = useState({email: '', password: ''});
  const [localError, setLocalError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Memoize credential handler
  const handleCredentials = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUserCredentials({...userCredentials, [e.target.name]: e.target.value});
  }, [userCredentials]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (error?.includes('booking')) {
          navigateTo('booking');
        } else {
          navigateTo('home');
        }
      }
    });
    return unsubscribe;
  }, [navigateTo, error]);

  // Memoize event handlers
  const handleSignup = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setIsLoading(true);
    const credentials = {...userCredentials};
    credentials.email = credentials.email.toLowerCase();

    // validate jhu email
    const domain = credentials.email.split('@')[1];
    const validDomains = ['jh.edu', 'jhu.edu', 'cs.jhu.com'];
    if (!validDomains.includes(domain)) {
      setLocalError('Error: Invalid email domain. Please use a valid JHU email.');
      setIsLoading(false);
      return;
    }
    // signup with email and password
    createUserWithEmailAndPassword(auth, credentials.email, credentials.password)
      .then(async (cred) => {
        try {
          const db = getFirestore();
          const eventsSnapshot = await getDocs(collection(db, 'events'));

          // track events attended and registered
          const attended: { eventID: string; name: string; date: unknown }[] = [];
          const registered: { eventID: string; name: string; date: unknown }[] = [];
          const updatePromises: Promise<unknown>[] = [];

          // get events and attendees
          eventsSnapshot.forEach((eventDoc) => {
            const data = eventDoc.data();
            const attendees = Array.isArray(data.attendees)
              ? [...(data.attendees as { uid?: string; email?: string }[])]
              : [];
            const regs = Array.isArray(data.registered)
              ? [...(data.registered as { uid?: string; email?: string }[])]
              : [];
            let changed = false;

            // check if user is attendee
            attendees.forEach((a) => {
              if (a.email && a.email.toLowerCase() === cred.user.email!.toLowerCase()) {
                attended.push({ eventID: eventDoc.id, name: data.name, date: data.start });
                if (a.uid !== cred.user.uid) {
                  a.uid = cred.user.uid;
                  changed = true;
                }
              }
            });

            // check if user is registered
            regs.forEach((r) => {
              if (r.email && r.email.toLowerCase() === cred.user.email!.toLowerCase()) {
                registered.push({ eventID: eventDoc.id, name: data.name, date: data.start });
                if (r.uid !== cred.user.uid) {
                  r.uid = cred.user.uid;
                  changed = true;
                }
              }
            });

            // update event in database if user is attendee or registered
            if (changed) {
              updatePromises.push(updateDoc(doc(db, 'events', eventDoc.id), { attendees, registered: regs }));
            }
          });

          // update user in database with events attended and registered
          await Promise.all([
            setDoc(doc(db, 'users', cred.user.uid), {
              email: cred.user.email,
              isMember: false,
              isOnMailingList: false,
              eventsAttended: attended,
              eventsRegistered: registered,
            }),
            ...updatePromises,
          ]);
        } catch (err) {
          console.error('Error creating user record:', err);
        }
      })
      // handle errors
      .catch((error) => {
        setLocalError(error.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [userCredentials]);

  const handleLogin = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setIsLoading(true);
    const credentials = {...userCredentials};
    credentials.email = credentials.email.toLowerCase();

    signInWithEmailAndPassword(auth, credentials.email, credentials.password)
      .then(() => {
        // Login successful
      })
      .catch((error) => {
        setLocalError(error.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [userCredentials]);

  const handlePasswordReset = useCallback((e: React.FormEvent) => {
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
  }, []);

  return (
    <div className="login-page page-container">
      <div className="login-container">
        <div className="login-box">
          <h1>Welcome</h1>
          <p className="login-description">Sign in or create an account with a JHU email address.</p>
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
                placeholder="Email Address"
                name="email"
                onChange={handleCredentials}
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                type="password"
                id="password"
                placeholder="Password"
                name="password"
                onChange={handleCredentials}
                required
              />
            </div>
            <div className="button-group">
              <button 
                className="login-button" 
                onClick={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
              <button 
                className="signup-button" 
                onClick={handleSignup}
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
            <p onClick={handlePasswordReset} className="forgot-password">
              Forgot your password?
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;