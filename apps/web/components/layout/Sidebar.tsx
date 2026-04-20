"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingCart, Code2, History, User2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { label: 'Marketplace', href: '/dashboard/marketplace', icon: ShoppingCart },
  { label: 'My Agents', href: '/dashboard/my-agents', icon: User2 },
  { label: 'Deploy Agent', href: '/dashboard/deploy', icon: Code2 },
  { label: 'Activity', href: '/dashboard/activity', icon: History },
];

export const Sidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-zinc-800 flex flex-col h-screen sticky top-0 bg-zinc-950/50 backdrop-blur-xl">
      <div className="p-8">
        <Link href="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
          Shoujiki
        </Link>
      </div>
      
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all group',
                isActive 
                  ? 'bg-blue-600/10 text-blue-400 shadow-[inset_0_0_20px_rgba(37,99,235,0.1)]' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              )}
            >
              <Icon size={20} className={cn(isActive ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-300')} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-zinc-900">
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
          <p className="text-xs text-zinc-500 mb-1">Developer Tier</p>
          <p className="text-sm font-semibold text-zinc-200">Free Beta</p>
        </div>
      </div>
    </aside>
  );
};
