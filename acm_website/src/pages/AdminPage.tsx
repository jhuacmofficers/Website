import React, { useState, useEffect } from 'react';
import './../styles/LoginPage.css';
import { auth } from '../firebase/config';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, doc, getFirestore, getDocs, query, where, updateDoc, addDoc, Timestamp, orderBy, arrayUnion } from "firebase/firestore";
import * as XLSX from 'xlsx';
import { deleteUser } from '../api';
import CreateEventForm from '../components/CreateEventForm';
import MembersList from '../components/MembersList';
import AttendanceUploadForm from '../components/AttendanceUploadForm';
import AccountSection from '../components/AccountSection';

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
  

  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
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

  const handleCreateEvent = async (data: {
    title: string;
    description: string;
    location: string;
    link: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
  }) => {
    try {
      const db = getFirestore();
      const startDateTime = new Date(`${data.startDate}T${data.startTime}`);
      const endDateTime = new Date(`${data.endDate}T${data.endTime}`);

      if (endDateTime <= startDateTime) {
        alert('End time must be after start time');
        return;
      }

      await addDoc(collection(db, "events"), {
        name: data.title,
        description: data.description,
        location: data.location,
        link: data.link,
        start: Timestamp.fromDate(startDateTime),
        end: Timestamp.fromDate(endDateTime),
      });
      alert("Event created successfully!");
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

  const handleAttendanceUpload = async (eventId: string, file: File) => {

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
          const event = pastEvents.find(e => e.id === eventId);
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
        } catch (error) {
          console.error('Error processing attendance:', error);
          alert(`Error processing attendance: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };

      reader.onerror = () => {
        throw new Error('Error reading file');
      };

      reader.readAsArrayBuffer(file);
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
          <div className="error-message">{error}</div>
        )}

        <CreateEventForm onCreate={handleCreateEvent} />
        <MembersList members={members} onRemove={handleRemoveMember} />
        <AttendanceUploadForm events={pastEvents} onUpload={handleAttendanceUpload} />
        <AccountSection onLogout={handleLogout} />
      </div>

      <button 
        className="home-button" 
        onClick={() => navigateTo('home')}
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