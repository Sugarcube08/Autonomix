"use client";

import React from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { Button } from '@/components/ui/Button';
import { LogOut } from 'lucide-react';
import NoSSR from '@/components/ui/NoSSR';

export const Navbar = () => {
  const { isAuthenticated, login, logout, loading, publicKey, connected } = useWalletAuth();

  return (
    <nav className="h-16 border-b border-zinc-800/40 flex items-center justify-between px-8 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-30">
      <div className="flex items-center gap-4">
        {/* Placeholder for Breadcrumbs or Search */}
        <div className="hidden md:flex items-center gap-2 text-zinc-500 text-sm">
           <span className="hover:text-zinc-300 cursor-pointer transition-colors">Platform</span>
           <span className="text-zinc-800">/</span>
           <span className="text-zinc-300 font-medium tracking-tight uppercase text-[10px]">Command_Center</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <NoSSR>
          {!connected ? (
            <div className="flex items-center bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800/60 transition-all hover:border-zinc-700">
               <WalletMultiButton className="!bg-transparent !h-10 !px-4 !text-xs !font-bold !text-zinc-100 !transition-none !shadow-none !border-none" />
            </div>
          ) : !isAuthenticated ? (
            <Button 
              size="sm"
              onClick={login} 
              isLoading={loading}
              className="rounded-lg h-10 px-6"
            >
              Sign Message to Auth
            </Button>
          ) : (
            <div className="flex items-center gap-3">
               <div className="hidden sm:flex flex-col items-end mr-1">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Status</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-green-500" />
                    <span className="text-[10px] font-bold text-zinc-300">Authorized</span>
                  </div>
               </div>
               
               <div className="h-8 w-px bg-zinc-800/60 mx-2" />
               
               <button 
                 onClick={logout}
                 className="p-2 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800/50 rounded-lg transition-all"
                 title="Disconnect Session"
               >
                 <LogOut size={16} />
               </button>
            </div>
          )}
        </NoSSR>
      </div>
    </nav>
  );
};
