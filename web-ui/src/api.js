import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// Upload job management
export async function getUploadJobStatus(jobId) {
  const response = await api.get(`/upload-jobs/${jobId}`);
  return response.data;
}

export async function getActiveUploadJob() {
  const response = await api.get('/upload-jobs/active');
  return response.data;
}

export async function stopUploadJob(jobId) {
  const response = await api.post(`/upload-jobs/${jobId}/stop`);
  return response.data;
}

export default api
