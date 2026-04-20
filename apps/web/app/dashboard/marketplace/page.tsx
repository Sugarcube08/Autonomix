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
  const [filterVerified, setFilterVerified] = useState(false);
  const [category, setCategory] = useState('all');

  useEffect(() => {
    getAgents()
      .then(setAgents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredAgents = agents.filter((a: any) => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) || 
                         a.description?.toLowerCase().includes(search.toLowerCase());
    const matchesVerified = filterVerified ? !!a.mint_address : true;
    return matchesSearch && matchesVerified;
  });

  const categories = [
    { id: 'all', label: 'All Agents' },
    { id: 'trading', label: 'Trading' },
    { id: 'utility', label: 'Utility' },
    { id: 'social', label: 'Social' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Marketplace</h1>
          <p className="text-zinc-400">Discover and run high-performance AI agents on Solana.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setFilterVerified(!filterVerified)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
              filterVerified 
              ? 'bg-green-500/10 border-green-500/50 text-green-500' 
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            Verified Only
          </button>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <Input 
              placeholder="Search agents..." 
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              category === cat.id 
              ? 'bg-blue-600 text-white' 
              : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {cat.label}
          </button>
        ))}
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
