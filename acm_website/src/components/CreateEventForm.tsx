import React, { useState } from 'react';
import './../styles/LoginPage.css';

interface Props {
  onCreate: (data: {
    title: string;
    description: string;
    location: string;
    link: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
  }) => void;
}

const CreateEventForm: React.FC<Props> = ({ onCreate }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [link, setLink] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      title,
      description,
      location,
      link,
      startDate,
      startTime,
      endDate,
      endTime,
    });
    setTitle('');
    setDescription('');
    setLocation('');
    setLink('');
    setStartDate('');
    setStartTime('');
    setEndDate('');
    setEndTime('');
  };

  return (
    <div className="login-box bg-white rounded-md p-5 shadow">
      <h2 className="mb-5 text-gray-700 border-b-2 border-gray-200 pb-2">Create New Event</h2>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <input
          type="text"
          placeholder="Event Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="p-2 rounded border border-gray-300 text-base"
        />
        <textarea
          placeholder="Event Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className="p-2 rounded border border-gray-300 text-base min-h-[100px] resize-y"
        />
        <input
          type="text"
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
          className="p-2 rounded border border-gray-300 text-base"
        />
        <input
          type="url"
          placeholder="Event Link (optional)"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="p-2 rounded border border-gray-300 text-base"
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block mb-1 text-gray-700">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="p-1 rounded border border-gray-300 text-base w-full"
            />
          </div>
          <div>
            <label className="block mb-1 text-gray-700">Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="p-1 rounded border border-gray-300 text-base w-full"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block mb-1 text-gray-700">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="p-1 rounded border border-gray-300 text-base w-full"
            />
          </div>
          <div>
            <label className="block mb-1 text-gray-700">End Time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              className="p-1 rounded border border-gray-300 text-base w-full"
            />
          </div>
        </div>
        <button type="submit" className="login-button mt-2">Create Event</button>
      </form>
    </div>
  );
};

export default CreateEventForm;

