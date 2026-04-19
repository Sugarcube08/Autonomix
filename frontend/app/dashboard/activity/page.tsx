"use client";

import React, { useEffect, useState } from 'react';
import { getMyTasks } from '@/lib/api';
import { Loader2, History, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { Button } from '@/components/ui/Button';

export default function ActivityPage() {
  const { isAuthenticated, login, connected } = useWalletAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      getMyTasks()
        .then(setTasks)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="text-green-500" size={18} />;
      case 'failed': return <XCircle className="text-red-500" size={18} />;
      default: return <Clock className="text-blue-500 animate-pulse" size={18} />;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 bg-zinc-900/50 rounded-2xl border border-zinc-800">
        <History size={48} className="text-zinc-500" />
        <div className="text-center">
          <h2 className="text-xl font-bold">Authentication Required</h2>
          <p className="text-zinc-400 mb-6">Login to view your task and payment history.</p>
          <Button onClick={login}>Authenticate Now</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Activity</h1>
        <p className="text-zinc-400">Track your agent executions and Solana transactions.</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="animate-spin text-blue-500" size={40} />
          <p className="text-zinc-500 font-medium">Loading activity history...</p>
        </div>
      ) : tasks.length > 0 ? (
        <div className="space-y-4">
          {tasks.map((task: any) => (
            <Card key={task.id} className="bg-zinc-900/50">
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-zinc-800 rounded-xl">
                    {getStatusIcon(task.status)}
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-100">{task.agent_id}</h3>
                    <p className="text-xs text-zinc-500 font-mono">ID: {task.id}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-medium text-zinc-300">
                    {new Date(task.created_at).toLocaleString()}
                  </p>
                  <div className="flex items-center justify-end gap-2 mt-1">
                    <span className={task.status === 'completed' ? 'text-green-500' : task.status === 'failed' ? 'text-red-500' : 'text-blue-500'}>
                      {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                    </span>
                  </div>
                </div>
              </CardContent>
              {task.result && (
                <div className="px-6 pb-6">
                  <pre className="p-4 bg-zinc-950 rounded-lg text-xs font-mono text-zinc-400 border border-zinc-800 overflow-auto max-h-32">
                    {task.result}
                  </pre>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-800">
          <p className="text-zinc-500">No activity recorded yet. Try running an agent from the Marketplace!</p>
        </div>
      )}
    </div>
  );
}
