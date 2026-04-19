"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, TextArea } from '@/components/ui/Input';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { deployAgent, testAgent } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { 
  Code2, 
  Rocket, 
  AlertCircle, 
  FileJson, 
  Plus, 
  Trash2, 
  Play, 
  FileCode,
  Package,
  Layers,
  Terminal
} from 'lucide-react';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import Editor from "@monaco-editor/react";

export default function DeployPage() {
  const router = useRouter();
  const { isAuthenticated, login, connected } = useWalletAuth();
  
  const [metadata, setMetadata] = useState({
    id: '',
    name: '',
    description: '',
    price: 0.01,
  });

  const [files, setFiles] = useState<Record<string, string>>({
    'main.py': `class Agent:
    def run(self, input_data):
        # Your logic here
        return {"message": "Hello from " + self.__class__.__name__}

agent = Agent()`,
    'utils.py': '# Add helper functions here\ndef format_msg(msg):\n    return f"Processed: {msg}"'
  });
  
  const [selectedFile, setSelectedFile] = useState('main.py');
  const [requirements, setRequirements] = useState<string[]>(['requests']);
  const [newDep, setNewDep] = useState('');
  const [entrypoint, setEntrypoint] = useState('main.py');
  
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleAddFile = () => {
    const filename = prompt('Enter filename (e.g. models.py):');
    if (filename && !files[filename]) {
      setFiles({ ...files, [filename]: '# New file content' });
      setSelectedFile(filename);
    }
  };

  const handleDeleteFile = (filename: string) => {
    if (filename === entrypoint) return alert('Cannot delete entrypoint');
    const newFiles = { ...files };
    delete newFiles[filename];
    setFiles(newFiles);
    if (selectedFile === filename) setSelectedFile(entrypoint);
  };

  const handleAddDep = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newDep.trim()) {
      e.preventDefault();
      if (!requirements.includes(newDep.trim())) {
        setRequirements([...requirements, newDep.trim()]);
      }
      setNewDep('');
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setError('');
    setTestResult(null);
    try {
      const res = await testAgent({
        ...metadata,
        files,
        requirements,
        entrypoint,
        version: 'test-' + Date.now()
      });
      setTestResult(res);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Test execution failed');
    } finally {
      setTesting(false);
    }
  };

  const handleDeploy = async () => {
    if (!isAuthenticated) return;
    
    setError('');
    setLoading(true);
    try {
      await deployAgent({
        ...metadata,
        files,
        requirements,
        entrypoint,
        version: 'v' + Date.now()
      });
      router.push('/dashboard/my-agents');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Deployment failed');
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 bg-zinc-900/50 rounded-2xl border border-zinc-800">
        <AlertCircle size={48} className="text-zinc-500" />
        <div className="text-center">
          <h2 className="text-xl font-bold">Wallet Not Connected</h2>
          <p className="text-zinc-400">Please connect your Solana wallet to deploy agents.</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 bg-zinc-900/50 rounded-2xl border border-zinc-800">
        <Rocket size={48} className="text-blue-500" />
        <div className="text-center">
          <h2 className="text-xl font-bold">Authentication Required</h2>
          <p className="text-zinc-400 mb-6">You need to sign a message to authenticate with the API.</p>
          <Button onClick={login}>Authenticate Now</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold mb-2">Create Agent Project</h1>
          <p className="text-zinc-400">The professional environment for Solana AI agents.</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={handleTest} isLoading={testing} className="gap-2">
            <Play size={18} fill="currentColor" />
            Test Run
          </Button>
          <Button onClick={handleDeploy} isLoading={loading} className="gap-2 px-8">
            <Rocket size={18} />
            Deploy Project
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Layers size={18} className="text-blue-400" />
              <h3 className="font-bold">Project Info</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input 
                label="Agent ID" 
                placeholder="sentiment-analyzer" 
                value={metadata.id}
                onChange={e => setMetadata({...metadata, id: e.target.value})}
              />
              <Input 
                label="Display Name" 
                placeholder="Sentiment Pro" 
                value={metadata.name}
                onChange={e => setMetadata({...metadata, name: e.target.value})}
              />
              <Input 
                label="Price (SOL)" 
                type="number" 
                value={metadata.price}
                onChange={e => setMetadata({...metadata, price: parseFloat(e.target.value)})}
              />
              <TextArea 
                label="Description" 
                value={metadata.description}
                onChange={e => setMetadata({...metadata, description: e.target.value})}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-purple-400" />
                <h3 className="font-bold">Dependencies</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input 
                placeholder="Add package + Enter" 
                value={newDep}
                onChange={e => setNewDep(e.target.value)}
                onKeyDown={handleAddDep}
              />
              <div className="flex flex-wrap gap-2">
                {requirements.map(dep => (
                  <span key={dep} className="bg-zinc-800 text-xs px-2 py-1 rounded-md flex items-center gap-2 group">
                    {dep}
                    <button onClick={() => setRequirements(requirements.filter(r => r !== dep))}>
                      <Plus size={12} className="rotate-45 text-zinc-500 group-hover:text-red-400" />
                    </button>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[600px]">
            <Card className="md:col-span-1 overflow-hidden flex flex-col">
              <CardHeader className="py-4 border-b border-zinc-800 flex flex-row items-center justify-between">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Files</h4>
                <button onClick={handleAddFile} className="text-zinc-400 hover:text-white">
                  <Plus size={18} />
                </button>
              </CardHeader>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {Object.keys(files).map(filename => (
                  <div 
                    key={filename}
                    onClick={() => setSelectedFile(filename)}
                    className={`flex items-center justify-between group px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      selectedFile === filename ? 'bg-blue-600/10 text-blue-400' : 'hover:bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileCode size={16} />
                      <span className="text-sm truncate">{filename}</span>
                      {entrypoint === filename && (
                        <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1 rounded uppercase font-bold">Main</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {entrypoint !== filename && (
                        <button onClick={(e) => { e.stopPropagation(); setEntrypoint(filename); }} title="Set as entrypoint">
                          <Layers size={14} className="hover:text-white" />
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteFile(filename); }}>
                        <Trash2 size={14} className="hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="md:col-span-3 overflow-hidden flex flex-col bg-zinc-950">
              <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <FileCode size={18} className="text-blue-400" />
                  <span className="text-sm font-mono text-zinc-300">{selectedFile}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-zinc-800 text-zinc-500 px-2 py-1 rounded font-bold uppercase">Python</span>
                </div>
              </div>
              <div className="flex-1">
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
                    roundedSelection: false,
                    scrollBeyondLastLine: false,
                    readOnly: false,
                    automaticLayout: true,
                    padding: { top: 20 }
                  }}
                />
              </div>
            </Card>
          </div>

          {(testResult || error) && (
            <Card className="bg-zinc-950 border-zinc-800">
              <CardHeader className="py-4 flex flex-row items-center gap-2">
                <Terminal size={18} className="text-green-400" />
                <h3 className="font-bold text-sm">Test Console</h3>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm flex gap-2 items-center">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}
                {testResult && (
                  <pre className="text-xs font-mono text-zinc-400 overflow-auto max-h-60 p-4 bg-black/50 rounded-lg border border-zinc-800 shadow-inner">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
