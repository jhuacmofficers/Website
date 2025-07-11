import React, { memo, useCallback } from 'react';
import '../../styles/AdminPage.css';

interface CreateEventProps {
  eventTitle: string;
  setEventTitle: (v: string) => void;
  eventDescription: string;
  setEventDescription: (v: string) => void;
  eventLocation: string;
  setEventLocation: (v: string) => void;
  eventLink: string;
  setEventLink: (v: string) => void;
  eventStartDate: string;
  setEventStartDate: (v: string) => void;
  eventStartTime: string;
  setEventStartTime: (v: string) => void;
  eventEndDate: string;
  setEventEndDate: (v: string) => void;
  eventEndTime: string;
  setEventEndTime: (v: string) => void;
  handleCreateEvent: (e: React.FormEvent) => void;
}

const CreateEvent: React.FC<CreateEventProps> = memo(({
  eventTitle,
  setEventTitle,
  eventDescription,
  setEventDescription,
  eventLocation,
  setEventLocation,
  eventLink,
  setEventLink,
  eventStartDate,
  setEventStartDate,
  eventStartTime,
  setEventStartTime,
  eventEndDate,
  setEventEndDate,
  eventEndTime,
  setEventEndTime,
  handleCreateEvent
}) => {
  // Memoize change handlers to prevent unnecessary re-renders
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEventTitle(e.target.value);
  }, [setEventTitle]);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEventDescription(e.target.value);
  }, [setEventDescription]);

  const handleLocationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEventLocation(e.target.value);
  }, [setEventLocation]);

  const handleLinkChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEventLink(e.target.value);
  }, [setEventLink]);

  const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEventStartDate(e.target.value);
  }, [setEventStartDate]);

  const handleStartTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEventStartTime(e.target.value);
  }, [setEventStartTime]);

  const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEventEndDate(e.target.value);
  }, [setEventEndDate]);

  const handleEndTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEventEndTime(e.target.value);
  }, [setEventEndTime]);

  return (
    <>
      <h2 className="admin-header">Create New Event</h2>
      <form onSubmit={handleCreateEvent} className="admin-form">
        <input
          type="text"
          placeholder="Event Title"
          value={eventTitle}
          onChange={handleTitleChange}
          required
          className="admin-input"
        />
        <textarea
          placeholder="Event Description"
          value={eventDescription}
          onChange={handleDescriptionChange}
          required
          className="admin-textarea"
        />
        <input
          type="text"
          placeholder="Location"
          value={eventLocation}
          onChange={handleLocationChange}
          required
          className="admin-input"
        />
        <input
          type="url"
          placeholder="Event Link (optional)"
          value={eventLink}
          onChange={handleLinkChange}
          className="admin-input"
        />
        <div className="admin-grid2">
          <div>
            <label className="admin-label">Start Date</label>
            <input
              type="date"
              value={eventStartDate}
              onChange={handleStartDateChange}
              required
              className="admin-datetime"
            />
          </div>
          <div>
            <label className="admin-label">Start Time</label>
            <input
              type="time"
              value={eventStartTime}
              onChange={handleStartTimeChange}
              required
              className="admin-datetime"
            />
          </div>
        </div>
        <div className="admin-grid2">
          <div>
            <label className="admin-label">End Date</label>
            <input
              type="date"
              value={eventEndDate}
              onChange={handleEndDateChange}
              required
              className="admin-datetime"
            />
          </div>
          <div>
            <label className="admin-label">End Time</label>
            <input
              type="time"
              value={eventEndTime}
              onChange={handleEndTimeChange}
              required
              className="admin-datetime"
            />
          </div>
        </div>
        <button type="submit" className="admin-btn primary w-full mt-10">Create Event</button>
      </form>
    </>
  );
});

CreateEvent.displayName = 'CreateEvent';

export default CreateEvent;
