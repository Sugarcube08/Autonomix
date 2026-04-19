import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
});

export const getAgents = async () => {
  const response = await api.get('/agents');
  return response.data;
};

export const loginWallet = async (publicKey: string, signature: string, message: string) => {
  const response = await api.post('/auth/verify', {
    public_key: publicKey,
    signature,
    message,
  });
  return response.data;
};

export const runAgent = async (agentId: string, inputData: any, txSignature: string, token: string) => {
  const response = await api.post('/agents/run', {
    agent_id: agentId,
    input_data: inputData,
    tx_signature: txSignature,
  }, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};
