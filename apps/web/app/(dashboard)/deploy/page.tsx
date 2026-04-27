"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { deployAgent } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { 
  Rocket, 
  CheckCircle2, 
  Loader2, 
  ArrowLeft, 
  ShieldCheck, 
  Zap, 
  Bot, 
  Lock,
  Cpu,
  Activity,
  Fingerprint
} from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { cn } from '@/lib/utils';

export default function DeploySpacePage() {
  const router = useRouter();
  const { isAuthenticated, connected, login } = useWalletAuth();
  
  const [draft, setDraft] = useState<any>(null);
  const [status, setStatus] = useState<'idle' | 'validating' | 'minting' | 'done'>('idle');
  const [error, setError] = useState('');
  const [deployedAgent, setDeployedAgent] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('shoujiki_draft');
      if (saved) {
        setDraft(JSON.parse(saved));
      } else {
        router.push('/dev');
      }
    }
  }, [router]);

  const handleConfirmDeploy = async () => {
    if (!draft || !isAuthenticated) return;
    
    setError('');
    setStatus('validating');
    
    try {
      const res = await deployAgent(draft);
      setStatus('minting');
      setDeployedAgent(res);
      localStorage.removeItem('shoujiki_draft');
      
      setTimeout(() => {
        setStatus('done');
      }, 2000);

    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || err.message || 'Deployment failed');
      setStatus('idle');
    }
  };

  if (!draft) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <Loader2 className="animate-spin text-zinc-600" size={24} />
      <p className="text-zinc-500 text-sm font-medium">Loading draft...</p>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-24 text-left">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => router.push('/dev')}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-100 transition-colors text-xs font-medium"
        >
          <ArrowLeft size={14} /> Back to Editor
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-400">
           Registry Ready
        </div>
      </div>

      <div className="space-y-2 border-b border-zinc-900 pb-10">
        <h1 className="text-3xl font-semibold text-white tracking-tight">Deployment Pipeline</h1>
        <p className="text-zinc-400 text-sm font-medium">Review specifications and initialize on-chain protocol sequence.</p>
      </div>

      {status === 'done' ? (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="flex flex-col items-center justify-center py-20 gap-8 text-center">
            <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center">
               <CheckCircle2 size={32} className="text-green-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Sovereign Node Deployed</h2>
              <p className="text-zinc-500 text-sm">Your autonomous protocol node is now active with World ID and Squads Treasury.</p>
            </div>
            
            <div className="w-full max-w-lg p-5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-4">
               <div className="space-y-1 text-left">
                 <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block mb-2">Passport_Asset (Metaplex)</span>
                 <p className="text-xs font-mono text-zinc-400 break-all bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                   {deployedAgent?.mint_address || 'Confirmed on Devnet'}
                 </p>
               </div>
               {deployedAgent?.squads_vault_pda && (
                 <div className="space-y-1 text-left">
                   <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block mb-2">Sovereign_Vault (Squads)</span>
                   <p className="text-xs font-mono text-zinc-400 break-all bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                     {deployedAgent.squads_vault_pda}
                   </p>
                 </div>
               )}
            </div>

            <div className="flex gap-4 w-full max-w-lg">
               <Button onClick={() => router.push('/my-agents')} className="flex-1 h-12 rounded-xl">View Fleet</Button>
               <Button variant="outline" onClick={() => router.push('/marketplace')} className="flex-1 h-12 rounded-xl border-zinc-800">Marketplace</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5 space-y-8">
            <Card className="border-zinc-800 bg-[#09090b]">
              <CardHeader className="border-b border-zinc-900">
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-widest flex items-center gap-2">
                  <Bot size={16} className="text-blue-500" /> Manifest
                </h3>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="flex items-center gap-5">
                   <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center">
                      <Cpu size={32} className="text-zinc-600" />
                   </div>
                   <div className="space-y-1">
                      <p className="text-xl font-bold text-white leading-tight">{draft.name}</p>
                      <p className="text-xs font-mono text-zinc-500 uppercase">{draft.id}</p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Fee</p>
                    <p className="text-lg font-semibold text-zinc-200">{draft.price} <span className="text-xs font-normal text-zinc-500">SOL</span></p>
                  </div>
                  <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Assets</p>
                    <p className="text-lg font-semibold text-zinc-200">{Object.keys(draft.files).length}</p>
                  </div>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                      <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Entrypoint</span>
                      <span className="text-[10px] font-mono text-blue-500 font-bold">{draft.entrypoint}</span>
                   </div>
                   <div className="flex flex-wrap gap-2">
                    {Object.keys(draft.files).map(f => (
                      <span key={f} className="text-[9px] font-bold uppercase bg-zinc-900 border border-zinc-800 text-zinc-500 px-2 py-1 rounded">
                        {f}
                      </span>
                    ))}
                   </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-7 space-y-8 text-left">
            <Card className="border-zinc-800 bg-[#09090b]">
              <CardHeader className="border-b border-zinc-900">
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-widest">System Check</h3>
              </CardHeader>
              <CardContent className="p-8 space-y-10">
                <div className="space-y-8">
                  {[
                    { label: "Protocol Integrity", desc: "Verifying multi-file logic and AgentOS runtime safety.", active: status === 'validating', done: status === 'minting' },
                    { label: "Identity & Treasury", desc: "World ID provenance and Squads V4 vault provisioning.", active: status === 'minting', done: false },
                    { label: "Metaplex Passport", desc: "Minting on-chain identity asset (Passport).", active: false, done: false }
                  ].map((step, i) => (
                    <div key={i} className="flex gap-6">
                       <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center border-2 border-zinc-900 shrink-0 transition-all",
                          step.active ? "bg-blue-600 border-blue-400/20" : step.done ? "bg-green-600 border-green-400/20" : "bg-zinc-900 border-zinc-800"
                       )}>
                          {step.active ? <Loader2 size={16} className="animate-spin text-white" /> : <CheckCircle2 size={16} className={step.done ? "text-white" : "text-zinc-700"} />}
                       </div>
                       <div className="space-y-1">
                          <p className={cn("text-sm font-bold uppercase tracking-wide", step.active || step.done ? "text-white" : "text-zinc-600")}>{i+1}. {step.label}</p>
                          <p className="text-xs text-zinc-500 font-medium leading-relaxed">{step.desc}</p>
                       </div>
                    </div>
                  ))}
                </div>

                <div className="pt-8 border-t border-zinc-900">
                   <Button 
                     className="w-full h-14 rounded-xl font-bold text-sm tracking-widest uppercase shadow-xl"
                     onClick={handleConfirmDeploy}
                     disabled={status !== 'idle' || !connected}
                     isLoading={status !== 'idle'}
                   >
                      <Rocket size={18} />
                      Initialize Launch Sequence
                   </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {error && <Alert type="error" title="Critical Fault" message={error} onClose={() => setError('')} />}
    </div>
  );
}
