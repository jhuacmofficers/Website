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

// User role API
export const getUserRole = async () => {
  const response = await authenticatedRequest('/user/role');
  return response.json();
};

// Admin API functions
export const getMembers = async () => {
  const response = await authenticatedRequest('/admin/members');
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

export const updateUserMemberStatus = async (uid: string, isMember: boolean) => {
  const response = await authenticatedRequest(`/admin/users/${uid}/member`, {
    method: 'PUT',
    body: JSON.stringify({ isMember }),
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

// Health check
export const healthCheck = async () => {
  const response = await fetch(`${API_BASE_URL}/health`);
  return response.json();
};

