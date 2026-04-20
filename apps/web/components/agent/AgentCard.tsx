"use client";

import React from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { Play, User, Clock, Trash2, ShieldCheck, BadgeCheck } from 'lucide-react';

interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    description: string;
    price: number;
    creator_wallet: string;
    mint_address?: string;
    risk_score?: number;
  };
  onDelete?: () => void;
  isDeleting?: boolean;
}

export const AgentCard = ({ agent, onDelete, isDeleting }: AgentCardProps) => {
  const router = useRouter();

  const truncatedWallet = `${agent.creator_wallet.slice(0, 4)}...${agent.creator_wallet.slice(-4)}`;

  return (
    <Card className="hover:border-blue-500/50 transition-all group">
      <CardHeader className="space-y-1">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-zinc-100 group-hover:text-blue-400 transition-colors">
              {agent.name}
            </h3>
            {agent.mint_address && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded-full w-fit">
                <BadgeCheck size={10} className="text-zinc-500" />
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Onchain Asset</span>
              </div>
            )}
            {agent.risk_score !== undefined && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-full w-fit">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">
                  Risk (Simulated): {(agent.risk_score * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>
          <span className="text-sm font-mono font-bold text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded">
            {agent.price} SOL
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <User size={12} />
          <span>{truncatedWallet}</span>
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-zinc-400 text-sm line-clamp-3 min-h-[4.5rem]">
          {agent.description || "No description provided."}
        </p>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button 
          className="flex-1 gap-2" 
          variant="secondary"
          onClick={() => router.push(`/dashboard/marketplace/${agent.id}`)}
        >
          <Play size={16} fill="currentColor" />
          Configure & Run
        </Button>
        {onDelete && (
          <Button
            variant="outline"
            className="px-3 border-zinc-800 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-500"
            onClick={onDelete}
            isLoading={isDeleting}
            title="Delete Agent"
          >
            <Trash2 size={16} />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
