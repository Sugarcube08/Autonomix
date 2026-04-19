"use client";

import React, { useEffect, useState } from 'react';
import { getMyAgents } from '@/lib/api';
import { AgentCard } from '@/components/agent/AgentCard';
import { Loader2, Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useWalletAuth } from '@/hooks/useWalletAuth';

export default function MyAgentsPage() {
  const router = useRouter();
  const { isAuthenticated, login, connected } = useWalletAuth();
  
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      getMyAgents()
        .then(setAgents)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 bg-zinc-900/50 rounded-2xl border border-zinc-800">
        <AlertCircle size={48} className="text-zinc-500" />
        <div className="text-center">
          <h2 className="text-xl font-bold">Wallet Not Connected</h2>
          <p className="text-zinc-400">Please connect your Solana wallet to view your agents.</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 bg-zinc-900/50 rounded-2xl border border-zinc-800">
        <AlertCircle size={48} className="text-blue-500" />
        <div className="text-center">
          <h2 className="text-xl font-bold">Authentication Required</h2>
          <p className="text-zinc-400 mb-6">Login to view and manage your deployed agents.</p>
          <Button onClick={login}>Authenticate Now</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Agents</h1>
          <p className="text-zinc-400">Manage your deployed AI agents and track their performance.</p>
        </div>
        
        <Button onClick={() => router.push('/dashboard/deploy')} className="gap-2">
          <Plus size={20} />
          New Agent
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="animate-spin text-blue-500" size={40} />
          <p className="text-zinc-500 font-medium">Loading your agents...</p>
        </div>
      ) : agents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent: any) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-800 flex flex-col items-center gap-4">
          <p className="text-zinc-500">You haven't deployed any agents yet.</p>
          <Button variant="outline" onClick={() => router.push('/dashboard/deploy')}>
            Deploy your first agent
          </Button>
        </div>
      )}
    </div>
  );
}
