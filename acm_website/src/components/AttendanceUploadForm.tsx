import React, { useState } from 'react';

interface EventOption {
  id: string;
  name: string;
  date: Date;
}

interface Props {
  events: EventOption[];
  onUpload: (eventId: string, file: File) => void;
}

const AttendanceUploadForm: React.FC<Props> = ({ events, onUpload }) => {
  const [selectedEvent, setSelectedEvent] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEvent && file) {
      onUpload(selectedEvent, file);
      setSelectedEvent('');
      setFile(null);
    }
  };

  return (
    <div className="login-box bg-white rounded-md p-5 shadow">
      <h2 className="mb-5 text-gray-700 border-b-2 border-gray-200 pb-2">Upload Attendance</h2>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div>
          <label className="block mb-1 text-gray-700">Select Event</label>
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            required
            className="p-2 rounded border border-gray-300 text-base w-full bg-white"
          >
            <option value="">Select an event...</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name} ({event.date.toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1 text-gray-700">Upload Spreadsheet</label>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            required
            className="p-2 text-base w-full"
          />
        </div>
        <button type="submit" className="login-button mt-2">Upload Attendance</button>
      </form>
    </div>
  );
};

export default AttendanceUploadForm;

