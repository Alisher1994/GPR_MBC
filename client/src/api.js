import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const auth = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  register: (username, password, role, companyName) => 
    api.post('/auth/register', { username, password, role, companyName }),
  getUsers: (role) => api.get('/auth/users', { params: { role } })
};

export const planner = {
  uploadXML: (formData) => api.post('/planner/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getObjects: () => api.get('/planner/objects'),
  getObjectDetails: (objectId) => api.get(`/planner/objects/${objectId}`),
  exportXML: (objectId) => api.get(`/planner/export/${objectId}`, {
    responseType: 'blob'
  }),
  exportCompletedXML: (objectId) => api.get(`/planner/export-completed/${objectId}`, {
    responseType: 'blob'
  }),
  deleteObject: (objectId) => api.delete(`/planner/objects/${objectId}`)
};

export const foreman = {
  getUpcomingWorks: (objectId, weeks = 2) => 
    api.get(`/foreman/upcoming-works/${objectId}`, { params: { weeks } }),
  assignWork: (workItemId, assignments, foremanId) =>
    api.post('/foreman/assign-work', { workItemId, assignments, foremanId }),
  getPendingApprovals: (foremanId) => api.get(`/foreman/pending-approvals/${foremanId}`),
  approveWork: (completedWorkId, foremanId, status, adjustedVolume, notes) =>
    api.post('/foreman/approve-work', { completedWorkId, foremanId, status, adjustedVolume, notes }),
  getMyAssignments: (foremanId) => api.get(`/foreman/my-assignments/${foremanId}`),
  getSentAssignments: (foremanId) => api.get(`/foreman/sent-assignments/${foremanId}`)
};

export const subcontractor = {
  getMyAssignments: (subcontractorId, status) =>
    api.get(`/subcontractor/my-assignments/${subcontractorId}`, { params: { status } }),
  submitWork: (assignmentId, completedVolume, workDate, notes, subcontractorId) =>
    api.post('/subcontractor/submit-work', { assignmentId, completedVolume, workDate, notes, subcontractorId }),
  getWorkHistory: (subcontractorId, fromDate, toDate) =>
    api.get(`/subcontractor/work-history/${subcontractorId}`, { params: { fromDate, toDate } }),
  getStatistics: (subcontractorId) => api.get(`/subcontractor/statistics/${subcontractorId}`)
};

export default api;
