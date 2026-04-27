"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Code2, Layers, Zap, Activity, Database, LayoutGrid, Wallet, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const navItems = [
  { label: 'Overview', href: '/my-agents', icon: LayoutGrid },
  { label: 'Marketplace', href: '/marketplace', icon: ShoppingCart },
  { label: 'Swarms', href: '/swarms', icon: Layers },
  { label: 'Developer', href: '/dev', icon: Code2 },
  { label: 'App Wallet', href: '/wallet', icon: Wallet },
  { label: 'Agent Finance', href: '/wallet', icon: Landmark },
];

export const Sidebar = () => {
  const pathname = usePathname();
  const [stats, setStats] = useState({ active_agents: 0, total_executions: 0, total_volume: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(`${API_URL}/stats`);
        setStats(res.data);
      } catch (err) {
        console.error("Stats fetch failed");
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="w-64 border-r border-zinc-900 flex flex-col h-screen sticky top-0 bg-[#050505] z-40 font-sans">
      {/* Brand Header */}
      <div className="px-8 py-10">
        <Link href="/" className="flex items-center gap-3 transition-all hover:opacity-80">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <Zap size={18} className="text-black" fill="currentColor" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">
            Shoujiki
          </span>
        </Link>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-4 space-y-1">
        <div className="mb-4 px-4">
           <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-[0.2em]">Navigation</p>
        </div>
        
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                isActive
                  ? 'bg-zinc-900 text-white border border-zinc-800'
                  : 'text-zinc-500 hover:text-white hover:bg-zinc-900/50'
              )}
            >
              <Icon size={16} className={cn(isActive ? 'text-white' : 'text-zinc-600 group-hover:text-zinc-400')} />
              {item.label}
            </Link>
          );
        })}

        {/* Main Navigation items above */}
      </nav>

      {/* Bottom Meta Stats */}
      <div className="p-6 mt-auto border-t border-zinc-900/50">
        <div className="flex flex-col gap-4">
           <div className="space-y-1">
              <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest leading-none">Cycles</p>
              <p className="text-sm font-medium text-zinc-300 font-mono">{stats.total_executions.toLocaleString()}</p>
           </div>
           <div className="space-y-1">
              <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest leading-none">Volume</p>
              <p className="text-sm font-medium text-zinc-300 font-mono">{stats.total_volume.toFixed(2)} SOL</p>
           </div>
           <div className="pt-2 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-tighter">Network Synced</span>
           </div>
        </div>
      </div>
    </aside>
  );
};
