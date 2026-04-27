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

export const getBillingConfig = async () => {
  const response = await api.get('/billing/config');
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

export const getMyAppWallet = async () => {
  const response = await api.get('/billing/wallet/me');
  return response.data;
};

export const getAgentCredit = async (agentId: string) => {
  const response = await api.get(`/billing/agent/${agentId}/credit`);
  return response.data;
};

export const refreshCreditScore = async (agentId: string) => {
  const response = await api.post(`/billing/agent/${agentId}/credit/refresh`);
  return response.data;
};

export const requestAgentLoan = async (agentId: string, amount: number) => {
  const response = await api.post(`/billing/agent/${agentId}/loans`, { amount });
  return response.data;
};

export const depositToAppWallet = async (amount: number) => {
  const response = await api.post('/billing/wallet/deposit', { amount });
  return response.data;
};

export const withdrawFromAppWallet = async (amount: number) => {
  const response = await api.post('/billing/wallet/withdraw', { amount });
  return response.data;
};

export const getMarketOrders = async (status: string = "open") => {
  const response = await api.get(`/marketplace/orders?status=${status}`);
  return response.data;
};

export const createMarketOrder = async (orderData: any) => {
  const response = await api.post('/marketplace/orders', orderData);
  return response.data;
};

export const placeBid = async (orderId: string, bidData: any) => {
  const response = await api.post(`/marketplace/orders/${orderId}/bids`, bidData);
  return response.data;
};

export const getOrderBids = async (orderId: string) => {
  const response = await api.get(`/marketplace/orders/${orderId}/bids`);
  return response.data;
};

export const acceptBid = async (orderId: string, bidId: string) => {
  const response = await api.post(`/marketplace/orders/${orderId}/bids/${bidId}/accept`);
  return response.data;
};

export const withdrawAgentBalance = async (id: string) => {
  const response = await api.post(`/billing/agent/${id}/withdraw`, {});
  return response.data;
};

export default api;
