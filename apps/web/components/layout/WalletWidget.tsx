"use client";

import React, { useState, useEffect } from 'react';
import { getInternalWallet, depositFunds, withdrawFunds } from '@/lib/api';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { 
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  RefreshCw, 
  ExternalLink,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { PLATFORM_WALLET } from '@/lib/solana';
import { Alert } from '@/components/ui/Alert';

export const WalletWidget = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { isAuthenticated } = useWalletAuth();
  
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('0.1');
  const [status, setStatus] = useState<'idle' | 'depositing' | 'withdrawing'>('idle');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchBalance = async () => {
    if (!isAuthenticated) return;
    try {
      const data = await getInternalWallet();
      setBalance(data.balance);
    } catch (err) {
      console.error("Wallet fetch failed:", err);
    }
  };

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleDeposit = async () => {
    if (!publicKey) return;
    setStatus('depositing');
    setError('');
    
    try {
      const lamports = parseFloat(amount) * LAMPORTS_PER_SOL;
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(PLATFORM_WALLET),
          lamports,
        })
      );

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      
      const res = await depositFunds(signature);
      setSuccess(res.message);
      fetchBalance();
    } catch (err: any) {
      setError(err.message || 'Deposit failed');
    } finally {
      setStatus('idle');
    }
  };

  const handleWithdraw = async () => {
    if (!publicKey) return;
    setStatus('withdrawing');
    setError('');
    
    try {
      const res = await withdrawFunds(parseFloat(amount));
      setSuccess(`Withdrawal successful! TX: ${res.tx_signature.slice(0, 8)}...`);
      fetchBalance();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Withdrawal failed');
    } finally {
      setStatus('idle');
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="px-6 py-4 space-y-4">
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-[28px] p-6 shadow-2xl relative overflow-hidden group">
         {/* Background Glow */}
         <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-600/10 blur-[50px] rounded-full" />
         
         <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                  <Wallet size={20} className="text-white" />
               </div>
               <div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">In-App Balance</p>
                  <p className="text-2xl font-black text-white mt-1.5 tracking-tighter">
                    {balance.toFixed(3)} <span className="text-blue-500 text-xs">SOL</span>
                  </p>
               </div>
            </div>
            <button onClick={fetchBalance} className="text-zinc-600 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg">
               <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
         </div>

         <div className="mt-6 space-y-4 relative z-10">
            <div className="relative">
               <input 
                 type="number"
                 step="0.1"
                 value={amount}
                 onChange={(e) => setAmount(e.target.value)}
                 className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-mono text-white outline-none focus:border-blue-500/50 transition-all shadow-inner"
                 placeholder="Amount"
               />
               <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-600 uppercase">SOL</span>
            </div>

            <div className="flex gap-2">
               <Button 
                 onClick={handleDeposit} 
                 disabled={status !== 'idle'} 
                 className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-500 font-black text-[10px] tracking-widest gap-2"
               >
                 {status === 'depositing' ? <RefreshCw size={14} className="animate-spin" /> : <ArrowUpCircle size={14} />}
                 DEPOSIT
               </Button>
               <Button 
                 variant="outline"
                 onClick={handleWithdraw} 
                 disabled={status !== 'idle' || balance <= 0}
                 className="flex-1 h-12 rounded-xl border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 font-black text-[10px] tracking-widest gap-2"
               >
                 {status === 'withdrawing' ? <RefreshCw size={14} className="animate-spin" /> : <ArrowDownCircle size={14} />}
                 WITHDRAW
               </Button>
            </div>
         </div>

         <div className="mt-5 flex items-center gap-2 px-3 py-2 bg-zinc-950/50 border border-zinc-800/50 rounded-xl">
            <ShieldCheck size={12} className="text-blue-500/50" />
            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Protocol-Level Escrow</span>
         </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}
    </div>
  );
};
