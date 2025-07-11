import { auth } from './firebase/config';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Get the authentication token
const getAuthToken = async (): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return await user.getIdToken();
};

// Generic API request function with authentication
const authenticatedRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = await getAuthToken();
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }
  
  return response;
};

// Generic API request function without authentication
const publicRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }
  
  return response;
};

// User role and profile API
export const getUserRole = async () => {
  const response = await authenticatedRequest('/user/role');
  return response.json();
};

export const getUserProfile = async () => {
  const response = await authenticatedRequest('/user/profile');
  return response.json();
};

export const updateUserProfile = async (profileData: {
  firstName?: string;
  lastName?: string;
  discord?: string;
  profilePicURL?: string;
}) => {
  const response = await authenticatedRequest('/user/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
  return response.json();
};

export const updateUserMembership = async (isMember: boolean) => {
  const response = await authenticatedRequest('/user/membership', {
    method: 'PUT',
    body: JSON.stringify({ isMember }),
  });
  return response.json();
};

export const registerUser = async (userData: {
  email: string;
  firstName?: string;
  lastName?: string;
  discord?: string;
  profilePicURL?: string;
}) => {
  const response = await authenticatedRequest('/user/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
  return response.json();
};

export const migrateUserData = async () => {
  const response = await authenticatedRequest('/user/migrate', {
    method: 'POST',
  });
  return response.json();
};

// User bookings API
export const getUserBookings = async () => {
  const response = await authenticatedRequest('/user/bookings');
  return response.json();
};

export const deleteUserBooking = async (bookingId: string) => {
  const response = await authenticatedRequest(`/user/bookings/${bookingId}`, {
    method: 'DELETE',
  });
  return response.json();
};

export const getWeeklyBookings = async () => {
  const response = await publicRequest('/bookings/weekly');
  return response.json();
};

export const getDailyBookings = async (date: string) => {
  const response = await authenticatedRequest(`/bookings/daily?date=${encodeURIComponent(date)}`);
  return response.json();
};

export const createBooking = async (bookingData: {
  startTime: string;
  endTime: string;
  purpose?: string;
}) => {
  const response = await authenticatedRequest('/bookings', {
    method: 'POST',
    body: JSON.stringify(bookingData),
  });
  return response.json();
};

// Events API
export const getEvents = async (type?: 'upcoming' | 'past') => {
  const queryParam = type ? `?type=${type}` : '';
  const response = await publicRequest(`/events${queryParam}`);
  return response.json();
};

export const registerForEvent = async (eventId: string) => {
  const response = await authenticatedRequest(`/events/${eventId}/register`, {
    method: 'POST',
  });
  return response.json();
};

// Admin API functions
export const getMembers = async () => {
  const response = await authenticatedRequest('/admin/members');
  return response.json();
};

export const getPastEvents = async () => {
  const response = await authenticatedRequest('/admin/events/past');
  return response.json();
};

export const createEvent = async (eventData: {
  name: string;
  description: string;
  location: string;
  link: string;
  start: string;
  end: string;
}) => {
  const response = await authenticatedRequest('/admin/events', {
    method: 'POST',
    body: JSON.stringify(eventData),
  });
  return response.json();
};

export const deleteUser = async (uid: string) => {
  const response = await authenticatedRequest('/admin/deleteUser', {
    method: 'POST',
    body: JSON.stringify({ uid }),
  });
  return response.json();
};

export const updateUserMemberStatus = async (uid: string, isMember: boolean, deleted?: boolean) => {
  const response = await authenticatedRequest(`/admin/users/${uid}/member`, {
    method: 'PUT',
    body: JSON.stringify({ isMember, deleted }),
  });
  return response.json();
};

export const updateUserAdminStatus = async (uid: string, isAdmin: boolean) => {
  const response = await authenticatedRequest(`/admin/users/${uid}/admin`, {
    method: 'PUT',
    body: JSON.stringify({ isAdmin }),
  });
  return response.json();
};

export const processAttendance = async (eventId: string, attendeeEmails: string[]) => {
  const response = await authenticatedRequest(`/admin/events/${eventId}/attendance`, {
    method: 'POST',
    body: JSON.stringify({ attendeeEmails }),
  });
  return response.json();
};

// Health check
export const healthCheck = async () => {
  const response = await publicRequest('/health');
  return response.json();
};

