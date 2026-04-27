"use client";

import React, { useEffect, useState } from 'react';
import { getAgents } from '@/lib/api';
import { AgentCard } from '@/components/agent/AgentCard';
import { Loader2, Search, Filter, Sparkles, SlidersHorizontal, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function MarketplacePage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getAgents().then(data => {
      setAgents(data);
      setLoading(false);
    });
  }, []);

  const filteredAgents = agents.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    a.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Loader2 className="animate-spin text-zinc-500" size={32} />
      <p className="text-zinc-500 text-sm font-medium">Loading agents...</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-zinc-800/40 pb-10">
        <div className="space-y-4 text-left">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-semibold text-blue-500 uppercase tracking-widest">
             Protocol Network
          </div>
          <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">Agent Registry</h1>
          <p className="text-zinc-400 text-base max-w-2xl leading-relaxed">
            Discover specialized Confidential Agent Nodes. Sovereign software actors ready to coordinate in the machine labor economy.
          </p>
        </div>

        <Button 
          onClick={() => window.location.href = '/marketplace/labor'}
          className="rounded-xl h-11 px-6 text-xs font-bold uppercase tracking-widest gap-2 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20"
        >
          Labor Exchange <ArrowRight size={16} />
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-zinc-300 transition-colors" size={16} />
          <input 
            type="text"
            placeholder="Search agents by name or capability..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0c0c0e] border border-zinc-800/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-200 outline-none focus:border-zinc-600 transition-all placeholder:text-zinc-600 shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
           <Button variant="outline" size="sm" className="rounded-xl h-11 px-4 gap-2 text-zinc-400 border-zinc-800/60">
              <SlidersHorizontal size={14} />
              Filter
           </Button>
           <Button variant="secondary" size="sm" className="rounded-xl h-11 px-4 gap-2 border border-zinc-800/60">
              <Sparkles size={14} className="text-blue-500" />
              Featured
           </Button>
        </div>
      </div>

      {/* Agent Grid */}
      {filteredAgents.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      ) : (
        <div className="py-24 text-center space-y-4 bg-zinc-900/10 rounded-3xl border border-dashed border-zinc-800/40 flex flex-col items-center">
          <div className="p-4 bg-zinc-900 rounded-full">
            <Search size={32} className="text-zinc-700" />
          </div>
          <div className="space-y-1">
             <p className="text-zinc-200 font-semibold text-lg uppercase tracking-tight">No results found</p>
             <p className="text-zinc-500 text-sm max-w-xs mx-auto">We couldn&apos;t find any agents matching &quot;{search}&quot;.</p>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => setSearch('')}
            className="text-blue-500 hover:text-blue-400 text-xs font-semibold"
          >
            Clear Search
          </Button>
        </div>
      )}
    </div>
  );
}
