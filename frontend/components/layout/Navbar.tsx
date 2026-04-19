"use client";

import React from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { Button } from '@/components/ui/Button';
import { Loader2, LogIn } from 'lucide-react';

export const Navbar = () => {
  const { connected, isAuthenticated, login, loading, publicKey } = useWalletAuth();

  return (
    <nav className="h-20 border-b border-zinc-800 flex items-center justify-between px-8 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-30">
      <div className="flex items-center gap-4">
        {/* Breadcrumbs or Page Title can go here */}
      </div>

      <div className="flex items-center gap-4">
        <WalletMultiButton />
        
        {connected && !isAuthenticated && (
          <Button 
            onClick={login} 
            isLoading={loading}
            variant="primary"
            className="gap-2"
          >
            <LogIn size={18} />
            Authenticate API
          </Button>
        )}

        {isAuthenticated && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-mono text-green-500">Authenticated</span>
          </div>
        )}
      </div>
    </nav>
  );
};
