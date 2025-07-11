// Setup script to create the first admin user
// Run this script once to set up the initial admin user in the database
// Usage: node setup-admin.js <email>

const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

async function setupAdmin(email) {
  try {
    const db = admin.firestore();
    
    // First, try to find the user by email
    const authUser = await admin.auth().getUserByEmail(email);
    
    if (!authUser) {
      console.error(`User with email ${email} not found in Firebase Auth`);
      return;
    }

    // Update the user document in Firestore
    await db.collection('users').doc(authUser.uid).set({
      email: email,
      isAdmin: true,
      isMember: true,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    }, { merge: true });

    console.log(`✅ Successfully set up admin user: ${email}`);
    console.log(`   User ID: ${authUser.uid}`);
    console.log(`   Admin: true`);
    console.log(`   Member: true`);
    
  } catch (error) {
    console.error('❌ Error setting up admin user:', error.message);
    
    if (error.code === 'auth/user-not-found') {
      console.log(`\n💡 To fix this:`);
      console.log(`   1. Make sure the user has registered in your app first`);
      console.log(`   2. Or create the user manually in Firebase Auth`);
      console.log(`   3. Then run this script again`);
    }
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: node setup-admin.js <email>');
  console.log('Example: node setup-admin.js admin@example.com');
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error('❌ Please provide a valid email address');
  process.exit(1);
}

console.log(`🔧 Setting up admin user: ${email}`);
setupAdmin(email)
  .then(() => {
    console.log('\n✅ Admin setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });