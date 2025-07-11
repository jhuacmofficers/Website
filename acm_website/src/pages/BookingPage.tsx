import React, { useState, useEffect, useCallback, useMemo } from 'react';
import '../styles/BookingPage.css';
import TimeSelection from '../components/booking/TimeSelection';
import CalendarView from '../components/booking/CalendarView';
import { app, auth } from '../firebase/config';
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getFirestore, setDoc, Timestamp, query, where, getDocs, getDoc } from "firebase/firestore";

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

  // Memoize time slots generation - expensive calculation
  const timeSlots = useMemo<TimeSlot[]>(() => {
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
    return slots;
  }, []);

  // Memoize dates generation
  const nextSevenDays = useMemo<Date[]>(() => {
    const dates: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, []);

  // Update dates state when memoized value changes
  useEffect(() => {
    setDates(nextSevenDays);
  }, [nextSevenDays]);

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

  // Memoize formatDate function
  const formatDate = useCallback((date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  }, []);

  // Memoize event handlers
  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIndex = parseInt(e.target.value);
    const newDate = dates[selectedIndex];
    
    // Update both start and end times with the new date
    const newStartTime = new Date(startTime);
    newStartTime.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
    setStartTime(newStartTime);

    const newEndTime = new Date(endTime);
    newEndTime.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
    setEndTime(newEndTime);
  }, [dates, startTime, endTime]);

  const handleStartTimeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const [hours, minutes] = e.target.value.split(':').map(Number);
    const newStartTime = new Date(startTime);
    newStartTime.setHours(hours, minutes, 0, 0);
    setStartTime(newStartTime);
  }, [startTime]);

  const handleEndTimeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const [hours, minutes] = e.target.value.split(':').map(Number);
    const newEndTime = new Date(endTime);
    newEndTime.setHours(hours, minutes, 0, 0);
    setEndTime(newEndTime);
  }, [endTime]);

  const validateBookingTimes = useCallback(async (): Promise<boolean> => {
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
  }, [startTime, endTime]);

  const handleBooking = useCallback(async () => {
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

      // add booking to database
      await setDoc(doc(db, "bookings", auth.currentUser.uid + startTime.toDateString()), {
        UID: auth.currentUser.uid,
        start: Timestamp.fromDate(startTime),
        end: Timestamp.fromDate(endTime)
      });

      setBookingSuccess('Room successfully booked!');
    } catch (error) {
      console.error('Error booking:', error);
      setBookingError('Failed to create booking. Please try again.');
    }
  }, [isMember, startTime, endTime, validateBookingTimes]);

  // Memoize isTimeSlotBooked function
  const isTimeSlotBooked = useCallback((date: Date, hour: number, minute: number): boolean => {
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
  }, [week]);

  return (
    <div className="booking-page">
      <div className="booking-layout">
        <div className="page-header">
          <h1 className="page-title">Room Booking</h1>
          <p className="page-subtitle">Schedule a time to use the ACM Lounge in Malone Hall</p>
        </div>

        {error && (
          <div className="booking-section error-section">
            <div className="error-message">{error}</div>
          </div>
        )}

        <div className="booking-content">
          <div className="booking-section time-selection-section">
            <TimeSelection
              dates={dates}
              startTime={startTime}
              endTime={endTime}
              timeSlots={timeSlots}
              bookingError={bookingError}
              bookingSuccess={bookingSuccess}
              showMembershipPrompt={showMembershipPrompt}
              onDateChange={handleDateChange}
              onStartTimeChange={handleStartTimeChange}
              onEndTimeChange={handleEndTimeChange}
              onBooking={handleBooking}
              navigateTo={navigateTo}
              formatDate={formatDate}
            />
          </div>

          <div className="booking-section calendar-section">
            <CalendarView
              dates={dates}
              isTimeSlotBooked={isTimeSlotBooked}
              formatDate={formatDate}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage; 