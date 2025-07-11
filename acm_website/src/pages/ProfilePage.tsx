import React, { useState, useEffect } from 'react';
import '../styles/ProfilePage.css';
import { auth } from '../firebase/config';
import { EmailAuthProvider, updatePassword, deleteUser, signOut, reauthenticateWithCredential } from "firebase/auth";
import { collection, doc, getFirestore, getDoc, getDocs, query, where, deleteDoc, updateDoc } from "firebase/firestore";
import { useApp } from '../contexts/AppContext';
import UserInfoContainer from '../components/profile/UserInfoContainer';
import EventsContainer from '../components/profile/EventsContainer';
import PasswordModal from '../components/profile/PasswordModal';
import VerifyPasswordModal from '../components/profile/VerifyPasswordModal';

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
  const { user, navigateTo, error } = useApp();
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
  const [showVerifyModal, setShowVerifyModal] = useState<boolean>(false);
  const [currentPassword, setCurrentPassword] = useState<string>('');

  useEffect(() => {
    if (user) {
      const loadUserData = async () => {
        setEmail(user.email || '');
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setIsMember(userData.isMember || false);
          setIsOnMailingList(userData.isOnMailingList || false);
        }

        // get bookings
        const bookingsQuery = query(
          collection(db, "bookings"),
          where("UID", "==", user.uid)
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

        // get events attended and registered
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
      };
      
      loadUserData();
    } else {
      navigateTo('login', 'Please log in to access your profile');
    }
  }, [user, navigateTo]);

  const handleVerifyPassword = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        // Verify current password
        const credential = EmailAuthProvider.credential(user.email!, currentPassword);
        await reauthenticateWithCredential(user, credential);
        
        // If verification successful, show password change modal
        setShowVerifyModal(false);
        setCurrentPassword('');
        setPasswordError('');
        setShowPasswordModal(true);
      }
    } catch (err) {
      console.error(err);
      setPasswordError('Incorrect password. Please try again.');
    }
  };

  const handlePasswordChange = async () => {
    // validate passwords
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
        // update password
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
          // update user in database
          await updateDoc(doc(db, "users", user.uid), {
            deleted: true,
            deletedAt: new Date()
          });
          // delete user credentials
          await deleteUser(user);
          navigateTo('home');
        }
      } catch (error) {
        console.error('Error deleting account:', error);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigateTo('home');
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

    // check if user satisfies requirements
    if (eventsAttended < 3) {
      setMemberError('You must have attended at least 3 events to become a member.');
      return;
    }

    // update user in database
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
        setUpcomingBookings(prev => prev.filter(booking => booking.id !== bookingId));
      } catch (error) {
        console.error('Error deleting booking:', error);
      }
    }
  };

  return (
    <div className="profile-page page-container">
      <div className="profile-layout">
        {error && <div className="error-message">{error}</div>}

        <UserInfoContainer
          email={email}
          isMember={isMember}
          isOnMailingList={isOnMailingList}
          memberError={memberError}
          memberSuccess={memberSuccess}
          onBecomeMember={handleBecomeMember}
          onJoinMailingList={handleJoinMailingList}
          onUnsubscribeMailingList={handleUnsubscribeMailingList}
          onLogout={handleLogout}
          onDeleteAccount={handleDeleteAccount}
          onChangePassword={() => setShowVerifyModal(true)}
        />

        <EventsContainer
          title="Your Bookings"
          upcomingTitle="Upcoming Bookings"
          pastTitle="Past Bookings"
          upcomingItems={upcomingBookings}
          pastItems={pastBookings}
          renderUpcomingItem={(booking) => (
            <div className="booking-item upcoming" key={booking.id}>
              <span>
                {formatDate(booking.start)} • {formatTime(booking.start)} - {formatTime(booking.end)}
              </span>
              <button className="delete-icon" onClick={() => handleDeleteBooking(booking.id)}>
                ×
              </button>
            </div>
          )}
          renderPastItem={(booking) => (
            <div className="booking-item" key={booking.id}>
              {formatDate(booking.start)} • {formatTime(booking.start)} - {formatTime(booking.end)}
            </div>
          )}
        />

        <EventsContainer
          title="Your Events"
          upcomingTitle="Upcoming Events"
          pastTitle="Past Events"
          upcomingItems={upcomingEvents}
          pastItems={pastEvents}
          renderUpcomingItem={(event, index) => (
            <div className="event-item" key={`${event.id}-${index}`}>
              <h4 className="event-title">{event.title}</h4>
              <p className="event-date">
                {formatDate(event.date)} • {formatTime(event.date)}
              </p>
            </div>
          )}
          renderPastItem={(event, index) => (
            <div className="event-item" key={`${event.id}-${index}`}>
              <h4 className="event-title">{event.title}</h4>
              <p className="event-date">
                {formatDate(event.date)} • {formatTime(event.date)}
              </p>
            </div>
          )}
        />
      </div>

      <VerifyPasswordModal
        show={showVerifyModal}
        currentPassword={currentPassword}
        passwordError={passwordError}
        onClose={() => {
          setShowVerifyModal(false);
          setCurrentPassword('');
          setPasswordError('');
        }}
        onCurrentPasswordChange={setCurrentPassword}
        onSubmit={handleVerifyPassword}
      />

      <PasswordModal
        show={showPasswordModal}
        newPassword={newPassword}
        confirmPassword={confirmPassword}
        passwordError={passwordError}
        onClose={() => {
          setShowPasswordModal(false);
          setNewPassword('');
          setConfirmPassword('');
          setPasswordError('');
        }}
        onNewPasswordChange={setNewPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onSubmit={handlePasswordChange}
      />
    </div>
  );
};

export default ProfilePage;
