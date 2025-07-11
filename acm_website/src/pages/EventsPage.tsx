import React, { useState, useEffect } from 'react';
import { auth } from '../firebase/config';
import { onAuthStateChanged, User } from "firebase/auth";
import { getEvents, getUserProfile, registerForEvent } from '../api';
import '../styles/EventsPage.css';

interface Event {
  id: string;
  name: string;
  description: string;
  location: string;
  link: string;
  start: Date;
  end: Date;
  attendees?: { uid: string; email: string }[];
  registered?: { uid: string; email: string; name: string }[];
}

interface EventsPageProps {
  navigateTo: (page: string, errorMessage?: string) => void;
  error?: string;
}

const EventsPage: React.FC<EventsPageProps> = ({ navigateTo, error }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [registrationLoading, setRegistrationLoading] = useState<string | null>(null);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const [upcomingResponse, pastResponse] = await Promise.all([
          getEvents('upcoming'),
          getEvents('past')
        ]);

        setUpcomingEvents(upcomingResponse.events || []);
        setPastEvents(pastResponse.events || []);
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        try {
          const userProfile = await getUserProfile();
          setIsMember(userProfile.isMember || false);
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setIsMember(false);
        }
      } else {
        setUser(null);
        setIsMember(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleRegisterForEvent = async (eventID: string) => {
    if (!user) {
      navigateTo('login', 'Please log in to register for events');
      return;
    }

    if (!isMember) {
      alert('Only ACM members can register for events. Please join ACM first.');
      return;
    }

    setRegistrationLoading(eventID);
    try {
      await registerForEvent(eventID);
      alert('Successfully registered for event!');
      
      // Refresh events to show updated registration
      const [upcomingResponse, pastResponse] = await Promise.all([
        getEvents('upcoming'),
        getEvents('past')
      ]);

      setUpcomingEvents(upcomingResponse.events || []);
      setPastEvents(pastResponse.events || []);
    } catch (error) {
      console.error('Error registering for event:', error);
      alert(`Failed to register for event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRegistrationLoading(null);
    }
  };

  const isUserRegistered = (event: Event): boolean => {
    if (!user || !event.registered) return false;
    return event.registered.some(reg => reg.uid === user.uid);
  };

  const formatEventDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatEventTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const renderEvent = (event: Event, isUpcoming: boolean = false) => (
    <div key={event.id} className="event-card">
      <div className="event-header">
        <h3 className="event-title">{event.name}</h3>
        <div className="event-date">
          {formatEventDate(event.start)}
        </div>
        <div className="event-time">
          {formatEventTime(event.start)} - {formatEventTime(event.end)}
        </div>
      </div>
      
      <div className="event-content">
        {event.description && (
          <p className="event-description">{event.description}</p>
        )}
        
        {event.location && (
          <div className="event-location">
            <strong>Location:</strong> {event.location}
          </div>
        )}
        
        {event.link && (
          <div className="event-link">
            <a href={event.link} target="_blank" rel="noopener noreferrer">
              Event Link
            </a>
          </div>
        )}
        
        {event.attendees && event.attendees.length > 0 && (
          <div className="event-attendees">
            <strong>Attendees:</strong> {event.attendees.length}
          </div>
        )}
        
        {event.registered && event.registered.length > 0 && (
          <div className="event-registered">
            <strong>Registered:</strong> {event.registered.length}
          </div>
        )}
      </div>
      
      {isUpcoming && user && isMember && (
        <div className="event-actions">
          {isUserRegistered(event) ? (
            <button className="registered-btn" disabled>
              Already Registered
            </button>
          ) : (
            <button
              className="register-btn"
              onClick={() => handleRegisterForEvent(event.id)}
              disabled={registrationLoading === event.id}
            >
              {registrationLoading === event.id ? 'Registering...' : 'Register'}
            </button>
          )}
        </div>
      )}
      
      {isUpcoming && !user && (
        <div className="event-actions">
          <button 
            className="login-to-register-btn"
            onClick={() => navigateTo('login', 'Please log in to register for events')}
          >
            Login to Register
          </button>
        </div>
      )}
      
      {isUpcoming && user && !isMember && (
        <div className="event-actions">
          <button 
            className="join-to-register-btn"
            onClick={() => navigateTo('profile', 'Please join ACM to register for events')}
          >
            Join ACM to Register
          </button>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="events-page">
        <div className="events-container">
          <div className="events-header">
            <h1>Loading Events...</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="events-page">
      <div className="events-container">
        <div className="events-header">
          <h1>ACM Events</h1>
          <p className="events-subtitle">
            Join us for exciting events, workshops, and networking opportunities!
          </p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="events-content">
          <section className="events-section">
            <h2>Upcoming Events</h2>
            {upcomingEvents.length === 0 ? (
              <div className="no-events">
                <p>No upcoming events at the moment.</p>
                <p>Check back later for exciting new events!</p>
              </div>
            ) : (
              <div className="events-grid">
                {upcomingEvents.map(event => renderEvent(event, true))}
              </div>
            )}
          </section>

          <section className="events-section">
            <h2>Past Events</h2>
            {pastEvents.length === 0 ? (
              <div className="no-events">
                <p>No past events to display.</p>
              </div>
            ) : (
              <div className="events-grid">
                {pastEvents.map(event => renderEvent(event, false))}
              </div>
            )}
          </section>
        </div>

        {!user && (
          <div className="member-cta">
            <h3>Want to participate in our events?</h3>
            <p>Sign up for an account and join ACM to register for events!</p>
            <button 
              className="cta-button"
              onClick={() => navigateTo('login', '')}
            >
              Get Started
            </button>
          </div>
        )}

        {user && !isMember && (
          <div className="member-cta">
            <h3>Ready to join ACM?</h3>
            <p>Become a member to register for events and access exclusive resources!</p>
            <button 
              className="cta-button"
              onClick={() => navigateTo('profile', '')}
            >
              Join ACM
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsPage;