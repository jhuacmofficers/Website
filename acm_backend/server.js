// Backend server setup

const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Role verification middleware
const requireAdmin = async (req, res, next) => {
  try {
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = userDoc.data();
    if (!userData.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Error checking admin role:', error);
    return res.status(500).json({ message: 'Error verifying admin role' });
  }
};

// Get user role information
app.get('/user/role', authenticateToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = userDoc.data();
    return res.status(200).json({ 
      isAdmin: userData.isAdmin || false,
      isMember: userData.isMember || false,
      email: userData.email
    });
  } catch (error) {
    console.error('Error fetching user role:', error);
    return res.status(500).json({ message: 'Error fetching user role' });
  }
});

// Get user profile
app.get('/user/profile', authenticateToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = userDoc.data();
    return res.status(200).json(userData);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({ message: 'Error fetching user profile' });
  }
});

// Get user bookings
app.get('/user/bookings', authenticateToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const bookingsQuery = db.collection('bookings').where('UID', '==', req.user.uid);
    const bookingsSnapshot = await bookingsQuery.get();
    
    const bookings = bookingsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      start: doc.data().start.toDate(),
      end: doc.data().end.toDate()
    }));

    return res.status(200).json({ bookings });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    return res.status(500).json({ message: 'Error fetching user bookings' });
  }
});

// Update user profile
app.put('/user/profile', authenticateToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const { firstName, lastName, discord, profilePicURL } = req.body;
    
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (discord !== undefined) updateData.discord = discord;
    if (profilePicURL !== undefined) updateData.profilePicURL = profilePicURL;
    
    updateData.updatedAt = admin.firestore.Timestamp.now();

    await db.collection('users').doc(req.user.uid).update(updateData);
    
    return res.status(200).json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return res.status(500).json({ message: 'Error updating user profile' });
  }
});

// Update user membership status
app.put('/user/membership', authenticateToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const { isMember } = req.body;
    
    await db.collection('users').doc(req.user.uid).update({
      isMember: isMember,
      updatedAt: admin.firestore.Timestamp.now()
    });
    
    return res.status(200).json({ message: 'Membership status updated successfully' });
  } catch (error) {
    console.error('Error updating membership status:', error);
    return res.status(500).json({ message: 'Error updating membership status' });
  }
});

// Create or update user (for registration)
app.post('/user/register', authenticateToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const { email, firstName, lastName, discord, profilePicURL } = req.body;
    
    // Check if user already exists
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (userDoc.exists) {
      return res.status(200).json({ message: 'User already exists', user: userDoc.data() });
    }
    
    // Create new user
    const userData = {
      email: email,
      firstName: firstName || '',
      lastName: lastName || '',
      discord: discord || '',
      profilePicURL: profilePicURL || '',
      isMember: false,
      isAdmin: false,
      eventsAttended: [],
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };
    
    await db.collection('users').doc(req.user.uid).set(userData);
    
    return res.status(201).json({ message: 'User created successfully', user: userData });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ message: 'Error creating user' });
  }
});

// Delete user booking
app.delete('/user/bookings/:bookingId', authenticateToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const { bookingId } = req.params;
    
    // Verify the booking belongs to the user
    const bookingDoc = await db.collection('bookings').doc(bookingId).get();
    if (!bookingDoc.exists) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    if (bookingDoc.data().UID !== req.user.uid) {
      return res.status(403).json({ message: 'Unauthorized to delete this booking' });
    }
    
    await db.collection('bookings').doc(bookingId).delete();
    
    return res.status(200).json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Error deleting booking:', error);
    return res.status(500).json({ message: 'Error deleting booking' });
  }
});

// Get all events (upcoming and past)
app.get('/events', async (req, res) => {
  try {
    const db = admin.firestore();
    const { type } = req.query; // 'upcoming' or 'past'
    
    let query;
    if (type === 'upcoming') {
      query = db.collection('events')
        .where('start', '>=', admin.firestore.Timestamp.now())
        .orderBy('start', 'desc');
    } else if (type === 'past') {
      query = db.collection('events')
        .where('start', '<', admin.firestore.Timestamp.now())
        .orderBy('start', 'desc');
    } else {
      query = db.collection('events').orderBy('start', 'desc');
    }
    
    const eventsSnapshot = await query.get();
    const events = eventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      start: doc.data().start.toDate(),
      end: doc.data().end.toDate()
    }));

    return res.status(200).json({ events });
  } catch (error) {
    console.error('Error fetching events:', error);
    return res.status(500).json({ message: 'Error fetching events' });
  }
});

