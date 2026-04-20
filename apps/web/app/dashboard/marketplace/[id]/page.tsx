"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAgent, runAgent } from '@/lib/api';
import { createEscrowTransaction, confirmTx, createSolanaPayURL, PLATFORM_WALLET } from '@/lib/solana';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/Input';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Loader2, ArrowLeft, Play, ShieldCheck, Terminal, AlertCircle, QrCode, CreditCard, BadgeCheck } from 'lucide-react';
import { PublicKey, Keypair } from '@solana/web3.js';

export default function AgentRunPage() {
  const { id } = useParams();
  const router = useRouter();
  const { connection } = useConnection();
  const { sendTransaction } = useWallet();
  const { isAuthenticated, login, connected, publicKey } = useWalletAuth();
  
  const [agent, setAgent] = useState<any>(null);
  const [inputData, setInputData] = useState('{"text": "Hello"}');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'idle' | 'paying' | 'verifying' | 'executing' | 'done'>('idle');
  const [paymentType, setPaymentType] = useState<'escrow' | 'solana_pay'>('solana_pay');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getAgent(id as string)
      .then(setAgent)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleRun = async () => {
    if (!publicKey || !connected || !isAuthenticated) return;
    
    setError('');
    setResult(null);
    try {
      const taskId = crypto.randomUUID();
      
      if (paymentType === 'solana_pay') {
        setStatus('paying');
        // Generate a random reference keypair
        const reference = Keypair.generate().publicKey;
        
        const payUrl = createSolanaPayURL(
          new PublicKey(PLATFORM_WALLET),
          agent.price,
          reference,
          "Shoujiki Agent Run",
          `Executing agent ${agent.name}`
        );

        // For demo/hackathon, we'll open the URL in a new tab or show it
        // Ideally, we use the wallet-adapter to sign a transaction derived from this or use the mobile wallet adapter
        // Since we are in a web environment, we can also just create the transaction manually to match Solana Pay spec
        
        // Let's create a standard transfer transaction with the reference
        const { SystemProgram, Transaction } = await import('@solana/web3.js');
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new PublicKey(PLATFORM_WALLET),
            lamports: agent.price * 1e9,
          })
        );
        // Add the reference to the instruction for verification
        tx.instructions[0].keys.push({ pubkey: reference, isSigner: false, isWritable: false });
        
        const signature = await sendTransaction(tx, connection);
        
        setStatus('verifying');
        await confirmTx(connection, signature);
        
        setStatus('executing');
        const res = await runAgent(agent.id, JSON.parse(inputData), taskId, reference.toBase58(), 'solana_pay');
        setResult(res);
      } else {
        // Legacy Escrow flow
        setStatus('paying');
        const tx = await createEscrowTransaction(
          publicKey, 
          new PublicKey(agent.creator_wallet), 
          taskId, 
          agent.price
        );
        const signature = await sendTransaction(tx, connection);
        
        setStatus('verifying');
        await confirmTx(connection, signature);
        
        setStatus('executing');
        const res = await runAgent(agent.id, JSON.parse(inputData), taskId);
        setResult(res);
      }
      
      setStatus('done');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || err.message || 'Execution failed');
      setStatus('idle');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="animate-spin text-blue-500" size={40} />
    </div>
  );

  if (!agent) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <p className="text-zinc-400">Agent not found.</p>
      <Button onClick={() => router.push('/dashboard/marketplace')}>Back to Marketplace</Button>
    </div>
  );

  return (
    <div className="space-y-8">
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <h1 className="text-2xl font-bold">{agent.name}</h1>
              <p className="text-zinc-500 text-sm font-mono">{agent.id}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-zinc-400 text-sm leading-relaxed">
                {agent.description || "No description provided."}
              </p>
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-1">Price per run</p>
                <p className="text-2xl font-bold text-purple-400">{agent.price} SOL</p>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Payment Method</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentType('solana_pay')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                      paymentType === 'solana_pay' 
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                      : 'border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700'
                    }`}
                  >
                    <CreditCard size={20} />
                    <span className="text-[10px] font-bold uppercase">Solana Pay</span>
                  </button>
                  <button
                    onClick={() => setPaymentType('escrow')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                      paymentType === 'escrow' 
                      ? 'border-purple-500 bg-purple-500/10 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.1)]' 
                      : 'border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700'
                    }`}
                  >
                    <ShieldCheck size={20} />
                    <span className="text-[10px] font-bold uppercase">Squads Vault</span>
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500 leading-tight">
                  {paymentType === 'solana_pay' 
                    ? "Direct payment via Solana Pay. Fast and simple." 
                    : "Secure Squads multi-sig vault. Funds released only on success."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <ShieldCheck size={14} className="text-green-500" />
                  <span>Verified Creator: {agent.creator_wallet.slice(0, 8)}...</span>
                </div>
                {agent.mint_address && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded-full">
                    <BadgeCheck size={12} className="text-zinc-500" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Onchain Asset</span>
                  </div>
                )}
                {agent.risk_score !== undefined && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-full">
                    <span className="text-[10px] font-bold text-blue-400 uppercase">Risk (Simulated): {(agent.risk_score * 100).toFixed(0)}%</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center gap-2">
              <Terminal size={20} className="text-blue-400" />
              <h3 className="font-bold">Configuration</h3>
            </CardHeader>
            <CardContent className="flex-1 space-y-6">
              <TextArea 
                label="Input Data (JSON)"
                value={inputData}
                onChange={(e) => setInputData(e.target.value)}
                className="h-40 font-mono text-sm"
              />

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm flex gap-2 items-center">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              {result && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-zinc-400 ml-1">Execution Result</p>
                  <pre className="p-6 bg-zinc-950 rounded-xl border border-zinc-800 text-green-400 font-mono text-sm overflow-auto max-h-64 shadow-inner">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
            <div className="p-6 border-t border-zinc-800 bg-zinc-900/50">
              {!connected ? (
                <p className="text-center text-zinc-500 text-sm">Connect wallet to run</p>
              ) : !isAuthenticated ? (
                <Button className="w-full" onClick={login}>Authenticate to Run</Button>
              ) : (
                <Button 
                  className="w-full h-14 text-lg gap-3 shadow-[0_0_20px_rgba(37,99,235,0.2)]" 
                  onClick={handleRun}
                  isLoading={status !== 'idle' && status !== 'done'}
                >
                  {status === 'paying' ? 'Funding Vault...' :
                   status === 'verifying' ? 'Verifying Vault...' :
                   status === 'executing' ? 'Executing Agent...' :
                   'Pay & Run Agent'}
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
