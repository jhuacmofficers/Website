import React, { memo } from 'react';
import '../../styles/BookingPage.css';

interface CalendarViewProps {
  dates: Date[];
  isTimeSlotBooked: (date: Date, hour: number, minute: number) => boolean;
  formatDate: (date: Date) => string;
}

const CalendarView: React.FC<CalendarViewProps> = memo(({
  dates,
  isTimeSlotBooked,
  formatDate
}) => {
  return (
    <div className="calendar-view">
      <h2 className="section-title">Room Availability</h2>
      <div className="calendar-grid">
        {dates.map((date, index) => (
          <div key={index} className="calendar-day">
            <div className="calendar-date">
              <h3>{formatDate(date)}</h3>
            </div>
            <div className="time-slots">
              {Array.from({ length: 24 }, (_, hour) => (
                <div key={hour} className="time-slot-hour">
                  {[0, 30].map(minute => (
                    <div 
                      key={`${hour}-${minute}`}
                      className={`time-slot ${isTimeSlotBooked(date, hour, minute) ? 'booked' : 'available'}`}
                    >
                      {minute === 0 ? `${hour}:00` : `${hour}:30`}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

CalendarView.displayName = 'CalendarView';

export default CalendarView;
