# Security Improvements: Role-Based Authentication System

## Overview

This document outlines the security improvements implemented to fix critical vulnerabilities in the ACM website's authentication and authorization system.

## Security Vulnerabilities Fixed

### 1. **Hardcoded Admin Email** ❌ → ✅
**Before**: Admin role was determined by hardcoded email comparison
```javascript
// VULNERABLE CODE (REMOVED)
if (user.email !== "jhuacmweb@gmail.com") {
  navigateTo('home', 'You do not have permission to access the admin page');
  return;
}
```

**After**: Database-driven role-based system
```javascript
// SECURE CODE
const roleData = await getUserRole();
if (!roleData.isAdmin) {
  navigateTo('home', 'You do not have permission to access the admin page');
  return;
}
```

### 2. **Client-Side Security Checks** ❌ → ✅
**Before**: All admin checks were performed client-side and could be bypassed
```javascript
// VULNERABLE CODE (REMOVED)
setIsAdmin(user?.email === "jhuacmweb@gmail.com");
```

**After**: Server-side validation with proper middleware
```javascript
// SECURE CODE - Server-side middleware
const requireAdmin = async (req, res, next) => {
  const userDoc = await db.collection('users').doc(req.user.uid).get();
  if (!userDoc.data().isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};
```

### 3. **Unprotected API Endpoints** ❌ → ✅
**Before**: API endpoints had no authentication or authorization
```javascript
// VULNERABLE CODE (REMOVED)
app.post('/deleteUser', async (req, res) => {
  // No authentication or authorization checks
  await admin.auth().deleteUser(uid);
});
```

**After**: Protected endpoints with authentication and authorization
```javascript
// SECURE CODE
app.post('/admin/deleteUser', authenticateToken, requireAdmin, async (req, res) => {
  // Fully protected with authentication and admin role verification
  await admin.auth().deleteUser(uid);
});
```

## New Security Architecture

### Authentication Flow
1. **User Login**: Users authenticate with Firebase Auth
2. **Token Verification**: Backend verifies Firebase ID tokens
3. **Role Fetching**: Server fetches user roles from Firestore
4. **Authorization**: Server validates permissions for each request

### Role-Based Access Control (RBAC)
- **Database-stored roles**: User roles are stored in Firestore documents
- **Server-side validation**: All role checks happen on the server
- **Granular permissions**: Separate `isAdmin` and `isMember` flags
- **Audit trail**: Role changes are logged with timestamps and user IDs

### API Security
- **JWT Token Authentication**: All API requests require valid Firebase ID tokens
- **Authorization Middleware**: Role-based access control on all admin endpoints
- **Input Validation**: Proper validation of all request parameters
- **Error Handling**: Secure error messages that don't leak sensitive information

## Implementation Details

### Backend Changes

#### New Middleware
```javascript
// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  const decodedToken = await admin.auth().verifyIdToken(token);
  req.user = decodedToken;
  next();
};

// Authorization middleware
const requireAdmin = async (req, res, next) => {
  const userDoc = await db.collection('users').doc(req.user.uid).get();
  if (!userDoc.data().isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};
```

#### Protected API Endpoints
- `GET /user/role` - Get user's role information
- `POST /admin/deleteUser` - Delete user (admin only)
- `GET /admin/members` - Get all members (admin only)
- `POST /admin/events` - Create event (admin only)
- `PUT /admin/users/:uid/member` - Update member status (admin only)
- `PUT /admin/users/:uid/admin` - Update admin status (admin only)

### Frontend Changes

#### Secure API Client
```javascript
// Authenticated API requests
const authenticatedRequest = async (endpoint, options = {}) => {
  const token = await auth.currentUser.getIdToken();
  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
};
```

#### Server-Side Role Verification
- Removed all hardcoded email checks
- Added proper loading states during role verification
- Implemented error handling for role fetching failures

## Migration Guide

