import React, { useState, useEffect } from 'react';
import './../styles/LoginPage.css'; // Reuse the login page styling
import { auth } from '../firebase/config';
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getFirestore, setDoc, Timestamp, query, where, getDocs, getDoc } from "firebase/firestore";
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: "AIzaSyDSyFrdpgHmHKHCIgbdXJiOkX2TOvDlkKE",
  authDomain: "acm-website-25a8a.firebaseapp.com",
  projectId: "acm-website-25a8a",
  storageBucket: "acm-website-25a8a.firebasestorage.app",
  messagingSenderId: "231551202058",
  appId: "1:231551202058:web:b3c0182f283fa6068280f3",
  measurementId: "G-W01JXMQ1JK"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface BookingPageProps {
  navigateTo: (page: string, errorMessage?: string) => void;
  error?: string;
}

interface TimeSlot {
  hour: number;
  minute: number;
  label: string;
}

const BookingPage: React.FC<BookingPageProps> = ({ navigateTo, error }) => {
  const [startTime, setStartTime] = useState<Date>(() => {
    const date = new Date();
    date.setHours(9, 0, 0, 0);
    return date;
  });
  const [endTime, setEndTime] = useState<Date>(() => {
    const date = new Date();
    date.setHours(10, 0, 0, 0);
    return date;
  });
  const [dates, setDates] = useState<Date[]>([]);
  const [week, setWeek] = useState<Date[][]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [bookingError, setBookingError] = useState<string>('');
  const [bookingSuccess, setBookingSuccess] = useState<string>('');
  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [showMembershipPrompt, setShowMembershipPrompt] = useState<boolean>(false);

  // Initial auth check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setIsMember(userDoc.data().isMember || false);
        } else {
          setIsMember(false);
        }
      } else {
        navigateTo('login', 'Please log in to access the booking page');
      }
    });
    return unsubscribe;
  }, [navigateTo]);

  // Generate time slots for dropdowns
  useEffect(() => {
    const slots: TimeSlot[] = [];
    // Start time slots (12 AM to 11:30 PM)
    for (let hour = 0; hour < 24; hour++) {
      for (const minute of [0, 30]) {
        const time = new Date();
        time.setHours(hour, minute, 0, 0);
        slots.push({
          hour,
          minute,
          label: time.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
          })
        });
      }
    }
    setTimeSlots(slots);
  }, []);

  // Generate next 7 days
  useEffect(() => {
    const nextSevenDays: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      nextSevenDays.push(date);
    }
    setDates(nextSevenDays);
  }, []);

  useEffect(() => {
    // get bookings for the current week
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const q = query(collection(db, "bookings"), 
      where("start", ">=", Timestamp.fromDate(today)), 
      where("start", "<=", Timestamp.fromDate(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000))));
    getDocs(q).then((querySnapshot) => {
      setWeek(querySnapshot.docs.map((doc) => [doc.data().start.toDate(), doc.data().end.toDate()]));
    });
  }, []);

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIndex = parseInt(e.target.value);
    const newDate = dates[selectedIndex];
    
    // Update both start and end times with the new date
    const newStartTime = new Date(startTime);
    newStartTime.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
    setStartTime(newStartTime);

    const newEndTime = new Date(endTime);
    newEndTime.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
    setEndTime(newEndTime);
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [hours, minutes] = e.target.value.split(':').map(Number);
    const newStartTime = new Date(startTime);
    newStartTime.setHours(hours, minutes, 0, 0);
    setStartTime(newStartTime);
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [hours, minutes] = e.target.value.split(':').map(Number);
    const newEndTime = new Date(endTime);
    newEndTime.setHours(hours, minutes, 0, 0);
    setEndTime(newEndTime);
  };

  const validateBookingTimes = async (): Promise<boolean> => {
    // Reset error message
    setBookingError('');

    // Check if start time is after end time
    if (startTime >= endTime) {
      setBookingError('End time must be after start time');
      return false;
    }

    // Check if booking duration is more than 2 hours
    const durationInHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    if (durationInHours > 2) {
      setBookingError('Booking duration cannot exceed 2 hours');
      return false;
    }

    // Check if user already has a booking on this day
    if (auth.currentUser) {
      const startOfDay = new Date(startTime);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startTime);
      endOfDay.setHours(23, 59, 59, 999);

      const q = query(
        collection(db, "bookings"),
        where("UID", "==", auth.currentUser.uid),
        where("start", ">=", Timestamp.fromDate(startOfDay)),
        where("start", "<=", Timestamp.fromDate(endOfDay))
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setBookingError('You already have a booking on this day');
        return false;
      }
    }

    // Check if any part of the requested time slot is already booked
    const checkTime = new Date(startTime);
    while (checkTime < endTime) {
      if (isTimeSlotBooked(
        checkTime,
        checkTime.getHours(),
        checkTime.getMinutes()
      )) {
        setBookingError('This time slot overlaps with an existing booking');
        return false;
      }
      // Check every 30 minutes
      checkTime.setMinutes(checkTime.getMinutes() + 30);
    }

    return true;
  };

  const handleBooking = async () => {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      // Reset messages
      setBookingError('');
      setBookingSuccess('');
      setShowMembershipPrompt(false);

      if (isMember === false) {
        setBookingError('You must be an ACM member to book a meeting.');
        setShowMembershipPrompt(true);
        return;
      }

      // Validate booking times before proceeding
      if (!(await validateBookingTimes())) {
        return;
      }

      await setDoc(doc(db, "bookings", auth.currentUser.uid + startTime.toDateString()), {
        UID: auth.currentUser.uid,
        start: Timestamp.fromDate(startTime),
        end: Timestamp.fromDate(endTime)
      });

      setBookingSuccess('Room successfully booked!');
      console.log('Booking:', {
        startTime,
        endTime
      });
    } catch (error) {
      console.error('Error booking:', error);
      setBookingError('Failed to create booking. Please try again.');
    }
  };

  const isTimeSlotBooked = (date: Date, hour: number, minute: number): boolean => {
    const slotTime = new Date(date);
    slotTime.setHours(hour, minute, 0, 0);
    
    return week.some(([start, end]) => {
      const slotStart = new Date(slotTime);
      const slotEnd = new Date(slotTime);
      slotEnd.setMinutes(slotEnd.getMinutes() + 30); // Each slot is 30 minutes
      
      return (
        ((slotStart >= start && 
        slotStart < end) || // Check if slot starts during a booking
        (slotEnd > start &&
        slotEnd <= end)) && // Check if slot ends during a booking
        date.getDate() === start.getDate() && 
        date.getMonth() === start.getMonth() && 
        date.getFullYear() === start.getFullYear()
      );
    });
  };

  return (
    <div className="login-page">
      <div className="about-background" style={{ zIndex: -1 }}></div>
      <div className="login-container">
        <div className="login-box" style={{ width: '80vw', maxWidth: '1200px' }}>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <div style={{ flex: 0.8 }}>
              <h2 style={{ marginBottom: '10px', color: '#333' }}>Select Date and Time</h2>
              {/* date selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <select 
                  value={dates.findIndex(date => 
                    date.getDate() === startTime.getDate() && 
                    date.getMonth() === startTime.getMonth() && 
                    date.getFullYear() === startTime.getFullYear()
                  )} 
                  onChange={handleDateChange}
                  style={{
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ced4da',
                    fontSize: '1rem',
                    width: '100%'
                  }}
                >
                  {dates.map((date, index) => (
                    <option key={index} value={index}>
                      {formatDate(date)}
                    </option>
                  ))}
                </select>

                {/* start time selection */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select 
                    value={`${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`}
                    onChange={handleStartTimeChange}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #ced4da',
                      fontSize: '1rem'
                    }}
                  >
                    {timeSlots.map((slot, index) => (
                      <option 
                        key={index} 
                        value={`${slot.hour.toString().padStart(2, '0')}:${slot.minute.toString().padStart(2, '0')}`}
                      >
                        {slot.label}
                      </option>
                    ))}
                  </select>

                  {/* end time selection */}
                  <select 
                    value={`${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`}
                    onChange={handleEndTimeChange}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #ced4da',
                      fontSize: '1rem'
                    }}
                  >
                    {timeSlots.map((slot, index) => {
                      // For end time, we want to show times from 12:30 AM to 12:00 AM
                      const nextSlot = timeSlots[(index + 1) % timeSlots.length];
                      const displayTime = nextSlot ? 
                        `${slot.hour.toString().padStart(2, '0')}:${slot.minute.toString().padStart(2, '0')}` :
                        '24:00';
                      return (
                        <option key={index} value={displayTime}>
                          {slot.label}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Error and success message display */}
                {(bookingError || bookingSuccess) && (
                  <div
                    style={{
                      color: bookingError ? '#dc3545' : '#28a745',
                      fontSize: '0.875rem',
                      marginTop: '8px',
                      padding: '8px',
                      backgroundColor: bookingError ? '#f8d7da' : '#d4edda',
                      border: `1px solid ${bookingError ? '#f5c6cb' : '#c3e6cb'}`,
                      borderRadius: '4px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <span>{bookingError || bookingSuccess}</span>
                    {showMembershipPrompt && (
                      <button
                        className="login-button"
                        onClick={() => navigateTo('profile')}
                        style={{ alignSelf: 'flex-start' }}
                      >
                        Go to Profile
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* calendar view */}
            <div style={{ flex: 2.2 }}>
              <h2 style={{ marginBottom: '10px', color: '#333' }}>Calendar View</h2>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'auto repeat(7, 1fr)', // Added auto column for time labels
                gap: '2px',
                backgroundColor: '#e9ecef',
                padding: '2px',
                borderRadius: '4px'
              }}>
                {/* Time labels column */}
                <div style={{ 
                  backgroundColor: '#fff',
                  padding: '5px 2px 5px 2px',
                  borderTopLeftRadius: '4px',
                  borderBottomLeftRadius: '4px'
                }}>
                  <div style={{ 
                    height: '30px',
                    marginBottom: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    color: '#333'
                  }}>
                    Time
                  </div>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateRows: 'repeat(24, 30px)',
                    gap: '2px'
                  }}>
                    {Array.from({ length: 24 }, (_, hour) => {
                      const time = new Date();
                      time.setHours(hour, 0, 0, 0);
                      return (
                        <div 
                          key={hour}
                          style={{
                            backgroundColor: '#f8f9fa',
                            border: '1px solid #dee2e6',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            paddingRight: '8px',
                            color: '#495057',
                            height: '30px',
                            marginBottom: '1px'
                          }}
                        >
                          {time.toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            hour12: true 
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Calendar columns */}
                {dates.map((date, dayIndex) => (
                  <div key={dayIndex} style={{ textAlign: 'center', padding: '5px', backgroundColor: '#fff' }}>
                    <div style={{ 
                      fontWeight: 'bold', 
                      marginBottom: '5px',
                      color: date.toDateString() === new Date().toDateString() ? '#007bff' : '#333',
                      height: '30px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {formatDate(date)}
                    </div>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateRows: 'repeat(48, 15px)',
                      gap: '1px',
                      marginTop: '-1px'
                    }}>
                      {Array.from({ length: 48 }, (_, index) => {
                        const hour = Math.floor(index / 2);
                        const minute = (index % 2) * 30;
                        const isFullHour = minute === 0;
                        const isBooked = isTimeSlotBooked(date, hour, minute);
                        
                        return (
                          <div 
                            key={index}
                            style={{
                              backgroundColor: isBooked ? 'rgba(0, 51, 102, 1)' : '#f8f9fa',
                              border: '1px solid #dee2e6',
                              borderTop: isFullHour ? '2px solid #dee2e6' : '1px solid #dee2e6',
                              height: '15px',
                              marginTop: isFullHour ? '-1px' : '0',
                              position: 'relative',
                              cursor: isBooked ? 'not-allowed' : 'default'
                            }}
                            title={isBooked ? 'booked' : 'open'}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* booking button */}
          <button 
            className="login-button"
            style={{ marginTop: '20px' }}
            onClick={handleBooking}
          >
            Book Room
          </button>
        </div>
      </div>
      <button className="home-button" onClick={() => navigateTo('home')}>Back to Home</button>
    </div>
  );
};

export default BookingPage; 