// Register for event
app.post('/events/:eventId/register', authenticateToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const { eventId } = req.params;
    
    // Get user data
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userData = userDoc.data();
    if (!userData.isMember) {
      return res.status(403).json({ message: 'Only members can register for events' });
    }
    
    // Get event data
    const eventDoc = await db.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    const eventData = eventDoc.data();
    
    // Add user to event registered list
    await db.collection('events').doc(eventId).update({
      registered: admin.firestore.FieldValue.arrayUnion({
        uid: req.user.uid,
        email: userData.email,
        name: `${userData.firstName} ${userData.lastName}`.trim()
      })
    });
    
    // Add event to user's registered events
    await db.collection('users').doc(req.user.uid).update({
      eventsRegistered: admin.firestore.FieldValue.arrayUnion({
        eventID: eventId,
        name: eventData.name,
        date: eventData.start
      })
    });
    
    return res.status(200).json({ message: 'Successfully registered for event' });
  } catch (error) {
    console.error('Error registering for event:', error);
    return res.status(500).json({ message: 'Error registering for event' });
  }
});

// Get weekly bookings for calendar view
app.get('/bookings/weekly', async (req, res) => {
  try {
    const db = admin.firestore();
    const today = new Date();
    const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const bookingsQuery = db.collection('bookings')
      .where('start', '>=', admin.firestore.Timestamp.fromDate(today))
      .where('start', '<=', admin.firestore.Timestamp.fromDate(weekEnd));
    
    const bookingsSnapshot = await bookingsQuery.get();
    const bookings = bookingsSnapshot.docs.map(doc => ({
      start: doc.data().start.toDate(),
      end: doc.data().end.toDate()
    }));

    return res.status(200).json({ bookings });
  } catch (error) {
    console.error('Error fetching weekly bookings:', error);
    return res.status(500).json({ message: 'Error fetching weekly bookings' });
  }
});

// Get user daily bookings
app.get('/bookings/daily', authenticateToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: 'Date parameter required' });
    }
    
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    
    const bookingsQuery = db.collection('bookings')
      .where('UID', '==', req.user.uid)
      .where('start', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
      .where('start', '<=', admin.firestore.Timestamp.fromDate(endOfDay));
    
    const bookingsSnapshot = await bookingsQuery.get();
    const bookings = bookingsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      start: doc.data().start.toDate(),
      end: doc.data().end.toDate()
    }));

    return res.status(200).json({ bookings });
  } catch (error) {
    console.error('Error fetching daily bookings:', error);
    return res.status(500).json({ message: 'Error fetching daily bookings' });
  }
});

// Create booking
app.post('/bookings', authenticateToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const { startTime, endTime, purpose } = req.body;
    
    if (!startTime || !endTime) {
      return res.status(400).json({ message: 'Start time and end time are required' });
    }
    
    // Get user data to check membership
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userData = userDoc.data();
    if (!userData.isMember) {
      return res.status(403).json({ message: 'Only members can create bookings' });
    }
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    // Create booking ID
    const bookingId = req.user.uid + start.toDateString();
    
    // Check if booking already exists
    const existingBooking = await db.collection('bookings').doc(bookingId).get();
    if (existingBooking.exists) {
      return res.status(409).json({ message: 'Booking already exists for this time slot' });
    }
    
    // Create booking
    const bookingData = {
      UID: req.user.uid,
      start: admin.firestore.Timestamp.fromDate(start),
      end: admin.firestore.Timestamp.fromDate(end),
      purpose: purpose || '',
      createdAt: admin.firestore.Timestamp.now()
    };
    
    await db.collection('bookings').doc(bookingId).set(bookingData);
    
    return res.status(201).json({ 
      message: 'Booking created successfully',
      bookingId: bookingId,
      booking: {
        id: bookingId,
        ...bookingData,
        start: start,
        end: end
      }
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    return res.status(500).json({ message: 'Error creating booking' });
  }
});

