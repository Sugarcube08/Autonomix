"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAgent, runAgent } from '@/lib/api';
import { createPaymentTransaction, confirmTx } from '@/lib/solana';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/Input';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Loader2, ArrowLeft, Play, ShieldCheck, Terminal, AlertCircle } from 'lucide-react';

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
      // 1. Payment
      setStatus('paying');
      const tx = await createPaymentTransaction(publicKey, agent.price);
      const signature = await sendTransaction(tx, connection);
      
      // 2. Verification
      setStatus('verifying');
      await confirmTx(connection, signature);
      
      // 3. Execution
      setStatus('executing');
      const res = await runAgent(agent.id, JSON.parse(inputData), signature);
      setResult(res);
      setStatus('done');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Execution failed');
      setStatus('idle');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <Loader2 className="animate-spin text-blue-500" size={40} />
    </div>
  );

  if (!agent) return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
      <p className="text-zinc-400">Agent not found.</p>
      <Button onClick={() => router.push('/dashboard/marketplace')}>Back to Marketplace</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
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
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <ShieldCheck size={14} className="text-green-500" />
                  <span>Verified Creator: {agent.creator_wallet.slice(0, 8)}...</span>
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
                    {status === 'paying' ? 'Confirming Transaction...' :
                     status === 'verifying' ? 'Verifying Payment...' :
                     status === 'executing' ? 'Executing Agent...' :
                     'Pay & Run Agent'}
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
