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
  // Объекты
  getObjects: () => api.get('/planner/objects'),
  createObject: (data) => api.post('/planner/objects', data),
  deleteObject: (objectId) => api.delete(`/planner/objects/${objectId}`),
  
  // Очереди
  getQueues: (objectId) => api.get(`/planner/objects/${objectId}/queues`),
  createQueue: (objectId, data) => api.post(`/planner/objects/${objectId}/queues`, data),
  deleteQueue: (queueId) => api.delete(`/planner/queues/${queueId}`),
  
  // Секции (теперь привязаны к очередям)
  getSections: (queueId) => api.get(`/planner/queues/${queueId}/sections`),
  createSection: (queueId, data) => api.post(`/planner/queues/${queueId}/sections`, data),
  deleteSection: (sectionId) => api.delete(`/planner/sections/${sectionId}`),
  
  // XML файлы
  getXmlFiles: (sectionId) => api.get(`/planner/sections/${sectionId}/xml-files`),
  uploadXML: (sectionId, formData) => api.post(`/planner/sections/${sectionId}/upload-xml`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteXmlFile: (fileId) => api.delete(`/planner/xml-files/${fileId}`),
  getSectionWorks: (sectionId) => api.get(`/planner/sections/${sectionId}/works`),
  
  // Экспорт
  exportSection: (sectionId) => api.get(`/planner/sections/${sectionId}/export`, {
    responseType: 'blob'
  }),
  exportCompleted: (sectionId) => api.get(`/planner/sections/${sectionId}/export-completed`, {
    responseType: 'blob'
  })
};

export const foreman = {
  // Объекты, очереди и секции
  getObjects: () => api.get('/foreman/objects'),
  getQueues: (objectId) => api.get(`/foreman/objects/${objectId}/queues`),
  getSections: (queueId) => api.get(`/foreman/queues/${queueId}/sections`),
  getSectionWorks: (sectionId, weeks) => {
    const params = {};
    if (typeof weeks !== 'undefined' && weeks !== null) {
      params.weeks = weeks;
    }
    return api.get(`/foreman/sections/${sectionId}/works`, { params });
  },
  
  // Распределение работ
  assignWork: (workItemId, assignments, foremanId) =>
    api.post('/foreman/assign-work', { workItemId, assignments, foremanId }),
  
  // Подтверждения
  getPendingApprovals: (foremanId) => api.get(`/foreman/pending-approvals/${foremanId}`),
  getRejectedWorks: (foremanId) => api.get(`/foreman/rejected-works/${foremanId}`),
  approveWork: (completedWorkId, foremanId, status, adjustedVolume, notes) =>
    api.post('/foreman/approve-work', { completedWorkId, foremanId, status, adjustedVolume, notes }),
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
