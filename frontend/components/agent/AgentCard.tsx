"use client";

import React from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { Play, User, Clock } from 'lucide-react';

interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    description: string;
    price: number;
    creator_wallet: string;
  };
}

export const AgentCard = ({ agent }: AgentCardProps) => {
  const router = useRouter();

  const truncatedWallet = `${agent.creator_wallet.slice(0, 4)}...${agent.creator_wallet.slice(-4)}`;

  return (
    <Card className="hover:border-blue-500/50 transition-all group">
      <CardHeader className="space-y-1">
        <div className="flex justify-between items-start">
          <h3 className="text-xl font-bold text-zinc-100 group-hover:text-blue-400 transition-colors">
            {agent.name}
          </h3>
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

      <CardFooter>
        <Button 
          className="w-full gap-2" 
          variant="secondary"
          onClick={() => router.push(`/agent/${agent.id}`)}
        >
          <Play size={16} fill="currentColor" />
          Configure & Run
        </Button>
      </CardFooter>
    </Card>
  );
};
