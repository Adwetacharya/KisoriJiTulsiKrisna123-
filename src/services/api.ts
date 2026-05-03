const API_BASE = '/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (res: Response) => {
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
    }
    data = { error: 'Invalid server response', raw: text };
  }

  if (!res.ok) {
    throw new Error(data?.error || `HTTP error! status: ${res.status}`);
  }
  return data;
};

export const api = {
  auth: {
    login: (data: any) => fetch(`${API_BASE}/auth/login`, { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }).then(handleResponse),
    register: (data: any) => fetch(`${API_BASE}/auth/register`, { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }).then(handleResponse),
    verifyInvite: (token: string) => fetch(`${API_BASE}/auth/verify-invite?token=${token}`).then(handleResponse),
    completeInvite: (data: any) => fetch(`${API_BASE}/auth/complete-invite`, { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }).then(handleResponse),
  },
  posts: {
    getAll: () => fetch(`${API_BASE}/posts`, { headers: getHeaders() }).then(handleResponse),
    create: (data: any) => fetch(`${API_BASE}/posts`, { method: 'POST', body: JSON.stringify(data), headers: getHeaders() }).then(handleResponse),
    update: (id: string, data: any) => fetch(`${API_BASE}/posts/${id}`, { method: 'PATCH', body: JSON.stringify(data), headers: getHeaders() }).then(handleResponse),
    like: (id: string) => fetch(`${API_BASE}/posts/${id}/like`, { method: 'POST', headers: getHeaders() }).then(handleResponse),
    getComments: (id: string) => fetch(`${API_BASE}/posts/${id}/comments`, { headers: getHeaders() }).then(handleResponse),
    addComment: (id: string, data: any) => fetch(`${API_BASE}/posts/${id}/comments`, { method: 'POST', body: JSON.stringify(data), headers: getHeaders() }).then(handleResponse),
  },
  users: {
    search: (params: string) => fetch(`${API_BASE}/users?${params}`, { headers: getHeaders() }).then(handleResponse),
    list: (params: string) => fetch(`${API_BASE}/users/admin-list?${params}`, { headers: getHeaders() }).then(handleResponse),
    updateProfile: (id: string, data: any) => fetch(`${API_BASE}/users/${id}`, { method: 'PATCH', body: JSON.stringify(data), headers: getHeaders() }).then(handleResponse),
    create: (data: any) => fetch(`${API_BASE}/users`, { method: 'POST', body: JSON.stringify(data), headers: getHeaders() }).then(handleResponse),
    delete: (id: string) => fetch(`${API_BASE}/users/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),
  },
  connections: {
    getStatus: (userId: string) => fetch(`${API_BASE}/connections/status/${userId}`, { headers: getHeaders() }).then(handleResponse),
    request: (userId: string) => fetch(`${API_BASE}/connections/request/${userId}`, { method: 'POST', headers: getHeaders() }).then(handleResponse),
    accept: (userId: string) => fetch(`${API_BASE}/connections/accept/${userId}`, { method: 'POST', headers: getHeaders() }).then(handleResponse),
    remove: (userId: string) => fetch(`${API_BASE}/connections/${userId}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),
    getConnections: () => fetch(`${API_BASE}/connections`, { headers: getHeaders() }).then(handleResponse),
  },
  messages: {
    get: (targetId: string) => fetch(`${API_BASE}/messages/${targetId}`, { headers: getHeaders() }).then(handleResponse),
    send: (targetId: string, content: string) => fetch(`${API_BASE}/messages/${targetId}`, { method: 'POST', body: JSON.stringify({ content }), headers: getHeaders() }).then(handleResponse),
  },
  academic: {
    getTimetable: (params: string) => fetch(`${API_BASE}/academic/timetable?${params}`, { headers: getHeaders() }).then(handleResponse),
    postTimetable: (data: any) => fetch(`${API_BASE}/academic/timetable`, { method: 'POST', body: JSON.stringify(data), headers: getHeaders() }).then(handleResponse),
    submitComplaint: (data: any) => fetch(`${API_BASE}/academic/complaints`, { method: 'POST', body: JSON.stringify(data), headers: getHeaders() }).then(handleResponse),
    getComplaints: () => fetch(`${API_BASE}/academic/complaints`, { headers: getHeaders() }).then(handleResponse),
    updateComplaintStatus: (id: string, status: string) => fetch(`${API_BASE}/academic/complaints/${id}`, { method: 'PATCH', body: JSON.stringify({ status }), headers: getHeaders() }).then(handleResponse),
    submitLeave: (data: any) => fetch(`${API_BASE}/academic/leave`, { method: 'POST', body: JSON.stringify(data), headers: getHeaders() }).then(handleResponse),
    getLeaves: () => fetch(`${API_BASE}/academic/leave`, { headers: getHeaders() }).then(handleResponse),
    updateLeaveStatus: (id: string, status: string) => fetch(`${API_BASE}/academic/leave/${id}`, { method: 'PATCH', body: JSON.stringify({ status }), headers: getHeaders() }).then(handleResponse),
    reportAbsence: (date: string) => fetch(`${API_BASE}/academic/absence`, { method: 'POST', body: JSON.stringify({ date }), headers: getHeaders() }).then(handleResponse),
    getAbsences: () => fetch(`${API_BASE}/academic/absence`, { headers: getHeaders() }).then(handleResponse),
    assignSubstitute: (absenceId: string, substituteId: string) => fetch(`${API_BASE}/academic/absence/${absenceId}`, { method: 'PATCH', body: JSON.stringify({ substitute_id: substituteId }), headers: getHeaders() }).then(handleResponse),
  },
  groups: {
    getAll: () => fetch(`${API_BASE}/groups`, { headers: getHeaders() }).then(handleResponse),
    seed: () => fetch(`${API_BASE}/groups/seed`, { method: 'POST', headers: getHeaders() }).then(handleResponse),
    getPosts: (id: string) => fetch(`${API_BASE}/groups/${id}/posts`, { headers: getHeaders() }).then(handleResponse),
    createPost: (id: string, data: any) => fetch(`${API_BASE}/groups/${id}/posts`, { method: 'POST', body: JSON.stringify(data), headers: getHeaders() }).then(handleResponse),
  },
  notifications: {
    getAll: () => fetch(`${API_BASE}/notifications`, { headers: getHeaders() }).then(handleResponse),
    markAsRead: (id: string) => fetch(`${API_BASE}/notifications/${id}/read`, { method: 'PATCH', headers: getHeaders() }).then(handleResponse),
    markAllAsRead: () => fetch(`${API_BASE}/notifications/read-all`, { method: 'POST', headers: getHeaders() }).then(handleResponse),
  }
};
