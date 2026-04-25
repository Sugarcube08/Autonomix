"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingCart, Code2, User2, Zap, Rocket, Activity, Globe, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WalletWidget } from './WalletWidget';

const navItems = [
  { label: 'Marketplace', href: '/marketplace', icon: ShoppingCart },
  { label: 'Swarms', href: '/swarms', icon: Rocket },
  { label: 'My Agents', href: '/my-agents', icon: User2 },
  { label: 'Dev Space', href: '/dev', icon: Code2 },
];

export const Sidebar = () => {
  const pathname = usePathname();
  const [nodes, setNodes] = useState(128);

  useEffect(() => {
    const interval = setInterval(() => {
      setNodes(prev => prev + Math.floor(Math.random() * 3) - 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="w-72 border-r border-zinc-900/80 flex flex-col h-screen sticky top-0 bg-zinc-950/80 backdrop-blur-3xl z-40">
      <div className="p-10 flex flex-col gap-1">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)] group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 border-t border-white/20">
            <Zap size={22} className="text-white" fill="currentColor" />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black text-white tracking-tighter leading-none">
              Shoujiki
            </span>
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">
              OS_CORE_V3
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-6 py-4 space-y-2">
        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-4 mb-4">Command_Menu</p>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-4 px-5 py-4 rounded-[20px] font-black text-xs transition-all relative group overflow-hidden uppercase tracking-wider',
                isActive
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.05)]'
                  : 'text-zinc-600 hover:text-zinc-200 hover:bg-zinc-900/50'
              )}
            >
              <Icon size={18} className={cn('transition-colors', isActive ? 'text-blue-500' : 'text-zinc-700 group-hover:text-zinc-400')} />
              {item.label}
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
              )}
            </Link>
          );
        })}
      </nav>

      <WalletWidget />

      <div className="p-6 space-y-4">
        {/* Network Status Card */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-[24px] p-5 space-y-4 shadow-inner relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
            <Globe size={48} className="text-blue-500" />
          </div>
          
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center border border-green-500/20">
              <Activity size={14} className="text-green-500 animate-pulse" />
            </div>
            <div>
              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest leading-none">Network</p>
              <p className="text-[11px] font-black text-white uppercase mt-1 tracking-tight">Mainnet_Shadow</p>
            </div>
          </div>

          <div className="space-y-2 relative z-10">
             <div className="flex justify-between text-[9px] font-black uppercase tracking-tighter text-zinc-500">
               <span>Active Nodes</span>
               <span className="text-zinc-300 font-mono">{nodes}</span>
             </div>
             <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
               <div className="w-2/3 h-full bg-gradient-to-r from-blue-600 to-purple-600 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
             </div>
          </div>
        </div>

        {/* Security Badge */}
        <div className="px-5 py-3 flex items-center gap-3 bg-blue-600/5 border border-blue-500/10 rounded-2xl">
           <ShieldCheck size={14} className="text-blue-500/50" />
           <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">AES-256 Verified</span>
        </div>
      </div>
    </aside>
  );
};