// Migrate user data during login (for existing users)
app.post('/user/migrate', authenticateToken, async (req, res) => {
  try {
    const db = admin.firestore();
    
    // Get all events for migration
    const eventsSnapshot = await db.collection('events').get();
    const events = eventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Initialize user data
    const attended = [];
    const registered = [];
    const updatePromises = [];
    
    // Process events for user migration
    for (const event of events) {
      const eventData = event;
      let attendees = eventData.attendees || [];
      let regs = eventData.registered || [];
      
      // Check if user is in attendees
      const isAttendee = attendees.some(a => a.uid === req.user.uid);
      if (isAttendee) {
        attended.push({ 
          eventID: event.id, 
          name: eventData.name, 
          date: eventData.start 
        });
      } else {
        // Add user to attendees if they have the same email
        attendees.push({ uid: req.user.uid, email: req.user.email });
      }
      
      // Check if user is registered
      const isRegistered = regs.some(r => r.uid === req.user.uid);
      if (isRegistered) {
        registered.push({ 
          eventID: event.id, 
          name: eventData.name, 
          date: eventData.start 
        });
      } else {
        // Add user to registered if they have the same email
        regs.push({ uid: req.user.uid, email: req.user.email });
      }
      
      // Update event with new attendees/registered
      updatePromises.push(
        db.collection('events').doc(event.id).update({ 
          attendees: attendees, 
          registered: regs 
        })
      );
    }
    
    // Execute all event updates
    await Promise.all(updatePromises);
    
    // Update user document with migration data
    await db.collection('users').doc(req.user.uid).set({
      email: req.user.email,
      firstName: req.user.firstName || '',
      lastName: req.user.lastName || '',
      discord: req.user.discord || '',
      profilePicURL: req.user.profilePicURL || '',
      isMember: false,
      isAdmin: false,
      eventsAttended: attended,
      eventsRegistered: registered,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    }, { merge: true });
    
    return res.status(200).json({ 
      message: 'User migration completed successfully',
      attended: attended.length,
      registered: registered.length
    });
  } catch (error) {
    console.error('Error migrating user data:', error);
    return res.status(500).json({ message: 'Error migrating user data' });
  }
});

// Protected admin endpoint - Get all members
app.get('/admin/members', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = admin.firestore();
    const membersSnapshot = await db.collection('users').where('isMember', '==', true).get();
    
    const members = membersSnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));

    return res.status(200).json({ members });
  } catch (error) {
    console.error('Error fetching members:', error);
    return res.status(500).json({ message: 'Error fetching members' });
  }
});

// Protected admin endpoint - Get past events
app.get('/admin/events/past', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = admin.firestore();
    const eventsQuery = db.collection('events')
      .where('end', '<', admin.firestore.Timestamp.now())
      .orderBy('start', 'desc');
    
    const eventsSnapshot = await eventsQuery.get();
    const events = eventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      start: doc.data().start.toDate(),
      end: doc.data().end.toDate()
    }));

    return res.status(200).json({ events });
  } catch (error) {
    console.error('Error fetching past events:', error);
    return res.status(500).json({ message: 'Error fetching past events' });
  }
});

// Protected admin endpoint - Create event
app.post('/admin/events', authenticateToken, requireAdmin, async (req, res) => {
  const { name, description, location, link, start, end } = req.body;
  
  if (!name || !start || !end) {
    return res.status(400).json({ message: 'Name, start, and end are required' });
  }

  try {
    const db = admin.firestore();
    const eventRef = await db.collection('events').add({
      name,
      description: description || '',
      location: location || '',
      link: link || '',
      start: admin.firestore.Timestamp.fromDate(new Date(start)),
      end: admin.firestore.Timestamp.fromDate(new Date(end)),
      attendees: [],
      registered: [],
      createdAt: admin.firestore.Timestamp.now(),
      createdBy: req.user.uid
    });

    return res.status(201).json({ 
      message: 'Event created successfully',
      eventId: eventRef.id 
    });
  } catch (error) {
    console.error('Error creating event:', error);
    return res.status(500).json({ message: 'Error creating event' });
  }
});

