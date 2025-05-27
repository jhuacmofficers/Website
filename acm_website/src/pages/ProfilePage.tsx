import React, { useState, useEffect } from 'react';
import './LoginPage.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase/config';
import { updatePassword, deleteUser, signOut } from 'firebase/auth';
import { collection, doc, getFirestore, getDoc, getDocs, query, where, deleteDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../components/AuthProvider';


interface Booking {
  id: string;
  start: Date;
  end: Date;
}

interface Event {
  id: string;
  title: string;
  date: Date;
}

interface FirestoreEvent {
  eventID: string;
  name: string;
  date: { toDate: () => Date };
}

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const error = (location.state as { message?: string })?.message;
  const [email, setEmail] = useState<string>('');
  const [isMember, setIsMember] = useState<boolean>(false);
  const [isOnMailingList, setIsOnMailingList] = useState<boolean>(false);
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [eventsAttended, setEventsAttended] = useState<number>(0);
  const [memberError, setMemberError] = useState<string>('');
  const [memberSuccess, setMemberSuccess] = useState<string>('');

  useEffect(() => {
    if (user === undefined) return;
    if (user) {
      setEmail(user.email || '');
      const db = getFirestore();
      getDoc(doc(db, 'users', user.uid)).then(async (userDoc) => {
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setIsMember(userData.isMember || false);
          setIsOnMailingList(userData.isOnMailingList || false);
        }

        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('UID', '==', user.uid)
        );
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const now = new Date();
        const bookings: Booking[] = bookingsSnapshot.docs.map(doc => ({
          id: doc.id,
          start: doc.data().start.toDate(),
          end: doc.data().end.toDate()
        }));

        setUpcomingBookings(bookings.filter(booking => booking.start > now));
        setPastBookings(bookings.filter(booking => booking.start <= now));

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const attended: Event[] = userData.eventsAttended.map((event: FirestoreEvent) => ({
            id: event.eventID,
            title: event.name,
            date: event.date.toDate(),
          }));

          const registered: Event[] = userData.eventsRegistered.map((event: FirestoreEvent) => ({
            id: event.eventID,
            title: event.name,
            date: event.date.toDate(),
          }));

          setUpcomingEvents(registered.filter(event => event.date > now));
          setPastEvents(attended.filter(event => event.date <= now));
          setEventsAttended(attended.length);
        }
      });

    } else {
      navigate('/login', { state: { message: 'Please log in to access your profile', from: location } });
    }
  }, [user, navigate, location]);

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return;
    }

    try {
      const user = auth.currentUser;
      if (user) {
        await updatePassword(user, newPassword);
        setShowPasswordModal(false);
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError('');
      }
    } catch (err) {
      console.error(err);
      setPasswordError('Failed to update password. Please try again.');
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      try {
        const user = auth.currentUser;
        if (user) {
          const db = getFirestore();
          // Update user document to mark as deleted
          await updateDoc(doc(db, "users", user.uid), {
            deleted: true,
            deletedAt: new Date()
          });
          // Delete the user account
          await deleteUser(user);
          navigate('/');
        }
      } catch (error) {
        console.error('Error deleting account:', error);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleJoinMailingList = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const db = getFirestore();
        await updateDoc(doc(db, "users", user.uid), {
          isOnMailingList: true,
        });
        setIsOnMailingList(true);
      }
    } catch (error) {
      console.error('Error joining mailing list:', error);
    }
  };

  const handleUnsubscribeMailingList = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const db = getFirestore();
        await updateDoc(doc(db, "users", user.uid), {
          isOnMailingList: false,
        });
        setIsOnMailingList(false);
      }
    } catch (error) {
      console.error('Error unsubscribing from mailing list:', error);
    }
  };

  const handleBecomeMember = async () => {
    setMemberError('');
    setMemberSuccess('');
    if (eventsAttended < 3) {
      setMemberError('You must have attended at least 3 events to become a member.');
      return;
    }
    try {
      const user = auth.currentUser;
      if (user) {
        const db = getFirestore();
        await updateDoc(doc(db, 'users', user.uid), { isMember: true });
        setIsMember(true);
        setMemberSuccess('You are now a member!');
      }
    } catch (error) {
      console.error('Error updating membership:', error);
      setMemberError('Failed to update membership status. Please try again.');
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour12: true
    });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      try {
        const db = getFirestore();
        await deleteDoc(doc(db, "bookings", bookingId));
        // Update the bookings list by filtering out the deleted booking
        setUpcomingBookings(prev => prev.filter(booking => booking.id !== bookingId));
      } catch (error) {
        console.error('Error deleting booking:', error);
      }
    }
  };

  return (
    <div className="login-page">
      <div className="about-background" style={{ zIndex: -1 }}></div>
      <div className="login-container" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '20px',
        maxWidth: '800px',
        width: '90%',
        margin: '20px auto',
        padding: '20px'
      }}>
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* User Information Container */}
        <div className="login-box" style={{ 
          width: '100%',
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ marginBottom: '5px', color: '#495057', borderBottom: '2px solid #e9ecef', paddingBottom: '5px' }}>Profile Information</h2>
          <div style={{ display: 'grid', gap: '5px', color: '#495057' }}>
            <div>
              <strong>Email:</strong> {email}
            </div>
            <div>
              <strong>ACM Member:</strong> {isMember ? 'Yes' : (
                <button
                  className="login-button"
                  onClick={handleBecomeMember}
                >
                  Become a Member
                </button>
              )}
              {(memberError || memberSuccess) && (
                <div
                  style={{
                    color: memberError ? '#dc3545' : '#28a745',
                    fontSize: '0.875rem',
                    marginTop: '5px'
                  }}
                >
                  {memberError || memberSuccess}
                </div>
              )}
            </div>
            <div>
              <strong>Mailing List:</strong> {isOnMailingList ? (
                <>
                  <button
                    className="login-button"
                    onClick={handleUnsubscribeMailingList}
                  >
                    Unsubscribe
                  </button>
                </>
              ) : (
                <button
                  className="login-button"
                  onClick={handleJoinMailingList}
                >
                  Subscribe
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button 
                className="login-button"
                onClick={() => setShowPasswordModal(true)}
              >
                Change Password
              </button>
              <button 
                className="login-button"
                onClick={handleLogout}
                style={{ backgroundColor: '#6c757d' }}
              >
                Logout
              </button>
              <button 
                className="login-button"
                onClick={handleDeleteAccount}
                style={{ backgroundColor: '#dc3545' }}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>

        {/* Bookings Container */}
        <div className="login-box" style={{ 
          width: '100%',
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ marginBottom: '20px', color: '#495057', borderBottom: '2px solid #e9ecef', paddingBottom: '10px' }}>Your Bookings</h2>
          
          {/* Upcoming Bookings */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#495057', marginBottom: '10px' }}>Upcoming Bookings</h3>
            {upcomingBookings.length > 0 ? (
              <div style={{ display: 'grid', gap: '10px' }}>
                {upcomingBookings.map(booking => (
                  <div 
                    key={booking.id}
                    style={{
                      padding: '10px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '4px',
                      border: '1px solid #dee2e6',
                      color: '#495057',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span>{formatDate(booking.start)} • {formatTime(booking.start)} - {formatTime(booking.end)}</span>
                    <button
                      onClick={() => handleDeleteBooking(booking.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#dc3545',
                        fontSize: '1.2rem',
                        cursor: 'pointer',
                        padding: '0 5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#ffebee'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#495057' }}>No upcoming bookings</p>
            )}
          </div>

          {/* Past Bookings */}
          <div>
            <h3 style={{ color: '#495057', marginBottom: '10px' }}>Past Bookings</h3>
            {pastBookings.length > 0 ? (
              <div style={{ display: 'grid', gap: '10px' }}>
                {pastBookings.map(booking => (
                  <div 
                    key={booking.id}
                    style={{
                      padding: '10px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '4px',
                      border: '1px solid #dee2e6',
                      color: '#495057'
                    }}
                  >
                    {formatDate(booking.start)} • {formatTime(booking.start)} - {formatTime(booking.end)}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#495057' }}>No past bookings</p>
            )}
          </div>
        </div>

        {/* Events Container */}
        <div className="login-box" style={{ 
          width: '100%',
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ marginBottom: '20px', color: '#495057', borderBottom: '2px solid #e9ecef', paddingBottom: '10px' }}>Your Events</h2>
          
          {/* Upcoming Events */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#495057', marginBottom: '10px' }}>Upcoming Events</h3>
            {upcomingEvents.length > 0 ? (
              <div style={{ display: 'grid', gap: '10px' }}>
                {upcomingEvents.map((event, index) => (
                  <div
                    key={`${event.id}-${index}`}
                    style={{
                      padding: '15px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '4px',
                      border: '1px solid #dee2e6'
                    }}
                  >
                    <h4 style={{ margin: '0 0 5px 0', color: '#495057' }}>{event.title}</h4>
                    <p style={{ margin: '0 0 5px 0', color: '#495057' }}>{formatDate(event.date)} • {formatTime(event.date)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#495057' }}>No upcoming events</p>
            )}
          </div>

          {/* Past Events */}
          <div>
            <h3 style={{ color: '#495057', marginBottom: '10px' }}>Past Events</h3>
            {pastEvents.length > 0 ? (
              <div style={{ display: 'grid', gap: '10px' }}>
                {pastEvents.map((event, index) => (
                  <div
                    key={`${event.id}-${index}`}
                    style={{
                      padding: '15px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '4px',
                      border: '1px solid #dee2e6'
                    }}
                  >
                    <h4 style={{ margin: '0 0 5px 0', color: '#495057' }}>{event.title}</h4>
                    <p style={{ margin: '0 0 5px 0', color: '#495057' }}>{formatDate(event.date)} • {formatTime(event.date)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#495057' }}>No past events</p>
            )}
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="login-box" style={{ width: '400px', maxWidth: '90vw' }}>
            <h3 style={{ marginBottom: '20px', color: '#333' }}>Change Password</h3>
            <div style={{ display: 'grid', gap: '15px' }}>
              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ced4da',
                  fontSize: '1rem'
                }}
              />
              <input
                type="password"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ced4da',
                  fontSize: '1rem'
                }}
              />
              {passwordError && (
                <div style={{ color: '#dc3545', fontSize: '0.875rem' }}>
                  {passwordError}
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button 
                  className="login-button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError('');
                  }}
                  style={{ backgroundColor: '#6c757d' }}
                >
                  Cancel
                </button>
                <button 
                  className="login-button"
                  onClick={handlePasswordChange}
                >
                  Change Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        className="home-button"
        onClick={() => navigate('/')}
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2
        }}
      >
        Back to Home
      </button>
    </div>
  );
};

export default ProfilePage; 