"use client";

import React from 'react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { Rocket, Shield, Zap, ArrowRight, Github } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const { connected } = useWallet();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-blue-500/30">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
          Shoujiki
        </div>
        <div className="flex items-center gap-6">
          <a href="#" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Documentation</a>
          <WalletMultiButton />
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-8 pt-20 pb-32 max-w-7xl mx-auto text-center overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full -z-10" />
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-400 mb-8">
          <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          Beta now live on Solana Devnet
        </div>

        <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
          The Decentralized <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
            AI Agent Marketplace
          </span>
        </h1>

        <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed">
          Deploy, discover, and execute high-performance AI agents with on-chain payments and sandboxed security. Built for the future of autonomous computing.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button 
            size="lg" 
            className="w-full sm:w-auto px-8 h-14 text-lg gap-2 shadow-[0_0_30px_rgba(37,99,235,0.3)]"
            onClick={() => router.push('/dashboard/marketplace')}
          >
            Enter Marketplace
            <ArrowRight size={20} />
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            className="w-full sm:w-auto px-8 h-14 text-lg gap-2"
            onClick={() => window.open('https://github.com', '_blank')}
          >
            <Github size={20} />
            View Source
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-8 py-24 max-w-7xl mx-auto border-t border-zinc-900">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4 p-8 rounded-2xl bg-zinc-900/30 border border-zinc-800/50">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Zap size={24} fill="currentColor" />
            </div>
            <h3 className="text-xl font-bold">Instant Execution</h3>
            <p className="text-zinc-400 leading-relaxed text-sm">
              Connect your wallet and run agents instantly. Payments are handled via Solana for micro-second finality and ultra-low fees.
            </p>
          </div>

          <div className="space-y-4 p-8 rounded-2xl bg-zinc-900/30 border border-zinc-800/50">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Shield size={24} />
            </div>
            <h3 className="text-xl font-bold">Secure Sandboxing</h3>
            <p className="text-zinc-400 leading-relaxed text-sm">
              All agent code runs in isolated, resource-limited environments. Your data and privacy are protected by default.
            </p>
          </div>

          <div className="space-y-4 p-8 rounded-2xl bg-zinc-900/30 border border-zinc-800/50">
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400">
              <Rocket size={24} />
            </div>
            <h3 className="text-xl font-bold">Developer First</h3>
            <p className="text-zinc-400 leading-relaxed text-sm">
              Deploy agents using pure Python. Monetize your AI models directly from the UI without complex backend infrastructure.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-12 max-w-7xl mx-auto text-center border-t border-zinc-900">
        <p className="text-zinc-500 text-sm">
          &copy; 2026 Shoujiki. Built with ❤️ on Solana.
        </p>
      </footer>
    </div>
  );
}
