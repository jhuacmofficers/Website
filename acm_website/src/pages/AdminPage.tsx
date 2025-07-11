import React, { useState, useEffect } from 'react';
import '../styles/AdminPage.css';
import CreateEvent from '../components/admin/CreateEvent';
import Members from '../components/admin/Members';
import AttendanceUpload from '../components/admin/AttendanceUpload';
import Account from '../components/admin/Account';
import { auth } from '../firebase/config';
import { onAuthStateChanged, signOut } from "firebase/auth";
import * as XLSX from 'xlsx';
import { getUserRole, getMembers, getPastEvents, createEvent as createEventAPI, deleteUser, updateUserMemberStatus, processAttendance } from '../api';

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
  const [isLoading, setIsLoading] = useState<boolean>(true);
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
        try {
          setIsLoading(true);
          
          // Check user role from server
          const roleData = await getUserRole();
          
          if (!roleData.isAdmin) {
            navigateTo('home', 'You do not have permission to access the admin page');
            return;
          }
          
          setIsAdmin(true);
          
          // Fetch members and past events from server
          const [membersResponse, eventsResponse] = await Promise.all([
            getMembers(),
            getPastEvents()
          ]);
          
          const membersData: Member[] = membersResponse.members.map((member: any) => ({
            uid: member.uid,
            email: member.email,
            eventsAttended: member.eventsAttended?.length || 0
          }));
          setMembers(membersData);
          
          const eventsData: Event[] = eventsResponse.events.map((event: any) => ({
            id: event.id,
            name: event.name,
            date: new Date(event.start),
            attendees: event.attendees || []
          }));
          setPastEvents(eventsData);
          
        } catch (error) {
          console.error('Error verifying admin access:', error);
          navigateTo('home', 'Unable to verify admin access. Please try again.');
        } finally {
          setIsLoading(false);
        }
      } else {
        navigateTo('login', 'Please log in to access the admin page');
      }
    });
  }, [navigateTo]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // get start and end date and time
      const startDateTime = new Date(`${eventStartDate}T${eventStartTime}`);
      const endDateTime = new Date(`${eventEndDate}T${eventEndTime}`);

      // validate start and end date and time
      if (endDateTime <= startDateTime) {
        alert('End time must be after start time');
        return;
      }

      // Use secure API endpoint
      await createEventAPI({
        name: eventTitle,
        description: eventDescription,
        location: eventLocation,
        link: eventLink,
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
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
      alert(`Failed to create event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRemoveMember = async (uid: string) => {
    // confirm removal
    if (window.confirm('Are you sure you want to remove this member?')) {
      try {
        // Update user status through API
        await updateUserMemberStatus(uid, false, true);

        // Use secure API endpoint to delete user credentials
        await deleteUser(uid);

        // remove user from members list
        setMembers(prev => prev.filter(member => member.uid !== uid));
        
        alert('Member removed successfully!');
      } catch (error) {
        console.error('Error removing member:', error);
        alert(`Failed to remove member: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

          // Use the secure API endpoint to process attendance
          const result = await processAttendance(selectedEvent, attendeeEmails);

          alert(`Successfully processed attendance for ${result.attendeeCount} attendees (${result.knownUsers} known users, ${result.unknownUsers} unknown users)`);
          
          // Reset form
          setSelectedEvent('');
          setAttendanceFile(null);
          
          // Refresh members list
          const membersResponse = await getMembers();
          const membersData: Member[] = membersResponse.members.map((member: any) => ({
            uid: member.uid,
            email: member.email,
            eventsAttended: member.eventsAttended?.length || 0
          }));
          setMembers(membersData);
          
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

  if (isLoading) {
    return (
      <div className="admin-page">
        <div className="admin-layout">
          <div className="page-header">
            <h1 className="page-title">Loading...</h1>
            <p className="page-subtitle">Verifying admin access...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="admin-page">
      <div className="admin-layout">
        <div className="page-header">
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Manage events, members, and attendance</p>
        </div>

        {error && (
          <div className="admin-section error-section">
            <div className="error-message">
              {error}
            </div>
          </div>
        )}

        {/* Create Event Section */}
        <div className="admin-section">
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
        </div>

        {/* Members Section */}
        <div className="admin-section">
          <Members
            members={members}
            handleRemoveMember={handleRemoveMember}
          />
        </div>

        {/* Attendance Upload Section */}
        <div className="admin-section">
          <AttendanceUpload
            pastEvents={pastEvents}
            selectedEvent={selectedEvent}
            setSelectedEvent={setSelectedEvent}
            setAttendanceFile={setAttendanceFile}
            handleAttendanceUpload={handleAttendanceUpload}
          />
        </div>

        {/* Account Section */}
        <div className="admin-section">
          <Account handleLogout={handleLogout} />
        </div>
      </div>
    </div>
  );
};

export default AdminPage; 