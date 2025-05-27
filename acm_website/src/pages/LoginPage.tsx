import React, { useState } from 'react';
import '../styles/LoginPage.css'; // Import the CSS file for styling
import { auth } from '../firebase/config';
import { createUserWithEmailAndPassword,
         onAuthStateChanged,
         sendPasswordResetEmail,
         signInWithEmailAndPassword } from "firebase/auth";
import { collection, doc, getDocs, getFirestore, setDoc, updateDoc } from "firebase/firestore";
import Navbar from '../components/Navbar';


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
    <>
      <Navbar navigateTo={navigateTo} />
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
    </div>
    </>
  );
};

export default LoginPage;