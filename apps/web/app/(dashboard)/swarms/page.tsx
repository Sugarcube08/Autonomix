"use client";

import React, { useState, useEffect } from 'react';
import { getAgents } from '@/lib/api';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  Plus, Play, Rocket, Trash2, ArrowRight, Loader2, 
  Activity, CheckCircle2, AlertCircle, History, 
  ChevronRight, Cpu, Layers, Info, Terminal
} from 'lucide-react';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { Alert } from '@/components/ui/Alert';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function SwarmsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    steps: [{ agent_id: '', input_template: '{{previous_result}}' }]
  });

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('shoujiki_token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [agentsData, workflowsRes, runsRes] = await Promise.all([
        getAgents(),
        axios.get(`${API_URL}/workflows/me`, { headers }),
        axios.get(`${API_URL}/workflows/runs`, { headers })
      ]);
      
      setAgents(agentsData);
      setWorkflows(workflowsRes.data);
      setRuns(runsRes.data);
    } catch (err) {
      console.error("Failed to fetch swarm data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const addStep = () => {
    setNewWorkflow({
      ...newWorkflow,
      steps: [...newWorkflow.steps, { agent_id: '', input_template: '{{previous_result}}' }]
    });
  };

  const removeStep = (index: number) => {
    if (newWorkflow.steps.length <= 1) return;
    setNewWorkflow({
      ...newWorkflow,
      steps: newWorkflow.steps.filter((_, i) => i !== index)
    });
  };

  const handleCreate = async () => {
    if (!newWorkflow.name || newWorkflow.steps.some(s => !s.agent_id)) return;
    
    setCreating(true);
    try {
      const payload = {
        ...newWorkflow,
        id: newWorkflow.name.toLowerCase().replace(/\s+/g, '-'),
      };
      await axios.post(`${API_URL}/workflows`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('shoujiki_token')}` }
      });
      await fetchData();
      setNewWorkflow({ name: '', steps: [{ agent_id: '', input_template: '{{previous_result}}' }] });
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const [runningId, setRunningId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleRun = async (workflowId: string) => {
    setRunningId(workflowId);
    setError('');
    try {
      await axios.post(`${API_URL}/workflows/${workflowId}/run`, { initial_input: { start: true } }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('shoujiki_token')}` }
      });
      await fetchData();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to start swarm. Ensure all nodes are available.');
    } finally {
      setRunningId(null);
    }
  };

  if (loading && workflows.length === 0) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <Loader2 className="animate-spin text-zinc-600" size={24} />
      <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Orchestrating...</span>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-24 text-left">
      <div className="space-y-2 border-b border-zinc-900 pb-10">
        <h1 className="text-3xl font-semibold text-white tracking-tight">Swarm OS</h1>
        <p className="text-zinc-400 text-sm font-medium">Orchestrate complex DAGs of autonomous agents with A2A messaging and verifiable coordination.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 items-start">
        {/* Creator */}
        <div className="xl:col-span-4 space-y-8">
           <Card className="border-zinc-800 bg-[#09090b]">
              <CardHeader className="border-b border-zinc-900">
                 <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-widest">Swarm Coordination Protocol</h3>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                 <Input 
                   label="Workflow ID"
                   placeholder="e.g. market-analyzer"
                   value={newWorkflow.name}
                   onChange={e => setNewWorkflow({...newWorkflow, name: e.target.value})}
                 />

                 <div className="space-y-4">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pipeline Steps</p>
                    {newWorkflow.steps.map((step, index) => (
                       <div key={index} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-3 relative group">
                          <button onClick={() => removeStep(index)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-red-400">
                             <Trash2 size={12} />
                          </button>
                          <select 
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs font-medium text-zinc-200"
                            value={step.agent_id}
                            onChange={e => {
                               const steps = [...newWorkflow.steps];
                               steps[index].agent_id = e.target.value;
                               setNewWorkflow({...newWorkflow, steps});
                            }}
                          >
                             <option value="">Select Agent...</option>
                             {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                          </select>
                          <textarea 
                             className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-[10px] font-mono text-zinc-400 h-16 resize-none"
                             placeholder="Template (e.g. {{previous_result}})"
                             value={step.input_template}
                             onChange={e => {
                                const steps = [...newWorkflow.steps];
                                steps[index].input_template = e.target.value;
                                setNewWorkflow({...newWorkflow, steps});
                             }}
                          />
                       </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addStep} className="w-full border-dashed text-xs border-zinc-800 hover:border-zinc-600 h-10">
                       <Plus size={14} /> Add Step
                    </Button>
                 </div>

                 <Button className="w-full h-12 rounded-xl font-bold shadow-lg" onClick={handleCreate} isLoading={creating}>
                    Register Protocol
                 </Button>
              </CardContent>
           </Card>
        </div>

        {/* Dash */}
        <div className="xl:col-span-8 space-y-12">
           <div className="space-y-6">
              <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                 <Layers size={18} className="text-blue-500" /> Active Pipelines
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {workflows.map(wf => (
                    <Card key={wf.id} className="border-zinc-800/60 bg-[#0c0c0e] group">
                       <CardHeader className="flex flex-row justify-between items-start pb-2">
                          <div>
                             <h4 className="font-semibold text-zinc-100">{wf.name}</h4>
                             <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-tighter">{wf.id}</p>
                          </div>
                          <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg">
                             <Activity size={14} className="text-zinc-600 group-hover:text-blue-500 transition-colors" />
                          </div>
                       </CardHeader>
                       <CardContent className="space-y-4">
                          <div className="flex flex-wrap items-center gap-2">
                             {wf.steps.map((s: any, i: number) => (
                                <React.Fragment key={i}>
                                   <div className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[9px] font-bold text-zinc-500 uppercase">
                                      {agents.find(a => a.id === s.agent_id)?.name || "node"}
                                   </div>
                                   {i < wf.steps.length - 1 && <ChevronRight size={12} className="text-zinc-800" />}
                                </React.Fragment>
                             ))}
                          </div>
                          <Button variant="secondary" size="sm" className="w-full rounded-lg text-[10px] font-black tracking-widest uppercase h-9" 
                             onClick={() => handleRun(wf.id)}
                             isLoading={runningId === wf.id}
                             disabled={!!runningId}
                          >
                             Execute Swarm
                          </Button>
                       </CardContent>
                    </Card>
                 ))}
              </div>
           </div>

           <div className="space-y-6">
              <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                 <Terminal size={18} className="text-zinc-500" /> Recent Executions
              </h2>
              <div className="space-y-4">
                 {runs.map(run => (
                    <div key={run.id} className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 flex items-center justify-between group hover:bg-zinc-900/60 transition-all">
                       <div className="flex items-center gap-5">
                          <div className={cn(
                             "w-1 h-10 rounded-full transition-all duration-1000",
                             run.status === 'completed' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' :
                             run.status === 'running' ? 'bg-blue-500 animate-pulse' : 'bg-zinc-800'
                          )} />
                          <div>
                             <h5 className="text-sm font-semibold text-zinc-200">
                                {workflows.find(w => w.id === run.workflow_id)?.name || "Task_Chain"}
                             </h5>
                             <div className="flex items-center gap-2 mt-0.5">
                                <span className={cn(
                                   "text-[9px] font-black uppercase px-2 py-0.5 rounded border",
                                   run.status === 'completed' ? 'text-green-500 border-green-500/20 bg-green-500/5' : 'text-zinc-500 border-zinc-800 bg-zinc-900'
                                )}>{run.status}</span>
                                <span className="text-[9px] font-mono text-zinc-600 uppercase">{run.id.slice(0, 16)}</span>
                             </div>
                          </div>
                       </div>
                       
                       <div className="flex flex-col items-end gap-1.5">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Step_{run.current_step_index}</span>
                          <div className="w-24 h-1 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/50 shadow-inner">
                             <div 
                                className="h-full bg-blue-500 transition-all duration-700" 
                                style={{ width: `${(run.current_step_index / (workflows.find(w => w.id === run.workflow_id)?.steps.length || 1)) * 100}%` }}
                             />
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
    </div>
  );
}
