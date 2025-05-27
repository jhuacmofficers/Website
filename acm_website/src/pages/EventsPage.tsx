import React from 'react';
import '../styles/EventsPage.css';

interface EventsPageProps {
  navigateTo: (page: string, errorMessage?: string) => void;
  error?: string;
}

const EventsPage: React.FC<EventsPageProps> = ({ navigateTo, error }) => {
  // Sample events data - in a real app, this would come from an API or database
  const events = [
    {
      id: 1,
      title: "Intro to Machine Learning Workshop",
      date: "October 15, 2023",
      time: "3:00 PM - 5:00 PM",
      location: "Computer Science Building, Room 105",
      description: "Learn the basics of machine learning algorithms and how to implement them."
    },
    {
      id: 2,
      title: "Hackathon Prep Session",
      date: "October 22, 2023",
      time: "4:00 PM - 6:00 PM",
      location: "Student Union, Room 302",
      description: "Get ready for the upcoming hackathon with tips, tricks, and team formation."
    },
    {
      id: 3,
      title: "Tech Industry Panel",
      date: "November 5, 2023",
      time: "5:30 PM - 7:30 PM",
      location: "Virtual (Zoom)",
      description: "Join us for a Q&A session with professionals from leading tech companies."
    }
  ];

  return (
    <div className="events-container relative-z-1">
      <div className="about-background about-background-low"></div>
      {error && (
        <div className="error-message relative-z-2">
          {error}
        </div>
      )}
      <h1 className="events-title relative-z-2">Upcoming Events</h1>
      <div className="events-list relative-z-2">
        {events.map(event => (
          <div key={event.id} className="event-card relative-z-2">
            <h2 className="event-title">{event.title}</h2>
            <div className="event-details">
              <p><strong>Date:</strong> {event.date}</p>
              <p><strong>Time:</strong> {event.time}</p>
              <p><strong>Location:</strong> {event.location}</p>
            </div>
            <p className="event-description">{event.description}</p>
            <button className="event-button">RSVP</button>
          </div>
        ))}
      </div>
      <button className="home-button relative-z-2" onClick={() => navigateTo('home')}>Back to Home</button>
      
      <div
        onClick={() => navigateTo('credits')}
        className="credits-footer"
      >
        Made with lots of ❤️ by JHU ACM
      </div>
    </div>
  );
};

export default EventsPage;
