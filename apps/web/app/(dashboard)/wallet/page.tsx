"use client";

import React, { useEffect, useState } from 'react';
import { getMyAppWallet, depositToAppWallet, withdrawFromAppWallet, getMyAgents } from '@/lib/api';
import { Loader2, Wallet, ArrowUpCircle, ArrowDownCircle, Shield, CreditCard, Activity, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { Alert } from '@/components/ui/Alert';
import { Input } from '@/components/ui/Input';
import { truncateWallet } from '@/lib/utils';

export default function WalletPage() {
  const { isAuthenticated, connected, login } = useWalletAuth();
  
  const [wallet, setWallet] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('0.1');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = async () => {
    try {
      const [walletData, agentData] = await Promise.all([
        getMyAppWallet(),
        getMyAgents()
      ]);
      setWallet(walletData);
      setAgents(agentData.filter((a: any) => !!a.id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const handleDeposit = async () => {
    setActionLoading(true);
    setError('');
    try {
      await depositToAppWallet(parseFloat(amount));
      setSuccess(`Successfully deposited ${amount} SOL to App Wallet.`);
      fetchData();
    } catch (err: any) {
      setError('Deposit failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdraw = async () => {
    setActionLoading(true);
    setError('');
    try {
      await withdrawFromAppWallet(parseFloat(amount));
      setSuccess(`Withdrawal of ${amount} SOL initiated.`);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Withdrawal failed.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-6 animate-in fade-in duration-500">
        <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-zinc-600">
          <Shield size={24} />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-lg font-semibold text-zinc-100 uppercase tracking-tight">Financial Access Required</h2>
          <p className="text-zinc-500 text-sm">Link your wallet to manage your AgentOS treasury.</p>
        </div>
        <Button onClick={login} className="rounded-full px-8 h-11">Connect Wallet</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <Loader2 className="animate-spin text-zinc-700" size={24} />
        <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">Accessing Secure Ledger...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24 text-left">
      <div className="space-y-1.5 pb-8 border-b border-zinc-900">
        <h1 className="text-3xl font-semibold text-zinc-100 tracking-tight">App Wallet</h1>
        <p className="text-zinc-400 text-sm font-medium leading-relaxed">
          Manage your Layer 2 balances and agent treasury allowances.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Balance Card */}
        <Card className="lg:col-span-1 bg-[#0c0c0e] border-zinc-800/60 shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5">
             <Wallet size={120} />
          </div>
          <CardHeader className="pb-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Available Balance</span>
          </CardHeader>
          <CardContent className="space-y-6 relative z-10">
            <div>
              <h2 className="text-4xl font-bold text-white tracking-tighter">
                {wallet?.balance?.toFixed(4)} <span className="text-lg text-zinc-500 font-medium">SOL</span>
              </h2>
              <p className="text-[10px] text-zinc-600 font-mono mt-1 uppercase tracking-tighter">
                Vault: {truncateWallet(wallet?.wallet_address)}
              </p>
            </div>

            <div className="space-y-3 pt-4">
               <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest px-1">Amount</span>
                  <Input 
                    type="number" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-zinc-900/50 border-zinc-800 text-white font-mono h-11"
                    placeholder="0.1"
                  />
               </div>
               <div className="flex gap-2">
                  <Button 
                    onClick={handleDeposit} 
                    disabled={actionLoading}
                    className="flex-1 h-11 bg-blue-600 hover:bg-blue-500 text-white rounded-xl gap-2 font-bold text-[11px] uppercase tracking-widest"
                  >
                    <ArrowDownCircle size={16} /> Deposit
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleWithdraw} 
                    disabled={actionLoading}
                    className="flex-1 h-11 border-zinc-800 bg-transparent hover:bg-zinc-900 text-zinc-300 rounded-xl gap-2 font-bold text-[11px] uppercase tracking-widest"
                  >
                    <ArrowUpCircle size={16} /> Withdraw
                  </Button>
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Treasury Fleet Stats */}
        <div className="lg:col-span-2 space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-zinc-900/20 border-zinc-800/40 p-6">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                       <Cpu size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Active Treasuries</span>
                 </div>
                 <p className="text-2xl font-bold text-white">{agents.length}</p>
                 <p className="text-[10px] text-zinc-600 uppercase mt-1">Sovereign agent nodes managed</p>
              </Card>

              <Card className="bg-zinc-900/20 border-zinc-800/40 p-6">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-green-500/10 rounded-lg text-green-400">
                       <Activity size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total Fleet Earnings</span>
                 </div>
                 <p className="text-2xl font-bold text-white">
                    {agents.reduce((acc, a) => acc + (a.total_earnings || 0), 0).toFixed(4)} <span className="text-xs text-zinc-500">SOL</span>
                 </p>
                 <p className="text-[10px] text-zinc-600 uppercase mt-1">Aggregated protocol revenue</p>
              </Card>
           </div>

           {/* Agent Allowances Table */}
           <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                 <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Shield size={14} className="text-zinc-600" />
                    Agent Allowances (L2)
                 </h3>
                 <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-tighter">Verified State</span>
              </div>
              
              <div className="bg-[#0c0c0e] border border-zinc-800/60 rounded-2xl overflow-hidden shadow-2xl">
                 <table className="w-full text-left border-collapse">
                    <thead>
                       <tr className="bg-zinc-900/40 border-b border-zinc-800/60">
                          <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Agent</th>
                          <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Vault PDA</th>
                          <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest text-right">Allowance</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                       {agents.length > 0 ? agents.map((agent) => (
                          <tr key={agent.id} className="hover:bg-zinc-900/20 transition-colors group">
                             <td className="px-6 py-4 text-xs font-semibold text-zinc-200">
                                {agent.name}
                                <span className="block text-[10px] text-zinc-600 font-mono mt-0.5">{agent.id.slice(0, 8)}...</span>
                             </td>
                             <td className="px-6 py-4 text-[10px] font-mono text-zinc-500">
                                {truncateWallet(agent.squads_vault_pda)}
                             </td>
                             <td className="px-6 py-4 text-right">
                                <span className="text-xs font-mono text-zinc-400">
                                   {wallet?.allowances?.[agent.id] !== undefined 
                                      ? `${wallet.allowances[agent.id].toFixed(2)} SOL` 
                                      : "Unlimited"}
                                </span>
                             </td>
                          </tr>
                       )) : (
                          <tr>
                             <td colSpan={3} className="px-6 py-12 text-center text-[10px] font-bold text-zinc-700 uppercase tracking-widest">
                                No active treasuries found in network index
                             </td>
                          </tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}
    </div>
  );
}
