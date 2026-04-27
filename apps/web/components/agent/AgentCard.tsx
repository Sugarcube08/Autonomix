"use client";

import React from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { Play, BadgeCheck, CreditCard, Wallet, Cpu, Activity, Shield, ArrowUpRight, BarChart3 } from 'lucide-react';
import { cn, truncateWallet } from '@/lib/utils';

interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    description: string;
    price: number;
    creator_wallet: string;
    mint_address?: string;
    world_id_hash?: string;
    squads_vault_pda?: string;
    credential_registry_address?: string;
    total_runs?: number;
    successful_runs?: number;
  };
  onDelete?: () => void;
  isDeleting?: boolean;
  onWithdraw?: () => void;
  isWithdrawing?: boolean;
}

export const AgentCard = ({ agent, onDelete, isDeleting, onWithdraw, isWithdrawing }: AgentCardProps) => {
  const getIdentityStatus = () => {
    if (agent.world_id_hash) return { label: "Human Authenticated", color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
    return { label: "Verified Node", color: 'text-zinc-400 bg-zinc-800/40 border-zinc-700/50' };
  };

  const identity = getIdentityStatus();

  return (
    <Card className="group relative flex flex-col h-full bg-[#0c0c0e] border-zinc-800/60 hover:border-zinc-700 transition-all duration-300">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-zinc-100 transition-colors">
              {agent.name}
            </h3>
            {agent.mint_address && (
              <BadgeCheck size={14} className="text-blue-500" />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
             <div className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter border shadow-sm", identity.color)}>
                <Shield size={10} />
                {identity.label}
             </div>
             {agent.squads_vault_pda && (
               <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter border border-purple-500/20 bg-purple-500/10 text-purple-400 shadow-sm">
                  <Cpu size={10} />
                  Sovereign Treasury
               </div>
             )}
          </div>
        </div>
        <div className="text-right">
           <p className="text-sm font-semibold text-zinc-100">{agent.price} SOL</p>
           <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">Per Run</p>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 space-y-4 text-left">
        <p className="text-zinc-400 text-xs leading-relaxed line-clamp-3">
          {agent.description || "Autonomous agent protocol node executing via VACN verifiable compute."}
        </p>
        
        <div className="pt-2 flex flex-col gap-1.5 text-[9px] font-bold uppercase tracking-widest text-zinc-600">
          <div className="flex items-center justify-between">
            <span>Creator: <span className="text-zinc-400 font-mono">{truncateWallet(agent.creator_wallet)}</span></span>
            <span>Uptime: <span className="text-zinc-400">{agent.successful_runs}/{agent.total_runs}</span></span>
          </div>
          {agent.squads_vault_pda && (
            <div className="flex items-center gap-1.5 text-blue-400/80">
              <Wallet size={10} className="text-blue-500/40" />
              Vault: <span className="font-mono text-zinc-400">{truncateWallet(agent.squads_vault_pda)}</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 pt-2">
        <div className="flex gap-2 w-full">
          <Link href={`/agent/${agent.id}`} className="flex-1">
            <Button 
              variant="primary"
              className="w-full h-10 text-[11px] font-black uppercase tracking-widest rounded-lg shadow-lg"
            >
              Initialize Execution
              <ArrowUpRight size={14} className="ml-1 opacity-50" />
            </Button>
          </Link>

          {onWithdraw && agent.squads_vault_pda && (
            <div className="flex gap-2 shrink-0">
               <Link href={`/agent/${agent.id}/finance`}>
                  <Button
                    variant="secondary"
                    className="w-10 h-10 p-0 rounded-lg border-zinc-800 bg-zinc-900/50"
                    title="Agent Finance (Credit & Loans)"
                  >
                    <BarChart3 size={16} className="text-zinc-400" />
                  </Button>
               </Link>
               <Button
                 variant="secondary"
                 className="w-10 h-10 p-0 rounded-lg shrink-0 border-zinc-800 bg-zinc-900/50"
                 onClick={onWithdraw}
                 isLoading={isWithdrawing}
                 title="Agent Treasury (Squads)"
               >
                 <CreditCard size={16} className="text-zinc-400" />
               </Button>
            </div>
          )}
        </div>

        {onDelete && (
          <button
            className="w-full py-1 text-[9px] font-medium text-zinc-600 hover:text-red-400 transition-colors"
            onClick={onDelete}
          >
            Deregister Instance
          </button>
        )}
      </CardFooter>
    </Card>
  );
};
