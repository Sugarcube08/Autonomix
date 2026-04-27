"use client";

import React, { useEffect, useState } from 'react';
import { getMarketOrders, createMarketOrder, getMyAgents, placeBid, getOrderBids, acceptBid } from '@/lib/api';
import { 
  Loader2, Plus, Gavel, Briefcase, Clock, 
  CheckCircle2, AlertCircle, Search, Filter, 
  ArrowLeft, Send, User, ShieldCheck, Cpu
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { Alert } from '@/components/ui/Alert';
import { cn, truncateWallet } from '@/lib/utils';
import Link from 'next/link';

export default function LaborExchangePage() {
  const { connected, isAuthenticated, login, public_key } = useWalletAuth();
  
  const [orders, setOrders] = useState<any[]>([]);
  const [myAgents, setMyAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // New Order State
  const [isCreating, setIsCreating] = useState(false);
  const [newOrder, setNewOrder] = useState({ title: '', description: '', budget: '0.1' });

  // Bidding State
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [isBidding, setIsBidding] = useState(false);
  const [bidAmount, setBidAmount] = useState('0.05');
  const [selectedAgentId, setSelectedAgentId] = useState('');

  const fetchData = async () => {
    try {
      const ordersData = await getMarketOrders();
      setOrders(ordersData);
      if (isAuthenticated) {
        const agentsData = await getMyAgents();
        setMyAgents(agentsData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAuthenticated]);

  const handleCreateOrder = async () => {
    if (!newOrder.title || !newOrder.budget) return;
    setIsCreating(true);
    try {
      await createMarketOrder({
        ...newOrder,
        budget: parseFloat(newOrder.budget)
      });
      setSuccess("Market order posted successfully.");
      setNewOrder({ title: '', description: '', budget: '0.1' });
      fetchData();
    } catch (err) {
      setError("Failed to post order.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenBids = async (orderId: string) => {
    setSelectedOrderId(orderId);
    try {
      const bidsData = await getOrderBids(orderId);
      setBids(bidsData);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePlaceBid = async () => {
    if (!selectedOrderId || !selectedAgentId || !bidAmount) return;
    setIsBidding(true);
    try {
      await placeBid(selectedOrderId, {
        agent_id: selectedAgentId,
        amount: parseFloat(bidAmount),
        proposal: "Autonomous node ready for deployment."
      });
      setSuccess("Bid placed successfully.");
      handleOpenBids(selectedOrderId);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to place bid.");
    } finally {
      setIsBidding(false);
    }
  };

  const handleAcceptBid = async (orderId: string, bidId: string) => {
    try {
      await acceptBid(orderId, bidId);
      setSuccess("Bid accepted. Task is now active.");
      fetchData();
      setSelectedOrderId(null);
    } catch (err) {
      setError("Failed to accept bid.");
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <Loader2 className="animate-spin text-zinc-600" size={24} />
      <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Accessing Market Tape...</span>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24 text-left">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-zinc-900 pb-10">
        <div className="space-y-2">
          <Link href="/marketplace" className="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest mb-2">
            <ArrowLeft size={14} /> Back to Registry
          </Link>
          <h1 className="text-3xl font-bold text-white tracking-tight">Labor Exchange</h1>
          <p className="text-zinc-400 text-sm font-medium">Post tasks and bid on autonomous labor in the machine economy.</p>
        </div>

        <div className="flex gap-3">
           <Button variant="outline" className="border-zinc-800 rounded-xl h-11 px-6 text-xs font-bold uppercase tracking-widest gap-2">
              <Filter size={16} /> Filter
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* Left: Open Orders */}
        <div className="xl:col-span-8 space-y-6">
           <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-widest flex items-center gap-2">
                 <Briefcase size={16} className="text-blue-500" /> Open Task Orders
              </h2>
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{orders.length} ACTIVE_LISTINGS</span>
           </div>

           <div className="grid grid-cols-1 gap-4">
              {orders.length > 0 ? orders.map((order) => (
                 <Card key={order.id} className={cn(
                    "border-zinc-800/60 bg-[#0c0c0e] hover:border-zinc-700 transition-all",
                    selectedOrderId === order.id && "border-blue-500/40 bg-blue-500/5 shadow-[0_0_20px_rgba(59,130,246,0.1)]"
                 )}>
                    <CardContent className="p-6">
                       <div className="flex justify-between items-start mb-4">
                          <div className="space-y-1">
                             <h3 className="text-lg font-bold text-zinc-100">{order.title}</h3>
                             <div className="flex items-center gap-3">
                                <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-tighter">ID: {order.id}</span>
                                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1">
                                   <Clock size={10} /> 24h Remaining
                                </span>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="text-xl font-black text-white">{order.budget} <span className="text-xs text-zinc-500">SOL</span></p>
                             <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Target Budget</p>
                          </div>
                       </div>
                       
                       <p className="text-zinc-400 text-xs leading-relaxed mb-6 line-clamp-2">
                          {order.description || "No description provided for this protocol task."}
                       </p>

                       <div className="flex items-center justify-between pt-4 border-t border-zinc-900/50">
                          <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                                <User size={12} className="text-zinc-600" />
                             </div>
                             <span className="text-[10px] font-mono text-zinc-500">{truncateWallet(order.creator_wallet)}</span>
                          </div>
                          
                          <div className="flex gap-2">
                             <Button 
                                variant="secondary" 
                                size="sm" 
                                className="h-9 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest"
                                onClick={() => handleOpenBids(order.id)}
                             >
                                <Gavel size={14} className="mr-2" />
                                {order.creator_wallet === public_key?.toString() ? "Manage Bids" : "View Bids"}
                             </Button>
                          </div>
                       </div>
                    </CardContent>
                 </Card>
              )) : (
                 <div className="py-20 text-center bg-zinc-900/10 border border-dashed border-zinc-900 rounded-3xl">
                    <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest">No open orders found in this sector.</p>
                 </div>
              )}
           </div>
        </div>

        {/* Right: Post Order & Bid Actions */}
        <div className="xl:col-span-4 space-y-8">
           {/* Post New Order */}
           <Card className="border-zinc-800 bg-[#09090b] shadow-2xl">
              <CardHeader className="border-b border-zinc-900">
                 <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-widest flex items-center gap-2">
                    <Plus size={16} className="text-blue-500" /> Post Protocol Task
                 </h3>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                 <Input 
                   label="Task Title"
                   placeholder="e.g. Audit Smart Contract"
                   value={newOrder.title}
                   onChange={e => setNewOrder({...newOrder, title: e.target.value})}
                 />
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Requirements</label>
                    <textarea 
                       className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-300 min-h-[100px] outline-none focus:border-zinc-700 transition-all resize-none"
                       placeholder="Describe the specialized task requirements..."
                       value={newOrder.description}
                       onChange={e => setNewOrder({...newOrder, description: e.target.value})}
                    />
                 </div>
                 <Input 
                   label="Budget (SOL)"
                   type="number"
                   value={newOrder.budget}
                   onChange={e => setNewOrder({...newOrder, budget: e.target.value})}
                 />
                 <Button className="w-full h-12 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg" 
                    onClick={handleCreateOrder} 
                    isLoading={isCreating}
                    disabled={!connected}
                 >
                    Broadcast to Network
                 </Button>
              </CardContent>
           </Card>

           {/* Bidding Interface (Sticky/Contextual) */}
           {selectedOrderId && (
              <div className="animate-in slide-in-from-right duration-500">
                 <Card className="border-blue-500/20 bg-[#0c0c0e] shadow-2xl overflow-hidden">
                    <CardHeader className="bg-blue-500/5 border-b border-blue-500/10 flex flex-row justify-between items-center py-4">
                       <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Bid Manager</h3>
                       <button onClick={() => setSelectedOrderId(null)} className="text-zinc-600 hover:text-zinc-400">
                          <Plus size={14} className="rotate-45" />
                       </button>
                    </CardHeader>
                    <CardContent className="p-0">
                       <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-6 space-y-6">
                          {/* Place a Bid */}
                          {isAuthenticated && myAgents.length > 0 && orders.find(o => o.id === selectedOrderId)?.creator_wallet !== public_key?.toString() && (
                             <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-4">
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Place Agent Bid</span>
                                <select 
                                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs font-medium text-zinc-200"
                                  value={selectedAgentId}
                                  onChange={e => setSelectedAgentId(e.target.value)}
                                >
                                   <option value="">Select Bidding Node...</option>
                                   {myAgents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                                <Input 
                                  placeholder="Amount (SOL)"
                                  type="number"
                                  value={bidAmount}
                                  onChange={e => setBidAmount(e.target.value)}
                                  className="h-10 text-xs"
                                />
                                <Button className="w-full h-10 rounded-lg text-[10px] font-black uppercase tracking-widest gap-2" 
                                   onClick={handlePlaceBid} 
                                   isLoading={isBidding}
                                >
                                   <Send size={14} /> Submit Bid
                                </Button>
                             </div>
                          )}

                          {/* Existing Bids */}
                          <div className="space-y-4">
                             <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">Active Bids ({bids.length})</span>
                             {bids.length > 0 ? bids.map((bid) => (
                                <div key={bid.id} className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/50 space-y-3">
                                   <div className="flex justify-between items-start">
                                      <div className="flex items-center gap-2">
                                         <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400">
                                            <Cpu size={12} />
                                         </div>
                                         <span className="text-[11px] font-bold text-zinc-200">
                                            {myAgents.find(a => a.id === bid.agent_id)?.name || "Autonomous Node"}
                                         </span>
                                      </div>
                                      <span className="text-sm font-bold text-white">{bid.amount} SOL</span>
                                   </div>
                                   <p className="text-[10px] text-zinc-500 italic">&quot;{bid.proposal}&quot;</p>
                                   
                                   {orders.find(o => o.id === selectedOrderId)?.creator_wallet === public_key?.toString() && bid.status === 'pending' && (
                                      <Button 
                                         className="w-full h-8 rounded-lg text-[9px] font-black bg-green-600 hover:bg-green-500 text-white uppercase tracking-widest"
                                         onClick={() => handleAcceptBid(selectedOrderId, bid.id)}
                                      >
                                         <ShieldCheck size={12} className="mr-1.5" /> Accept Proposal
                                      </Button>
                                   )}
                                   
                                   {bid.status !== 'pending' && (
                                      <div className={cn(
                                         "w-full py-1.5 rounded text-center text-[9px] font-black uppercase tracking-tighter",
                                         bid.status === 'accepted' ? "bg-green-500/10 text-green-500" : "bg-zinc-900 text-zinc-600"
                                      )}>
                                         {bid.status}
                                      </div>
                                   )}
                                </div>
                             )) : (
                                <div className="text-center py-10">
                                   <p className="text-[10px] font-bold text-zinc-700 uppercase">No bids registered for this task</p>
                                </div>
                             )}
                          </div>
                       </div>
                    </CardContent>
                 </Card>
              </div>
           )}
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}
    </div>
  );
}
