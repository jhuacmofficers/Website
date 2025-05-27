import React, { useState, useEffect } from 'react';
import './LoginPage.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { collection, doc, getFirestore, getDocs, query, where, updateDoc, addDoc, Timestamp, orderBy, arrayUnion } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { deleteUser } from '../api';
import { useAuth } from '../components/AuthProvider';



interface Event {
  id: string;
  name: string;
  date: Date;
  attendees?: { uid: string; email: string }[];
}

interface Member {
  uid: string;
  email: string;
  eventsAttended: number;
}

interface SpreadsheetRow {
  Email?: string;
  email?: string;
  [key: string]: unknown;
}

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const error = (location.state as { message?: string })?.message;
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  
  // Event form state
  const [eventTitle, setEventTitle] = useState<string>('');
  const [eventDescription, setEventDescription] = useState<string>('');
  const [eventLocation, setEventLocation] = useState<string>('');
  const [eventLink, setEventLink] = useState<string>('');
  const [eventStartDate, setEventStartDate] = useState<string>('');
  const [eventStartTime, setEventStartTime] = useState<string>('');
  const [eventEndDate, setEventEndDate] = useState<string>('');
  const [eventEndTime, setEventEndTime] = useState<string>('');
  
  // Attendance upload state
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [attendanceFile, setAttendanceFile] = useState<File | null>(null);

  useEffect(() => {
    const load = async () => {
      if (user === undefined) return;
      if (user) {
        if (user.email !== 'jhuacmweb@gmail.com') {
          navigate('/', { state: { message: 'You do not have permission to access the admin page' } });
          return;
        }
        setIsAdmin(true);
        const db = getFirestore();

        const membersQuery = query(collection(db, 'users'), where('isMember', '==', true));
        const membersSnapshot = await getDocs(membersQuery);
        const membersData: Member[] = membersSnapshot.docs.map(doc => ({
          uid: doc.id,
          email: doc.data().email,
          eventsAttended: doc.data().eventsAttended?.length || 0
        }));
        setMembers(membersData);

        const eventsQuery = query(collection(db, 'events'), where('end', '<', Timestamp.now()), orderBy('start', 'desc'));
        const eventsSnapshot = await getDocs(eventsQuery);
        const events: Event[] = eventsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            date: data.start.toDate(),
          };
        });
        setPastEvents(events);
      } else {
        navigate('/login', { state: { message: 'Please log in to access the admin page', from: location } });
      }
    };
    void load();
  }, [user, navigate, location]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const db = getFirestore();
      const startDateTime = new Date(`${eventStartDate}T${eventStartTime}`);
      const endDateTime = new Date(`${eventEndDate}T${eventEndTime}`);

      if (endDateTime <= startDateTime) {
        alert('End time must be after start time');
        return;
      }

      await addDoc(collection(db, "events"), {
        name: eventTitle,
        description: eventDescription,
        location: eventLocation,
        link: eventLink,
        start: Timestamp.fromDate(startDateTime),
        end: Timestamp.fromDate(endDateTime),
      });

      // Reset form
      setEventTitle('');
      setEventDescription('');
      setEventLocation('');
      setEventLink('');
      setEventStartDate('');
      setEventStartTime('');
      setEventEndDate('');
      setEventEndTime('');

      alert('Event created successfully!');
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event. Please try again.');
    }
  };

  const handleRemoveMember = async (uid: string) => {
    if (window.confirm('Are you sure you want to remove this member?')) {
      try {
        const db = getFirestore();
        await updateDoc(doc(db, "users", uid), {
          isMember: false,
          deleted: true,
          deletedAt: Timestamp.now()
        });

        await deleteUser(uid);

        setMembers(prev => prev.filter(member => member.uid !== uid));
      } catch (error) {
        console.error('Error removing member:', error);
        alert('Failed to remove member. Please try again.');
      }
    }
  };

  const handleAttendanceUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !attendanceFile) {
      alert('Please select an event and upload a file');
      return;
    }

    try {
      const db = getFirestore();

      // Read the spreadsheet file
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json<SpreadsheetRow>(firstSheet);

          // Extract emails from the spreadsheet
          // Assuming the email column is named 'Email' or 'email'
          const attendeeEmails = jsonData
            .map(row => row.Email || row.email)
            .filter((email): email is string => typeof email === 'string' && email.length > 0)
            .map(email => email.toLowerCase().trim());

          if (attendeeEmails.length === 0) {
            throw new Error('No valid emails found in the spreadsheet');
          }

          // Get all users whose emails match the attendees
          const usersQuery = query(
            collection(db, "users"),
            where("email", "in", attendeeEmails)
          );
          const usersSnapshot = await getDocs(usersQuery);

          // Get the event details
          const event = pastEvents.find(e => e.id === selectedEvent);
          if (!event) {
            throw new Error('Event not found');
          }

          // get attendee list
          const attendees: { uid: string; email: string }[] = [];
          const updatePromises = usersSnapshot.docs.map(async (userDoc) => {
            const userData = userDoc.data();
            attendees.push({
              uid: userDoc.id,
              email: userData.email
            });

            // Update user's eventsAttended
            return updateDoc(doc(db, "users", userDoc.id), {
              eventsAttended: arrayUnion({
                eventID: event.id,
                name: event.name,
                date: event.date
              })
            });
          });

          // Add unknown attendees
          for (const email of attendeeEmails) {
            if (attendees.find(a => a.email === email)) {
              continue;
            }
            attendees.push({
              uid: "unknown",
              email: email
            });
          }

          // Update event's attendees
          const eventUpdatePromise = updateDoc(doc(db, "events", event.id), {
            attendees: attendees
          });

          // Wait for all updates to complete
          await Promise.all([...updatePromises, eventUpdatePromise]);

          alert(`Successfully processed attendance for ${attendees.length} members`);
          
          // Reset form
          setSelectedEvent('');
          setAttendanceFile(null);
        } catch (error) {
          console.error('Error processing attendance:', error);
          alert(`Error processing attendance: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };

      reader.onerror = () => {
        throw new Error('Error reading file');
      };

      reader.readAsArrayBuffer(attendanceFile);
    } catch (error) {
      console.error('Error uploading attendance:', error);
      alert(`Error uploading attendance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login', { state: { message: 'You have been logged out' } });
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Failed to log out. Please try again.');
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="login-page">
      <div className="about-background" style={{ zIndex: -1 }}></div>
      <div className="login-container" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '20px',
        maxWidth: '800px',
        width: '90%',
        margin: '20px auto',
        padding: '20px'
      }}>
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Create Event Container */}
        <div className="login-box" style={{ 
          width: '100%',
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ marginBottom: '20px', color: '#495057', borderBottom: '2px solid #e9ecef', paddingBottom: '10px' }}>
            Create New Event
          </h2>
          <form onSubmit={handleCreateEvent} style={{ display: 'grid', gap: '15px' }}>
            <input
              type="text"
              placeholder="Event Title"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              required
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ced4da',
                fontSize: '1rem'
              }}
            />
            <textarea
              placeholder="Event Description"
              value={eventDescription}
              onChange={(e) => setEventDescription(e.target.value)}
              required
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ced4da',
                fontSize: '1rem',
                minHeight: '100px',
                resize: 'vertical'
              }}
            />
            <input
              type="text"
              placeholder="Location"
              value={eventLocation}
              onChange={(e) => setEventLocation(e.target.value)}
              required
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ced4da',
                fontSize: '1rem'
              }}
            />
            <input
              type="url"
              placeholder="Event Link (optional)"
              value={eventLink}
              onChange={(e) => setEventLink(e.target.value)}
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ced4da',
                fontSize: '1rem'
              }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', color: '#495057' }}>Start Date</label>
                <input
                  type="date"
                  value={eventStartDate}
                  onChange={(e) => setEventStartDate(e.target.value)}
                  required
                  style={{
                    padding: '2px',
                    borderRadius: '4px',
                    border: '1px solid #ced4da',
                    fontSize: '1rem',
                    width: '100%'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', color: '#495057' }}>Start Time</label>
                <input
                  type="time"
                  value={eventStartTime}
                  onChange={(e) => setEventStartTime(e.target.value)}
                  required
                  style={{
                    padding: '2px',
                    borderRadius: '4px',
                    border: '1px solid #ced4da',
                    fontSize: '1rem',
                    width: '100%'
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', color: '#495057' }}>End Date</label>
                <input
                  type="date"
                  value={eventEndDate}
                  onChange={(e) => setEventEndDate(e.target.value)}
                  required
                  style={{
                    padding: '2px',
                    borderRadius: '4px',
                    border: '1px solid #ced4da',
                    fontSize: '1rem',
                    width: '100%'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', color: '#495057' }}>End Time</label>
                <input
                  type="time"
                  value={eventEndTime}
                  onChange={(e) => setEventEndTime(e.target.value)}
                  required
                  style={{
                    padding: '2px',
                    borderRadius: '4px',
                    border: '1px solid #ced4da',
                    fontSize: '1rem',
                    width: '100%'
                  }}
                />
              </div>
            </div>
            <button 
              type="submit"
              className="login-button"
              style={{ marginTop: '10px' }}
            >
              Create Event
            </button>
          </form>
        </div>

        {/* Members Container */}
        <div className="login-box" style={{ 
          width: '100%',
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ marginBottom: '20px', color: '#495057', borderBottom: '2px solid #e9ecef', paddingBottom: '10px' }}>
            Manage Members
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#495057' }}>Email</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#495057' }}>Events Attended</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#495057' }}>Remove</th>
                </tr>
              </thead>
              <tbody>
                {members.map(member => (
                  <tr key={member.uid} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '12px', color: '#495057' }}>{member.email}</td>
                    <td style={{ padding: '12px', color: '#495057' }}>{member.eventsAttended}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleRemoveMember(member.uid)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#dc3545',
                          fontSize: '1.2rem',
                          cursor: 'pointer',
                          padding: '0 5px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          transition: 'background-color 0.2s',
                          margin: '0 auto'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#ffebee'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Attendance Upload Container */}
        <div className="login-box" style={{ 
          width: '100%',
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ marginBottom: '20px', color: '#495057', borderBottom: '2px solid #e9ecef', paddingBottom: '10px' }}>
            Upload Attendance
          </h2>
          <form onSubmit={handleAttendanceUpload} style={{ display: 'grid', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', color: '#495057' }}>Select Event</label>
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                required
                style={{
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ced4da',
                  fontSize: '1rem',
                  width: '100%',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Select an event...</option>
                {pastEvents.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.name} ({event.date.toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', color: '#495057' }}>Upload Spreadsheet</label>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setAttendanceFile(e.target.files?.[0] || null)}
                required
                style={{
                  padding: '8px',
                  fontSize: '1rem',
                  width: '100%'
                }}
              />
            </div>
            <button 
              type="submit"
              className="login-button"
              style={{ marginTop: '10px' }}
            >
              Upload Attendance
            </button>
          </form>
        </div>

        {/* Logout Container */}
        <div className="login-box" style={{ 
          width: '100%',
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ marginBottom: '20px', color: '#495057', borderBottom: '2px solid #e9ecef', paddingBottom: '10px' }}>
            Account
          </h2>
          <button 
            onClick={handleLogout}
            className="login-button"
            style={{ 
              backgroundColor: '#003366',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
              width: '100%',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#c82333'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#dc3545'}
          >
            Logout
          </button>
        </div>
      </div>

      <button
        className="home-button"
        onClick={() => navigate('/')}
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2
        }}
      >
        Back to Home
      </button>
    </div>
  );
};

export default AdminPage; 