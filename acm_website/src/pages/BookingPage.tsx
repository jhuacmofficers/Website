import React, { useState, useEffect } from 'react';
import '../styles/BookingPage.css';
import { auth } from '../firebase/config';
import { onAuthStateChanged, User } from "firebase/auth";
import { getUserProfile, getWeeklyBookings, getDailyBookings, createBooking } from '../api';

interface BookingPageProps {
  navigateTo: (page: string, errorMessage?: string) => void;
  error?: string;
}

interface BookingData {
  start: string;
  end: string;
}

const BookingPage: React.FC<BookingPageProps> = ({ navigateTo, error }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [week, setWeek] = useState<[Date, Date][]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');
  const [selectedEndTime, setSelectedEndTime] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');
  const [bookingLoading, setBookingLoading] = useState(false);

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
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadWeeklyBookings = async () => {
      try {
        const response = await getWeeklyBookings();
        const bookings = response.bookings || [];
        const weekData: [Date, Date][] = bookings.map((booking: BookingData) => [
          new Date(booking.start),
          new Date(booking.end)
        ]);
        setWeek(weekData);
      } catch (error) {
        console.error('Error loading weekly bookings:', error);
      }
    };

    loadWeeklyBookings();
  }, []);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedStartTime('');
    setSelectedEndTime('');
  };

  const handleBooking = async () => {
    if (!user) {
      navigateTo('login', 'Please log in to make a booking');
      return;
    }

    if (!isMember) {
      alert('Only ACM members can book the lounge. Please join ACM first.');
      return;
    }

    if (!selectedDate || !selectedStartTime || !selectedEndTime) {
      alert('Please select a date and time for your booking.');
      return;
    }

    // Create start and end date objects
    const startTime = new Date(selectedDate);
    const [startHours, startMinutes] = selectedStartTime.split(':').map(Number);
    startTime.setHours(startHours, startMinutes, 0, 0);

    const endTime = new Date(selectedDate);
    const [endHours, endMinutes] = selectedEndTime.split(':').map(Number);
    endTime.setHours(endHours, endMinutes, 0, 0);

    // Validate time selection
    if (endTime <= startTime) {
      alert('End time must be after start time.');
      return;
    }

    // Check if booking is in the future
    if (startTime <= new Date()) {
      alert('Booking time must be in the future.');
      return;
    }

    setBookingLoading(true);
    try {
      // Check for existing bookings on this date
      const dailyBookingsResponse = await getDailyBookings(selectedDate.toISOString());
      const existingBookings = dailyBookingsResponse.bookings || [];

      if (existingBookings.length > 0) {
        alert('You already have a booking on this date. Only one booking per day is allowed.');
        return;
      }

      // Create the booking
      await createBooking({
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        purpose: purpose
      });

      alert('Booking created successfully!');
      
      // Reset form
      setSelectedDate(null);
      setSelectedStartTime('');
      setSelectedEndTime('');
      setPurpose('');
      
      // Refresh weekly bookings
      const response = await getWeeklyBookings();
      const bookings = response.bookings || [];
      const weekData: [Date, Date][] = bookings.map((booking: BookingData) => [
        new Date(booking.start),
        new Date(booking.end)
      ]);
      setWeek(weekData);
      
    } catch (error) {
      console.error('Error creating booking:', error);
      alert(`Failed to create booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setBookingLoading(false);
    }
  };

  const isDateAvailable = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if date is in the future
    if (date < today) return false;
    
    // Check if there are any bookings on this date
    return !week.some(([start, end]) => {
      const bookingDate = new Date(start);
      bookingDate.setHours(0, 0, 0, 0);
      return bookingDate.getTime() === date.getTime();
    });
  };

  const generateTimeSlots = (): string[] => {
    const slots: string[] = [];
    for (let hour = 9; hour <= 21; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < 21) {
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }
    return slots;
  };

  const generateCalendar = (): React.JSX.Element[] => {
    const today = new Date();
    const days: React.JSX.Element[] = [];
    
    // Generate next 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const available = isDateAvailable(date);
      const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
      
      days.push(
        <div
          key={date.toDateString()}
          className={`calendar-day ${available ? 'available' : 'unavailable'} ${isSelected ? 'selected' : ''}`}
          onClick={() => available && handleDateSelect(date)}
        >
          <div className="day-number">{date.getDate()}</div>
          <div className="day-name">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
          <div className="day-month">{date.toLocaleDateString('en-US', { month: 'short' })}</div>
        </div>
      );
    }
    
    return days;
  };

  if (loading) {
    return (
      <div className="booking-page">
        <div className="booking-container">
          <h1>Loading...</h1>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="booking-page">
        <div className="booking-container">
          <div className="booking-header">
            <h1>ACM Lounge Booking</h1>
            <p>Please log in to book the ACM lounge.</p>
          </div>
          <button 
            className="login-button"
            onClick={() => navigateTo('login', 'Please log in to book the lounge')}
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="booking-page">
        <div className="booking-container">
          <div className="booking-header">
            <h1>ACM Lounge Booking</h1>
            <p>Only ACM members can book the lounge. Please join ACM first.</p>
          </div>
          <button 
            className="join-button"
            onClick={() => navigateTo('profile', 'Please join ACM to book the lounge')}
          >
            Join ACM
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-page">
      <div className="booking-container">
        <div className="booking-header">
          <h1>ACM Lounge Booking</h1>
          <p>Book the ACM lounge for your projects, study sessions, or meetings.</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="booking-content">
          <section className="calendar-section">
            <h2>Select a Date</h2>
            <div className="calendar-grid">
              {generateCalendar()}
            </div>
            <div className="calendar-legend">
              <div className="legend-item">
                <div className="legend-color available"></div>
                <span>Available</span>
              </div>
              <div className="legend-item">
                <div className="legend-color unavailable"></div>
                <span>Unavailable</span>
              </div>
            </div>
          </section>

          {selectedDate && (
            <section className="time-section">
              <h2>Select Time for {selectedDate.toLocaleDateString()}</h2>
              <div className="time-inputs">
                <div className="time-input-group">
                  <label>Start Time:</label>
                  <select
                    value={selectedStartTime}
                    onChange={(e) => setSelectedStartTime(e.target.value)}
                  >
                    <option value="">Select start time</option>
                    {generateTimeSlots().map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
                <div className="time-input-group">
                  <label>End Time:</label>
                  <select
                    value={selectedEndTime}
                    onChange={(e) => setSelectedEndTime(e.target.value)}
                  >
                    <option value="">Select end time</option>
                    {generateTimeSlots().map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="purpose-input">
                <label>Purpose (optional):</label>
                <textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="What will you be using the lounge for?"
                  rows={3}
                />
              </div>
            </section>
          )}

          {selectedDate && selectedStartTime && selectedEndTime && (
            <section className="booking-summary">
              <h2>Booking Summary</h2>
              <div className="summary-details">
                <p><strong>Date:</strong> {selectedDate.toLocaleDateString()}</p>
                <p><strong>Time:</strong> {selectedStartTime} - {selectedEndTime}</p>
                {purpose && <p><strong>Purpose:</strong> {purpose}</p>}
              </div>
              <button
                className="book-button"
                onClick={handleBooking}
                disabled={bookingLoading}
              >
                {bookingLoading ? 'Creating Booking...' : 'Book Lounge'}
              </button>
            </section>
          )}
        </div>

        <section className="booking-info">
          <h2>Booking Information</h2>
          <ul>
            <li>Only ACM members can book the lounge</li>
            <li>One booking per day per member</li>
            <li>Bookings are available from 9:00 AM to 9:30 PM</li>
            <li>Please cancel your booking if you won't be using the lounge</li>
            <li>Respect the space and clean up after yourself</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default BookingPage; 