### Step 1: Backend Setup
1. Deploy the updated backend with new security middleware
2. Ensure all environment variables are properly configured
3. Test the health check endpoint: `GET /health`

### Step 2: Initial Admin Setup
Run the admin setup script to create your first admin user:
```bash
cd acm_backend
node setup-admin.js your-admin-email@example.com
```

### Step 3: Database Migration
Ensure your Firestore users collection has the following structure:
```javascript
// User document structure
{
  email: "user@example.com",
  isAdmin: false,        // Boolean flag for admin access
  isMember: true,        // Boolean flag for member status
  createdAt: Timestamp,
  updatedAt: Timestamp,
  eventsAttended: []     // Array of attended events
}
```

### Step 4: Frontend Deployment
1. Update the frontend with the new secure components
2. Configure `VITE_API_BASE_URL` environment variable
3. Test all admin functionality

### Step 5: Security Verification
1. ✅ Verify admin access is properly restricted
2. ✅ Test that non-admin users cannot access admin endpoints
3. ✅ Confirm all API requests require valid authentication tokens
4. ✅ Validate that role changes are properly logged

## Best Practices Implemented

### Authentication
- **Strong token validation**: Firebase ID tokens are verified server-side
- **Token expiration**: Tokens automatically expire and refresh
- **No password handling**: Delegated to Firebase Auth for security

### Authorization
- **Principle of least privilege**: Users only get necessary permissions
- **Role-based access**: Clear separation between admin and member roles
- **Server-side enforcement**: All authorization checks happen on the server

### API Security
- **HTTPS enforcement**: All API communication should use HTTPS
- **Input validation**: All request parameters are validated
- **Rate limiting**: Consider implementing rate limiting for production
- **Audit logging**: All admin actions are logged with user context

### Data Protection
- **Secure data storage**: User roles stored in Firestore with proper indexes
- **Data validation**: All user inputs are validated and sanitized
- **Error handling**: Secure error messages that don't leak sensitive information

## Environment Variables

Ensure these environment variables are set:

### Backend (.env)
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY=your-service-account-private-key
PORT=3001
```

### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:3001
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

## Testing the Security Implementation

### Admin Access Testing
1. Create a test user without admin privileges
2. Attempt to access admin endpoints directly
3. Verify that access is denied with proper error messages

### Token Validation Testing
1. Try API requests without authorization headers
2. Try API requests with invalid tokens
3. Verify that all requests are properly rejected

### Role Change Testing
1. Use the admin setup script to grant admin privileges
2. Verify that the user can now access admin features
3. Test role changes through the admin interface

## Future Security Enhancements

### Recommended Improvements
1. **Multi-factor authentication**: Add MFA for admin accounts
2. **Session management**: Implement proper session handling
3. **Rate limiting**: Add rate limiting to prevent abuse
4. **Audit logging**: Comprehensive logging of all admin actions
5. **Role hierarchies**: More granular role system (super admin, moderator, etc.)
6. **IP whitelisting**: Restrict admin access to specific IP addresses
7. **Account lockout**: Implement account lockout after failed attempts

### Monitoring and Alerting
1. **Failed authentication attempts**: Monitor and alert on suspicious activity
2. **Admin action logging**: Log all admin actions for audit purposes
3. **Security event monitoring**: Track security-related events
4. **Performance monitoring**: Monitor API response times and errors

## Conclusion

The implemented security improvements address the critical vulnerabilities in the original system:

✅ **Eliminated hardcoded credentials**
✅ **Implemented server-side authorization**
✅ **Added proper authentication middleware**
✅ **Created secure API endpoints**
✅ **Established role-based access control**
✅ **Added comprehensive error handling**

The new system follows security best practices and provides a solid foundation for future enhancements. All admin operations are now properly secured with server-side validation and authentication tokens.

---

**Important**: After deploying these changes, make sure to:
1. Update your admin user using the setup script
2. Test all functionality thoroughly
3. Monitor logs for any security issues
4. Consider implementing additional security measures as needed