"use client";

import React, { useState, useEffect } from 'react';
import { getAgents } from '@/lib/api';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  Plus, Play, Rocket, Trash2, ArrowRight, Loader2, 
  Activity, CheckCircle2, AlertCircle, History, ExternalLink,
  ChevronRight, Bot, Cpu, Layers, Info
} from 'lucide-react';
import axios from 'axios';

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
      console.error("Failed to fetch swarm data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll for status updates every 3 seconds
    const interval = setInterval(fetchData, 3000);
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

  const handleRun = async (workflowId: string) => {
    try {
      await axios.post(`${API_URL}/workflows/${workflowId}/run`, { initial_input: { start: true } }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('shoujiki_token')}` }
      });
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'running': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'failed': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20';
    }
  };

  if (loading && workflows.length === 0) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <Rocket className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500" size={24} />
      </div>
      <p className="text-zinc-500 font-bold animate-pulse">Initializing Swarm Orchestrator...</p>
    </div>
  );

  return (
    <div className="space-y-12 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-zinc-900 pb-10">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-purple-400">
            <Activity size={12} />
            Swarm Engine V2
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
            Agent <span className="text-zinc-500">Swarms</span>
          </h1>
          <p className="text-zinc-400 font-medium max-w-xl">
            Chain multiple specialized agents into a seamless autonomous supply chain. Create, manage, and monitor complex parallel workflows.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* Sidebar: Creation */}
        <div className="xl:col-span-4 space-y-8">
          <Card className="border-blue-500/20 bg-gradient-to-b from-blue-500/5 to-transparent">
            <CardHeader className="border-b-0 pb-2">
              <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                <Plus size={20} className="text-blue-500" />
                Assemble Swarm
              </h3>
              <p className="text-xs text-zinc-500">Define your multi-agent pipeline</p>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div className="space-y-4">
                <Input 
                  label="Swarm Name"
                  placeholder="e.g. DeFi Research Pipeline" 
                  value={newWorkflow.name}
                  onChange={e => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between ml-1">
                    <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Workflow Logic</p>
                    <span className="text-[10px] px-2 py-0.5 bg-zinc-800 rounded text-zinc-400 font-mono">Sequential</span>
                  </div>
                  
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {newWorkflow.steps.map((step, index) => (
                      <div key={index} className="group p-4 bg-zinc-950 border border-zinc-800 rounded-2xl relative hover:border-zinc-700 transition-all">
                        <button 
                          onClick={() => removeStep(index)}
                          className="absolute top-4 right-4 text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-400">
                            {index + 1}
                          </div>
                          <p className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Step Execution</p>
                        </div>
                        
                        <div className="space-y-3">
                          <select 
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-sm text-zinc-200 outline-none focus:border-blue-500 transition-all appearance-none"
                            value={step.agent_id}
                            onChange={e => {
                              const steps = [...newWorkflow.steps];
                              steps[index].agent_id = e.target.value;
                              setNewWorkflow({ ...newWorkflow, steps });
                            }}
                          >
                            <option value="">Select Executor Agent</option>
                            {agents.map(a => (
                              <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                          </select>
                          
                          <div className="relative">
                            <textarea 
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-[11px] text-zinc-400 font-mono h-20 outline-none focus:border-blue-500 transition-all resize-none"
                              placeholder="Input Template (e.g. {{previous_result}})"
                              value={step.input_template}
                              onChange={e => {
                                const steps = [...newWorkflow.steps];
                                steps[index].input_template = e.target.value;
                                setNewWorkflow({ ...newWorkflow, steps });
                              }}
                            />
                            <div className="absolute bottom-2 right-3">
                              <Info size={12} className="text-zinc-700" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full border-dashed border-zinc-800 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 h-12 rounded-2xl gap-2"
                    onClick={addStep}
                  >
                    <Plus size={16} />
                    Insert Pipeline Step
                  </Button>
                </div>
              </div>

              <Button 
                className="w-full h-14 rounded-2xl shadow-[0_0_25px_rgba(37,99,235,0.2)] text-lg font-bold"
                onClick={handleCreate}
                isLoading={creating}
                disabled={!newWorkflow.name || newWorkflow.steps.some(s => !s.agent_id)}
              >
                Assemble Swarm
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main: Dashboard */}
        <div className="xl:col-span-8 space-y-10">
          
          {/* Active Workflows Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 px-1">
              <Layers size={18} className="text-blue-500" />
              <h2 className="text-xl font-bold">Your Pipelines</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {workflows.length === 0 ? (
                <div className="col-span-2 py-20 bg-zinc-900/20 border-2 border-dashed border-zinc-900 rounded-[32px] flex flex-col items-center justify-center text-center">
                  <Layers size={48} className="text-zinc-800 mb-4" />
                  <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No Active Swarms</p>
                </div>
              ) : (
                workflows.map((wf) => (
                  <Card key={wf.id} className="group border-zinc-800/50 hover:border-blue-500/40 transition-all duration-300">
                    <CardHeader className="flex flex-row justify-between items-start pb-4 border-b-0">
                      <div className="space-y-1">
                        <h3 className="text-lg font-black group-hover:text-blue-400 transition-colors">{wf.name}</h3>
                        <p className="text-[10px] text-zinc-600 font-mono tracking-tighter uppercase">{wf.id}</p>
                      </div>
                      <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl">
                        <Cpu size={16} className="text-zinc-400 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex flex-wrap items-center gap-2">
                        {wf.steps.map((step: any, i: number) => (
                          <React.Fragment key={i}>
                            <div className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-[10px] font-black text-zinc-400 uppercase tracking-tight">
                              {agents.find(a => a.id === step.agent_id)?.name || step.agent_id}
                            </div>
                            {i < wf.steps.length - 1 && <ChevronRight size={14} className="text-zinc-800" />}
                          </React.Fragment>
                        ))}
                      </div>
                      
                      <Button 
                        className="w-full h-12 rounded-xl bg-zinc-800 hover:bg-blue-600 group/btn gap-2 font-bold transition-all" 
                        onClick={() => handleRun(wf.id)}
                      >
                        <Play size={14} className="group-hover/btn:fill-white" />
                        Initialize Swarm
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Execution History Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <History size={18} className="text-purple-500" />
                <h2 className="text-xl font-bold">Execution History</h2>
              </div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                Live Status
              </span>
            </div>

            <div className="space-y-4">
              {runs.length === 0 ? (
                <div className="py-20 bg-zinc-900/10 border border-zinc-900 rounded-[32px] flex flex-col items-center justify-center text-center">
                  <Activity size={32} className="text-zinc-800 mb-2" />
                  <p className="text-zinc-600 text-sm font-medium">No recent executions detected on Devnet.</p>
                </div>
              ) : (
                runs.map((run) => (
                  <Card key={run.id} className="border-zinc-800/40 bg-zinc-900/20 backdrop-blur-sm overflow-visible">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-10 rounded-full ${run.status === 'running' ? 'bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]' : run.status === 'completed' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-zinc-200">
                              {workflows.find(w => w.id === run.workflow_id)?.name || run.workflow_id}
                            </h4>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${getStatusColor(run.status)}`}>
                              {run.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">RUN_ID: {run.id.slice(0, 18)}...</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="hidden md:flex flex-col items-end">
                          <p className="text-[10px] font-bold text-zinc-600 uppercase">Progress</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 transition-all duration-500" 
                                style={{ width: `${(run.current_step_index / (workflows.find(w => w.id === run.workflow_id)?.steps.length || 1)) * 100}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-zinc-400">
                              {run.current_step_index}/{workflows.find(w => w.id === run.workflow_id)?.steps.length || 0}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">Triggered</p>
                          <p className="text-[10px] text-zinc-400 font-medium">
                            {new Date(run.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Collapsible Results (only if not queued) */}
                    {run.results && run.results.steps && run.results.steps.length > 0 && (
                      <div className="border-t border-zinc-800/50 p-4 bg-zinc-950/30 rounded-b-xl">
                        <div className="flex items-center gap-3 overflow-x-auto pb-2">
                          {run.results.steps.map((step: any, idx: number) => (
                            <div key={idx} className="flex-shrink-0 flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-2 rounded-xl">
                              <div className="w-6 h-6 rounded-lg bg-green-500/10 flex items-center justify-center">
                                <CheckCircle2 size={12} className="text-green-500" />
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-zinc-500 uppercase leading-none">Agent {step.agent_id.slice(0, 5)}</p>
                                <p className="text-[10px] text-zinc-300 font-mono mt-1 max-w-[120px] truncate">{step.output || "No output"}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
