"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, TextArea } from '@/components/ui/Input';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { deployAgent } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Code2, Rocket, AlertCircle } from 'lucide-react';
import { useWalletAuth } from '@/hooks/useWalletAuth';

export default function DeployPage() {
  const router = useRouter();
  const { isAuthenticated, login, connected } = useWalletAuth();
  
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    price: 0.01,
    code: `class Agent:
    def run(self, input_data):
        # Your logic here
        return {"message": "Hello from " + self.__class__.__name__}

agent = Agent()`
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return;
    
    setError('');
    setLoading(true);
    try {
      await deployAgent(formData);
      router.push('/dashboard/my-agents');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Deployment failed');
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 bg-zinc-900/50 rounded-2xl border border-zinc-800">
        <AlertCircle size={48} className="text-zinc-500" />
        <div className="text-center">
          <h2 className="text-xl font-bold">Wallet Not Connected</h2>
          <p className="text-zinc-400">Please connect your Solana wallet to deploy agents.</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 bg-zinc-900/50 rounded-2xl border border-zinc-800">
        <Rocket size={48} className="text-blue-500" />
        <div className="text-center">
          <h2 className="text-xl font-bold">Authentication Required</h2>
          <p className="text-zinc-400 mb-6">You need to sign a message to authenticate with the API.</p>
          <Button onClick={login}>Authenticate Now</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Deploy New Agent</h1>
        <p className="text-zinc-400">Ship your AI logic to the Shoujiki network in seconds.</p>
      </div>

      <form onSubmit={handleDeploy} className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <h3 className="font-bold">Metadata</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input 
                label="Agent ID" 
                placeholder="e.g. sentiment-analyzer" 
                required
                value={formData.id}
                onChange={e => setFormData({...formData, id: e.target.value})}
              />
              <Input 
                label="Display Name" 
                placeholder="e.g. Sentiment Pro" 
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
              <Input 
                label="Price (SOL)" 
                type="number" 
                step="0.001" 
                required
                value={formData.price}
                onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
              />
              <TextArea 
                label="Description" 
                placeholder="What does your agent do?"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row justify-between items-center">
              <div className="flex items-center gap-2">
                <Code2 size={20} className="text-blue-400" />
                <h3 className="font-bold">Python Code</h3>
              </div>
              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded uppercase tracking-wider font-bold">
                Python 3.11
              </span>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <textarea
                className="w-full h-[400px] bg-zinc-950 p-6 font-mono text-sm outline-none resize-none border-b border-zinc-800"
                value={formData.code}
                onChange={e => setFormData({...formData, code: e.target.value})}
                spellCheck={false}
              />
            </CardContent>
            <div className="p-6">
              {error && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm flex gap-2 items-center">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
              <Button 
                type="submit" 
                className="w-full h-12 text-lg gap-2" 
                isLoading={loading}
              >
                <Rocket size={20} />
                Deploy to Network
              </Button>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}
