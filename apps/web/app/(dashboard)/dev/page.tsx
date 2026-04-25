"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, TextArea } from '@/components/ui/Input';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { deployAgent, testAgent } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { 
  Code2, 
  Rocket, 
  FileCode, 
  Plus, 
  Trash2, 
  Play, 
  Terminal,
  Cpu,
  Layers,
  ChevronRight,
  MonitorPlay,
  Save,
  CheckCircle2
} from 'lucide-react';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import Editor from "@monaco-editor/react";
import { Alert } from '@/components/ui/Alert';
import { cn } from '@/lib/utils';

export default function DevSpacePage() {
  const router = useRouter();
  const { isAuthenticated, login, connected } = useWalletAuth();
  
  const [metadata, setMetadata] = useState({
    id: '',
    name: '',
    description: '',
    price: 0.01,
  });

  const [files, setFiles] = useState<Record<string, string>>({
    'main.py': `from shoujiki import shoujiki
import json

class Agent:
    def run(self, input_data):
        # Neural logic here
        return {
            "status": "success",
            "message": "Protocol sequence initiated",
            "data": input_data
        }

agent = Agent()`,
    'utils.py': '# Utilities library\ndef format_msg(msg):\n    return f"log: {msg}"'
  });
  
  const [selectedFile, setSelectedFile] = useState('main.py');
  const [requirements, setRequirements] = useState<string[]>(['requests']);
  const [newDep, setNewDep] = useState('');
  const [entrypoint, setEntrypoint] = useState('main.py');
  
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleAddFile = () => {
    const filename = prompt('Enter filename:');
    if (filename && !files[filename]) {
      setFiles({ ...files, [filename]: '# Init' });
      setSelectedFile(filename);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setError('');
    setTestResult(null);
    try {
      const res = await testAgent({
        ...metadata,
        id: metadata.id || 'test-agent',
        name: metadata.name || 'Test Agent',
        files,
        requirements,
        entrypoint,
        version: 'v' + Date.now()
      });
      setTestResult(res);
      if (res.success) setSuccessMsg('Simulation pass verified.');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Simulation aborted');
    } finally {
      setTesting(false);
    }
  };

  const handleDeploy = () => {
    if (!isAuthenticated) return;
    if (!metadata.id.trim() || !metadata.name.trim()) {
      setError('Missing metadata identifiers');
      return;
    }
    const draft = { ...metadata, files, requirements, entrypoint, version: 'v' + Date.now() };
    localStorage.setItem('shoujiki_draft', JSON.stringify(draft));
    router.push('/deploy');
  };

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-8 animate-in fade-in duration-500">
        <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-600">
          <Terminal size={32} />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-zinc-100">Development Environment Restricted</h2>
          <p className="text-zinc-500 text-sm max-w-xs mx-auto">Authorize your wallet to access the Agent SDK and cloud runtime.</p>
        </div>
        <Button onClick={login} className="rounded-xl px-10 h-12 shadow-xl">Link Identity</Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-1000">
      {/* Action Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-zinc-800/40">
        <div className="space-y-1.5 text-left">
           <h1 className="text-2xl font-bold text-zinc-100">Agent Studio</h1>
           <p className="text-sm text-zinc-500 font-medium">Build and verify autonomous entities for the SVM network.</p>
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <Button variant="outline" onClick={handleTest} isLoading={testing} className="flex-1 lg:flex-none h-11 px-6 rounded-xl text-xs font-semibold uppercase tracking-wider gap-2">
            <MonitorPlay size={16} />
            Simulate
          </Button>
          <Button onClick={handleDeploy} className="flex-1 lg:flex-none h-11 px-8 rounded-xl text-xs font-semibold uppercase tracking-wider gap-2 shadow-lg">
            <Rocket size={16} />
            Deploy to Fleet
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 h-[750px]">
        {/* Workspace Panels */}
        <div className="xl:col-span-3 space-y-6 flex flex-col h-full overflow-hidden">
          <Card className="flex-1 flex flex-col overflow-hidden border-zinc-800/40 bg-[#09090b]">
             <CardHeader className="py-4 px-6 flex flex-row items-center justify-between border-b border-zinc-800/40 bg-zinc-900/10">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Source_Explorer</span>
                <button onClick={handleAddFile} className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-zinc-100">
                   <Plus size={14} />
                </button>
             </CardHeader>
             <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                {Object.keys(files).map(filename => (
                  <div 
                    key={filename}
                    onClick={() => setSelectedFile(filename)}
                    className={cn(
                      "flex items-center justify-between px-4 py-2.5 rounded-lg cursor-pointer transition-all mb-1 group",
                      selectedFile === filename 
                      ? 'bg-zinc-800/60 text-zinc-100 border border-zinc-700/50' 
                      : 'text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-300'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <FileCode size={14} className={selectedFile === filename ? 'text-blue-500' : 'text-zinc-600'} />
                      <span className="text-xs font-medium truncate">{filename}</span>
                    </div>
                    {entrypoint === filename && (
                       <div className="w-1 h-1 rounded-full bg-blue-500" />
                    )}
                  </div>
                ))}
             </div>
          </Card>

          <Card className="border-zinc-800/40 bg-[#09090b]">
             <CardHeader className="py-4 px-6 border-b border-zinc-800/40 bg-zinc-900/10">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Registry_Metadata</span>
             </CardHeader>
             <CardContent className="p-5 space-y-4">
                <Input 
                  label="Agent Unique ID" 
                  value={metadata.id}
                  onChange={e => setMetadata({...metadata, id: e.target.value})}
                  className="h-9 text-xs"
                />
                <Input 
                  label="Display Name" 
                  value={metadata.name}
                  onChange={e => setMetadata({...metadata, name: e.target.value})}
                  className="h-9 text-xs"
                />
             </CardContent>
          </Card>
        </div>

        {/* Editor Zone */}
        <div className="xl:col-span-9 flex flex-col gap-6 h-full overflow-hidden">
           <Card className="flex-1 flex flex-col border-zinc-800/40 bg-[#09090b] overflow-hidden rounded-[24px]">
              <div className="px-8 py-3 border-b border-zinc-800/40 flex items-center justify-between bg-zinc-900/10 backdrop-blur-sm">
                 <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span className="text-xs font-semibold text-zinc-300">{selectedFile}</span>
                 </div>
                 <div className="flex items-center gap-4">
                    <span className="text-[10px] font-medium text-zinc-500 tracking-wider">Python_3.11</span>
                    {entrypoint === selectedFile && (
                       <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[9px] font-black uppercase rounded border border-blue-500/20">Entry_Point</span>
                    )}
                 </div>
              </div>
              <div className="flex-1 relative">
                <Editor
                  height="100%"
                  defaultLanguage="python"
                  theme="vs-dark"
                  value={files[selectedFile]}
                  onChange={(val) => setFiles({ ...files, [selectedFile]: val || '' })}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    roundedSelection: true,
                    scrollBeyondLastLine: false,
                    readOnly: false,
                    automaticLayout: true,
                    padding: { top: 20 },
                    backgroundColor: '#09090b'
                  }}
                />
              </div>
           </Card>

           {/* Console */}
           {(testResult || error) && (
             <Card className="h-64 border-zinc-800/40 bg-[#0c0c0e] overflow-hidden rounded-[24px] flex flex-col">
                <CardHeader className="py-3 px-8 border-b border-zinc-800/40 flex flex-row items-center justify-between">
                   <div className="flex items-center gap-2">
                      <Terminal size={14} className="text-zinc-500" />
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Simulator_Output</span>
                   </div>
                   {testResult?.success && <span className="text-[9px] font-black text-green-500 uppercase tracking-widest flex items-center gap-1.5">
                      <CheckCircle2 size={12} /> Integrity Pass
                   </span>}
                </CardHeader>
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar font-mono text-[11px] leading-relaxed">
                   {error ? (
                     <p className="text-red-400">Simulation_Fault: {error}</p>
                   ) : (
                     <pre className="text-zinc-400">{JSON.stringify(testResult, null, 2)}</pre>
                   )}
                </div>
             </Card>
           )}
        </div>
      </div>

      {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg('')} />}
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
    </div>
  );
}
