import React, { useState, useEffect } from 'react';
import '../styles/AdminPage.css';
import CreateEvent from '../components/admin/CreateEvent';
import Members from '../components/admin/Members';
import AttendanceUpload from '../components/admin/AttendanceUpload';
import Account from '../components/admin/Account';
import { auth } from '../firebase/config';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, doc, getFirestore, getDocs, query, where, updateDoc, addDoc, Timestamp, orderBy, arrayUnion } from "firebase/firestore";
import * as XLSX from 'xlsx';
import { deleteUser } from '../api';

interface AdminPageProps {
  navigateTo: (page: string, errorMessage?: string) => void;
  error?: string;
}

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

const AdminPage: React.FC<AdminPageProps> = ({ navigateTo, error }) => {
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
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        // check if user is admin
        if (user.email !== "jhuacmweb@gmail.com") {
          navigateTo('home', 'You do not have permission to access the admin page');
          return;
        }
        setIsAdmin(true);
        const db = getFirestore();

        // Fetch members
        const membersQuery = query(collection(db, "users"), where("isMember", "==", true));
        const membersSnapshot = await getDocs(membersQuery);
        const membersData: Member[] = membersSnapshot.docs.map(doc => ({
          uid: doc.id,
          email: doc.data().email,
          eventsAttended: doc.data().eventsAttended?.length || 0
        }));
        setMembers(membersData);

        // Fetch past events
        const eventsQuery = query(collection(db, "events"), where("end", "<", Timestamp.now()), orderBy("start", "desc"));
        const eventsSnapshot = await getDocs(eventsQuery);
        const events: Event[] = eventsSnapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name,
              date: data.start.toDate(),
            };
          });
        setPastEvents(events);
      } else {
        navigateTo('login', 'Please log in to access the admin page');
      }
    });
  }, [navigateTo]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const db = getFirestore();
      // get start and end date and time
      const startDateTime = new Date(`${eventStartDate}T${eventStartTime}`);
      const endDateTime = new Date(`${eventEndDate}T${eventEndTime}`);

      // validate start and end date and time
      if (endDateTime <= startDateTime) {
        alert('End time must be after start time');
        return;
      }

      // send event to database
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
    // confirm removal
    if (window.confirm('Are you sure you want to remove this member?')) {
      try {
        // update user in database
        const db = getFirestore();
        await updateDoc(doc(db, "users", uid), {
          isMember: false,
          deleted: true,
          deletedAt: Timestamp.now()
        });

        // delete user credentials
        await deleteUser(uid);

        // remove user from members list
        setMembers(prev => prev.filter(member => member.uid !== uid));
      } catch (error) {
        console.error('Error removing member:', error);
        alert('Failed to remove member. Please try again.');
      }
    }
  };

  const handleAttendanceUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    // validate event and file
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
      navigateTo('login', 'You have been logged out');
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
      <div className="about-background about-background-low"></div>
      <div className="login-container">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Create Event Container */}
        <CreateEvent
          eventTitle={eventTitle}
          setEventTitle={setEventTitle}
          eventDescription={eventDescription}
          setEventDescription={setEventDescription}
          eventLocation={eventLocation}
          setEventLocation={setEventLocation}
          eventLink={eventLink}
          setEventLink={setEventLink}
          eventStartDate={eventStartDate}
          setEventStartDate={setEventStartDate}
          eventStartTime={eventStartTime}
          setEventStartTime={setEventStartTime}
          eventEndDate={eventEndDate}
          setEventEndDate={setEventEndDate}
          eventEndTime={eventEndTime}
          setEventEndTime={setEventEndTime}
          handleCreateEvent={handleCreateEvent}
        />

        {/* Members Container */}
        <Members
          members={members}
          handleRemoveMember={handleRemoveMember}
        />

        {/* Attendance Upload Container */}
        <AttendanceUpload
          pastEvents={pastEvents}
          selectedEvent={selectedEvent}
          setSelectedEvent={setSelectedEvent}
          setAttendanceFile={setAttendanceFile}
          handleAttendanceUpload={handleAttendanceUpload}
        />

        {/* Logout Container */}
        <Account handleLogout={handleLogout} />
      </div>

      <button
        className="home-button home-fixed"
        onClick={() => navigateTo('home')}
      >
        Back to Home
      </button>
    </div>
  );
};

export default AdminPage; 
