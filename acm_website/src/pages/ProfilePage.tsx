import React, { useState, useEffect } from 'react';
import '../styles/ProfilePage.css';
import { auth } from '../firebase/config';
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { getUserProfile, getUserBookings, updateUserProfile, updateUserMembership, deleteUserBooking } from '../api';

interface ProfilePageProps {
  navigateTo: (page: string, errorMessage?: string) => void;
  error?: string;
}

interface Booking {
  id: string;
  start: Date;
  end: Date;
  purpose?: string;
}

interface UserProfile {
  firstName?: string;
  lastName?: string;
  discord?: string;
  profilePicURL?: string;
  isMember?: boolean;
  isAdmin?: boolean;
  eventsAttended?: any[];
  createdAt?: { seconds: number };
}

const ProfilePage: React.FC<ProfilePageProps> = ({ navigateTo, error }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [discord, setDiscord] = useState('');
  const [profilePicURL, setProfilePicURL] = useState('');
  const [uploadingPicture, setUploadingPicture] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        try {
          // Fetch user profile and bookings from API
          const [profileResponse, bookingsResponse] = await Promise.all([
            getUserProfile(),
            getUserBookings()
          ]);
          
          setUserProfile(profileResponse);
          setBookings(bookingsResponse.bookings || []);
          
          // Set form values
          setFirstName(profileResponse.firstName || '');
          setLastName(profileResponse.lastName || '');
          setDiscord(profileResponse.discord || '');
          setProfilePicURL(profileResponse.profilePicURL || '');
        } catch (error) {
          console.error('Error fetching user data:', error);
          navigateTo('login', 'Error loading profile. Please try again.');
        } finally {
          setLoading(false);
        }
      } else {
        navigateTo('login', 'Please log in to view your profile');
      }
    });

    return () => unsubscribe();
  }, [navigateTo]);

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      await updateUserProfile({
        firstName,
        lastName,
        discord,
        profilePicURL
      });

      // Update local state
      setUserProfile((prev: UserProfile | null) => ({
        ...prev,
        firstName,
        lastName,
        discord,
        profilePicURL
      }));
      
      setEditMode(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(`Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCancelEdit = () => {
    // Reset form values
    setFirstName(userProfile?.firstName || '');
    setLastName(userProfile?.lastName || '');
    setDiscord(userProfile?.discord || '');
    setProfilePicURL(userProfile?.profilePicURL || '');
    setEditMode(false);
  };

  const handlePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingPicture(true);
    
    try {
      // Create a simple data URL for the image
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataURL = e.target?.result as string;
        setProfilePicURL(dataURL);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading picture:', error);
      alert('Failed to upload picture. Please try again.');
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleJoinACM = async () => {
    if (!user) return;

    try {
      await updateUserMembership(true);
      
      // Update local state
      setUserProfile((prev: UserProfile | null) => ({
        ...prev,
        isMember: true
      }));
      
      alert('Successfully joined ACM!');
    } catch (error) {
      console.error('Error joining ACM:', error);
      alert(`Failed to join ACM: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;

    try {
      await deleteUserBooking(bookingId);
      
      // Update local state
      setBookings((prev: Booking[]) => prev.filter((booking: Booking) => booking.id !== bookingId));
      
      alert('Booking cancelled successfully!');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert(`Failed to cancel booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigateTo('login', 'You have been logged out');
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Failed to log out. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <div className="profile-header">
            <h1>Loading Profile...</h1>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !userProfile) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <div className="profile-header">
            <h1>Profile Not Found</h1>
            <p>Unable to load profile information.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-picture">
            {profilePicURL ? (
              <img src={profilePicURL} alt="Profile" className="profile-img" />
            ) : (
              <div className="default-profile-pic">
                {(userProfile.firstName?.[0] || user.email?.[0] || 'U').toUpperCase()}
              </div>
            )}
          </div>
          <div className="profile-info">
            <h1>{userProfile.firstName && userProfile.lastName ? 
              `${userProfile.firstName} ${userProfile.lastName}` : 
              user.email}</h1>
            <p className="profile-email">{user.email}</p>
            <p className="profile-status">
              {userProfile.isMember ? 'ACM Member' : 'Not a member'}
            </p>
          </div>
          <div className="profile-actions">
            <button 
              className="edit-profile-btn"
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? 'Cancel' : 'Edit Profile'}
            </button>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {editMode ? (
          <div className="profile-edit">
            <h2>Edit Profile</h2>
            <div className="form-group">
              <label>First Name:</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your first name"
              />
            </div>
            <div className="form-group">
              <label>Last Name:</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter your last name"
              />
            </div>
            <div className="form-group">
              <label>Discord Username:</label>
              <input
                type="text"
                value={discord}
                onChange={(e) => setDiscord(e.target.value)}
                placeholder="Enter your Discord username"
              />
            </div>
            <div className="form-group">
              <label>Profile Picture:</label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePictureUpload}
                disabled={uploadingPicture}
              />
              {uploadingPicture && <p>Uploading...</p>}
            </div>
            <div className="form-actions">
              <button className="save-btn" onClick={handleSaveProfile}>
                Save Changes
              </button>
              <button className="cancel-btn" onClick={handleCancelEdit}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="profile-details">
            <h2>Profile Details</h2>
            <div className="detail-item">
              <span className="detail-label">First Name:</span>
              <span className="detail-value">{userProfile.firstName || 'Not set'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Last Name:</span>
              <span className="detail-value">{userProfile.lastName || 'Not set'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Discord:</span>
              <span className="detail-value">{userProfile.discord || 'Not set'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Member Since:</span>
              <span className="detail-value">
                {userProfile.createdAt ? new Date(userProfile.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Events Attended:</span>
              <span className="detail-value">{userProfile.eventsAttended?.length || 0}</span>
            </div>
          </div>
        )}

        {!userProfile.isMember && (
          <div className="membership-section">
            <h2>Join ACM</h2>
            <p>Become a member to access exclusive events, resources, and the ACM lounge!</p>
            <button className="join-acm-btn" onClick={handleJoinACM}>
              Join ACM
            </button>
          </div>
        )}

        <div className="bookings-section">
          <h2>My Bookings</h2>
          {bookings.length === 0 ? (
            <p className="no-bookings">You have no bookings.</p>
          ) : (
            <div className="bookings-list">
              {bookings.map((booking) => (
                <div key={booking.id} className="booking-item">
                  <div className="booking-info">
                    <div className="booking-date">
                      {booking.start.toLocaleDateString()} - {booking.start.toLocaleTimeString()} to {booking.end.toLocaleTimeString()}
                    </div>
                    {booking.purpose && (
                      <div className="booking-purpose">Purpose: {booking.purpose}</div>
                    )}
                  </div>
                  <button 
                    className="cancel-booking-btn"
                    onClick={() => handleCancelBooking(booking.id)}
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
