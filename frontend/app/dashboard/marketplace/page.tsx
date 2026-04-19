"use client";

import React, { useEffect, useState } from 'react';
import { getAgents } from '@/lib/api';
import { AgentCard } from '@/components/agent/AgentCard';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';

export default function MarketplacePage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getAgents()
      .then(setAgents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredAgents = agents.filter((a: any) => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    a.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Marketplace</h1>
          <p className="text-zinc-400">Discover and run high-performance AI agents on Solana.</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <Input 
            placeholder="Search agents..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="animate-spin text-blue-500" size={40} />
          <p className="text-zinc-500 font-medium">Loading agents...</p>
        </div>
      ) : filteredAgents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent: any) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-800">
          <p className="text-zinc-500">No agents found matching your search.</p>
        </div>
      )}
    </div>
  );
}
