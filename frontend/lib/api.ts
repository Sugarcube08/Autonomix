import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
});

// Add interceptor to include JWT token if available
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('shoujiki_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const getAgents = async () => {
  const response = await api.get('/agents');
  return response.data;
};

export const getMyAgents = async () => {
  const response = await api.get('/agents/me');
  return response.data;
};

export const getMyTasks = async () => {
  const response = await api.get('/agents/tasks');
  return response.data;
};

export const getAgent = async (id: string) => {
  const response = await api.get(`/agents/${id}`);
  return response.data;
};

export const deployAgent = async (agentData: any) => {
  const response = await api.post('/agents/deploy', agentData);
  return response.data;
};

export const testAgent = async (agentData: any) => {
  const response = await api.post('/agents/test', agentData);
  return response.data;
};

export const deleteAgent = async (id: string) => {
  const response = await api.delete(`/agents/${id}`);
  return response.data;
};

export const loginWallet = async (publicKey: string, signature: string, message: string) => {
  const response = await api.post('/auth/verify', {
    public_key: publicKey,
    signature,
    message,
  });
  // Store token in localStorage
  if (response.data.access_token) {
    localStorage.setItem('shoujiki_token', response.data.access_token);
  }
  return response.data;
};

export const runAgent = async (agentId: string, inputData: any, taskId: string) => {
  const response = await api.post('/agents/run', {
    agent_id: agentId,
    input_data: inputData,
    task_id: taskId,
  });
  return response.data;
};

export default api;