// Protected admin endpoint - Update user member status
app.put('/admin/users/:uid/member', authenticateToken, requireAdmin, async (req, res) => {
  const { uid } = req.params;
  const { isMember, deleted } = req.body;

  try {
    const db = admin.firestore();
    const updateData = {
      updatedAt: admin.firestore.Timestamp.now(),
      updatedBy: req.user.uid
    };
    
    if (isMember !== undefined) updateData.isMember = isMember;
    if (deleted !== undefined) {
      updateData.deleted = deleted;
      if (deleted) {
        updateData.deletedAt = admin.firestore.Timestamp.now();
      }
    }

    await db.collection('users').doc(uid).update(updateData);

    return res.status(200).json({ message: 'User member status updated successfully' });
  } catch (error) {
    console.error('Error updating user member status:', error);
    return res.status(500).json({ message: 'Error updating user member status' });
  }
});

// Protected admin endpoint - Process attendance upload
app.post('/admin/events/:eventId/attendance', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = admin.firestore();
    const { eventId } = req.params;
    const { attendeeEmails } = req.body;
    
    if (!attendeeEmails || !Array.isArray(attendeeEmails)) {
      return res.status(400).json({ message: 'Attendee emails array is required' });
    }
    
    // Get event details
    const eventDoc = await db.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    const eventData = eventDoc.data();
    
    // Get all users whose emails match the attendees
    const normalizedEmails = attendeeEmails.map(email => email.toLowerCase().trim());
    const usersQuery = db.collection('users').where('email', 'in', normalizedEmails);
    const usersSnapshot = await usersQuery.get();
    
    // Process attendees
    const attendees = [];
    const updatePromises = [];
    
    usersSnapshot.docs.forEach(userDoc => {
      const userData = userDoc.data();
      attendees.push({
        uid: userDoc.id,
        email: userData.email
      });
      
      // Update user's eventsAttended
      updatePromises.push(
        db.collection('users').doc(userDoc.id).update({
          eventsAttended: admin.firestore.FieldValue.arrayUnion({
            eventID: eventId,
            name: eventData.name,
            date: eventData.start
          })
        })
      );
    });
    
    // Add unknown attendees
    normalizedEmails.forEach(email => {
      if (!attendees.find(a => a.email === email)) {
        attendees.push({
          uid: "unknown",
          email: email
        });
      }
    });
    
    // Update event's attendees
    updatePromises.push(
      db.collection('events').doc(eventId).update({
        attendees: attendees,
        updatedAt: admin.firestore.Timestamp.now(),
        updatedBy: req.user.uid
      })
    );
    
    // Execute all updates
    await Promise.all(updatePromises);
    
    return res.status(200).json({ 
      message: 'Attendance processed successfully',
      attendeeCount: attendees.length,
      knownUsers: usersSnapshot.docs.length,
      unknownUsers: attendees.length - usersSnapshot.docs.length
    });
  } catch (error) {
    console.error('Error processing attendance:', error);
    return res.status(500).json({ message: 'Error processing attendance' });
  }
});

// Protected admin endpoint - Delete a user by UID
app.post('/admin/deleteUser', authenticateToken, requireAdmin, async (req, res) => {
  const { uid } = req.body;
  if (!uid) {
    return res.status(400).json({ message: 'UID is required' });
  }

  try {
    await admin.auth().deleteUser(uid);
    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ message: 'Error deleting user' });
  }
});

// Protected admin endpoint - Set user admin role
app.put('/admin/users/:uid/admin', authenticateToken, requireAdmin, async (req, res) => {
  const { uid } = req.params;
  const { isAdmin } = req.body;

  try {
    const db = admin.firestore();
    await db.collection('users').doc(uid).update({
      isAdmin: isAdmin,
      updatedAt: admin.firestore.Timestamp.now(),
      updatedBy: req.user.uid
    });

    return res.status(200).json({ message: 'User admin status updated successfully' });
  } catch (error) {
    console.error('Error updating user admin status:', error);
    return res.status(500).json({ message: 'Error updating user admin status' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ message: 'Server is running' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

