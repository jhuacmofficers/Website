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
  const { isMember } = req.body;

  try {
    const db = admin.firestore();
    await db.collection('users').doc(uid).update({
      isMember: isMember,
      updatedAt: admin.firestore.Timestamp.now(),
      updatedBy: req.user.uid
    });

    return res.status(200).json({ message: 'User member status updated successfully' });
  } catch (error) {
    console.error('Error updating user member status:', error);
    return res.status(500).json({ message: 'Error updating user member status' });
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

