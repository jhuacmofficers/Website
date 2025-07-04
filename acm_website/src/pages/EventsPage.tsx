import React, { useState, useEffect } from 'react';
import { getFirestore, query, collection, where, Timestamp, orderBy, getDocs } from 'firebase/firestore';
import '../styles/EventsPage.css';

interface EventsPageProps {
  navigateTo: (page: string, errorMessage?: string) => void;
  error?: string;
}

interface Event {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  description: string;
}

const EventsPage: React.FC<EventsPageProps> = ({ navigateTo, error }) => {
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const db = getFirestore();

  const fetchUpcomingEvents = async () => {
    const upcomingEventsQuery = query(collection(db, "events"), where("start", ">=", Timestamp.now()), orderBy("start", "desc"));
    const upcomingEventsSnapshot = await getDocs(upcomingEventsQuery);
    const upcomingEvents: Event[] = upcomingEventsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.name || 'Untitled Event',
        date: data.start ? data.start.toDate().toLocaleDateString() : 'TBD',
        start_time: data.start ? data.start.toDate().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }) : 'TBD',
        end_time: data.end ? data.end.toDate().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }) : 'TBD',
        location: data.location || 'TBD',
        description: data.description || '',
      };
    });
    setUpcomingEvents(upcomingEvents);
  }

  const fetchPastEvents = async () => {
    const pastEventsQuery = query(collection(db, "events"), where("start", "<", Timestamp.now()), orderBy("start", "desc"));
    const pastEventsSnapshot = await getDocs(pastEventsQuery);
    const pastEvents: Event[] = pastEventsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.name || 'Untitled Event',
        date: data.start ? data.start.toDate().toLocaleDateString() : 'TBD',
        start_time: data.start ? data.start.toDate().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }) : 'TBD',
        end_time: data.end ? data.end.toDate().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }) : 'TBD',
        location: data.location || 'TBD',
        description: data.description || '',
      };
    });
    setPastEvents(pastEvents);
  }

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        await fetchUpcomingEvents();
        await fetchPastEvents();
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [db]);

  if (loading) {
    return (
      <div className="events-container">
        <div className="about-background" style={{ zIndex: -1 }}></div>
        <h1 className="events-title">Loading Events...</h1>
      </div>
    );
  }

  return (
    <div className="events-container">
      <div className="about-background" style={{ zIndex: -1 }}></div>
      {error && (
        <div className="error-message" style={{ position: 'relative', zIndex: 2 }}>
          {error}
        </div>
      )}
      <h1 className="events-title">Upcoming Events</h1>
      <div className="events-list">
        {upcomingEvents.length === 0 ? (
          <div className="no-events-message">
            <p>No upcoming events at the moment.</p>
            <p>Check back soon for new events!</p>
          </div>
        ) : (
          upcomingEvents.map(event => (
            <div key={event.id} className="event-card">
              <h2 className="event-title">{event.title}</h2>
              <div className="event-details">
                <p><strong>Date:</strong> {event.date}</p>
                <p><strong>Time:</strong> {event.start_time} - {event.end_time}</p>
                <p><strong>Location:</strong> {event.location}</p>
              </div>
              <p className="event-description">{event.description}</p>
              <button className="event-button">RSVP</button>
            </div>
          ))
        )}
      </div>

      {/* Past Events */}
      <h1 className="events-title">Past Events</h1>
      <div className="events-list">
        {pastEvents.map(event => (
          <div key={event.id} className="event-card" style={{ backgroundColor: 'rgba(220, 220, 220, 0.8)' }}>
            <h2 className="event-title">{event.title}</h2>
            <div className="event-details">
              <p><strong>Date:</strong> {event.date}</p>
              <p><strong>Time:</strong> {event.start_time} - {event.end_time}</p>
              <p><strong>Location:</strong> {event.location}</p>
            </div>
            <p className="event-description">{event.description}</p>
          </div>
        ))}
      </div>
      <button className="home-button" onClick={() => navigateTo('home')} style={{ position: 'relative', zIndex: 2 }}>Back to Home</button>
      
      <div className="credits" onClick={() => navigateTo('credits')}>
        Made with lots of ❤️ by JHU ACM
      </div>
    </div>
  );
};

export default EventsPage;