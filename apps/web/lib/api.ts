import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
});

// Add interceptor to include JWT token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('shoujiki_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const loginWallet = async (public_key: string, signature: string, message: string) => {
  const response = await api.post('/auth/verify', { public_key, signature, message });
  localStorage.setItem('shoujiki_token', response.data.access_token);
  return response.data;
};

export const getAgents = async () => {
  const response = await api.get('/agents');
  return response.data;
};

export const getConfig = async () => {
  const response = await api.get('/config');
  return response.data;
};

export const getAgent = async (id: string) => {
  const response = await api.get(`/agents/${id}`);
  return response.data;
};

export const getMyAgents = async () => {
  const response = await api.get('/agents/me');
  return response.data;
};

export const deployAgent = async (agentData: any) => {
  const response = await api.post('/agents/deploy', agentData);
  return response.data;
};

export const deleteAgent = async (id: string) => {
  const response = await api.delete(`/agents/${id}`);
  return response.data;
};

export const testAgent = async (agentData: any) => {
  const response = await api.post('/agents/test', agentData);
  return response.data;
};

export const getInternalWallet = async () => {
  const response = await api.get('/billing/balance');
  return response.data;
};

export const depositFunds = async (txSignature: string) => {
  const response = await api.post('/billing/deposit', { tx_signature: txSignature });
  return response.data;
};

export const withdrawFunds = async (amount: number) => {
  const response = await api.post('/billing/withdraw', { amount });
  return response.data;
};

export const runAgent = async (
  agentId: string, 
  inputData: any, 
  taskId: string, 
  reference: string, 
  paymentType: string, 
  signature: string, 
  userWallet: string,
  txSignature: string,
  x402Sig?: string,
  x402Pubkey?: string
) => {
  const headers: Record<string, string> = {};
  if (x402Sig && x402Pubkey) {
    headers['X-Payment-Signature'] = x402Sig;
    headers['X-Payment-Pubkey'] = x402Pubkey;
  }

  const response = await api.post('/agents/run', {
    agent_id: agentId,
    input_data: inputData,
    task_id: taskId,
    reference,
    payment_type: paymentType,
    signature: txSignature 
  }, { headers });
  return response.data;
};

export const getTaskStatus = async (taskId: string) => {
  const response = await api.get(`/agents/tasks`);
  const tasks = response.data;
  return tasks.find((t: any) => t.id === taskId);
};

export const withdrawAgentBalance = async (id: string) => {
  const response = await api.post(`/billing/agent/${id}/withdraw`, {});
  return response.data;
};

export default api;
