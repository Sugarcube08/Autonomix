"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { getAgents, loginWallet, runAgent } from "@/lib/api";
import { SystemProgram, Transaction, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { publicKey, signMessage, sendTransaction, connected } = useWallet();
  const [agents, setAgents] = useState<any[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [executingAgent, setExecutingAgent] = useState<any>(null);
  const [inputData, setInputData] = useState("{}");
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    getAgents().then(setAgents).catch(console.error);
  }, []);

  const handleLogin = async () => {
    if (!publicKey || !signMessage) return;
    try {
      setLoading(true);
      const message = "Login to Shoujiki";
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);
      const signatureBase58 = require("base58-js").base58_to_binary ? "" : require("bs58").encode(signature);
      
      // Handle bs58 import correctly or use a fallback
      // For Next.js/Browser, bs58 is common. 
      // Simplified for this task:
      const signatureStr = Buffer.from(signature).toString('hex'); // Backend needs to match this or use base58

      const res = await loginWallet(publicKey.toBase58(), signatureStr, message);
      setToken(res.access_token);
    } catch (err) {
      console.error(err);
      alert("Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRun = async (agent: any) => {
    if (!publicKey || !token) {
      alert("Please login first");
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      // 1. Create transaction to pay
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey("4FqQ5S8C6Tf5C9v9A5M2B2F2G2H2J2K2L2M2N2P2Q2R"), // Platform wallet
          lamports: agent.price * LAMPORTS_PER_SOL,
        })
      );

      const signature = await sendTransaction(transaction, (window as any).solana.connection || {});
      console.log("Transaction signature:", signature);

      // 2. Call backend to run
      const res = await runAgent(agent.id, JSON.parse(inputData), signature, token);
      setResult(res);
    } catch (err) {
      console.error(err);
      alert("Execution failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto">
      <header className="flex justify-between items-center mb-12">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
          Shoujiki
        </h1>
        <div className="flex gap-4 items-center">
          <WalletMultiButton />
          {connected && !token && (
            <button
              onClick={handleLogin}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {loading && <Loader2 className="animate-spin" size={18} />}
              Login to API
            </button>
          )}
          {token && <span className="text-green-400 text-sm font-mono">Authenticated</span>}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <div key={agent.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl hover:border-blue-500/50 transition-all">
            <h2 className="text-xl font-semibold mb-2">{agent.name}</h2>
            <p className="text-zinc-400 text-sm mb-4 h-12 overflow-hidden">{agent.description}</p>
            <div className="flex justify-between items-center">
              <span className="text-purple-400 font-mono font-bold">{agent.price} SOL</span>
              <button
                onClick={() => setExecutingAgent(agent)}
                className="bg-zinc-100 text-black px-4 py-2 rounded-lg font-medium hover:bg-white transition-colors"
              >
                Configure & Run
              </button>
            </div>
          </div>
        ))}
      </div>

      {executingAgent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-xl rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-4">Run {executingAgent.name}</h2>
            <p className="text-zinc-400 mb-6">Enter JSON input for the agent:</p>
            
            <textarea
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-lg p-4 font-mono text-sm mb-6 focus:border-blue-500 outline-none"
            />

            {result && (
              <div className="mb-6 p-4 bg-zinc-950 border border-zinc-800 rounded-lg overflow-auto max-h-48">
                <p className="text-xs text-zinc-500 mb-2 font-mono">Status: {result.status}</p>
                <pre className="text-sm text-green-400 font-mono">{result.result || result.error}</pre>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => handleRun(executingAgent)}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 py-3 rounded-xl font-bold transition-colors flex justify-center items-center gap-2"
              >
                {loading && <Loader2 className="animate-spin" />}
                Pay {executingAgent.price} SOL & Run
              </button>
              <button
                onClick={() => { setExecutingAgent(null); setResult(null); }}
                className="px-6 py-3 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
