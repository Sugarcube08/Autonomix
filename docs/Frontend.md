> ⚠️ Without UI, your system is invisible
> ⚠️ Without UX, your system is unusable
> ⚠️ Without frontend, your demo is weak

So now we design the **frontend architecture** that completes your system.

---

# 🎯 WHAT FRONTEND MUST DO (NO EXTRA BS)

Frontend is NOT just UI.

It is:

> ⚡ **Wallet + Marketplace + Execution Interface**

---

# 🧠 CORE FRONTEND RESPONSIBILITIES

---

## 1. 🔐 Wallet Connection (Solana-native)

* Connect Phantom / Backpack
* Sign messages (auth)
* Sign transactions (payment)

---

## 2. 🛒 Marketplace

* List agents
* Show price
* Show creator

---

## 3. ⚙️ Execution Interface

* Input form
* Pay + run
* Show result

---

## 4. 📦 Developer Flow (Optional UI)

* Upload agent
* Set price

(you can demo this via CLI instead)

---

# 🧱 FRONTEND ARCHITECTURE

---

## Tech Stack (RECOMMENDED)

* **Next.js (App Router)**
* **TailwindCSS**
* **Solana Wallet Adapter**
* **Axios / Fetch**

---

## 📁 Project Structure

```text
frontend/
│
├── app/
│   ├── page.tsx              # marketplace
│   ├── agent/[id]/page.tsx   # agent detail
│
├── components/
│   ├── AgentCard.tsx
│   ├── WalletButton.tsx
│   ├── ExecuteModal.tsx
│
├── lib/
│   ├── api.ts
│   ├── wallet.ts
│
├── hooks/
│   ├── useAgents.ts
│   ├── useExecute.ts
│
├── styles/
└── package.json
```

---

# 🔄 FULL USER FLOW (FRONTEND + BACKEND)

```text
User opens site
   ↓
Connect Wallet
   ↓
Fetch agents from API
   ↓
Click agent
   ↓
Enter input
   ↓
Sign transaction
   ↓
Send tx_signature to backend
   ↓
Backend executes
   ↓
Frontend shows result
```

---

# ⚙️ CORE IMPLEMENTATION (IMPORTANT PARTS)

---

# 🔐 WALLET SETUP

Install:

```bash
npm install @solana/wallet-adapter-react
npm install @solana/wallet-adapter-react-ui
```

---

## `WalletProvider.tsx`

```tsx
"use client";

import {
  ConnectionProvider,
  WalletProvider
} from "@solana/wallet-adapter-react";

import {
  WalletModalProvider
} from "@solana/wallet-adapter-react-ui";

export default function Providers({ children }) {
  return (
    <ConnectionProvider endpoint="https://api.devnet.solana.com">
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

---

# 🛒 MARKETPLACE PAGE

---

## `app/page.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import { getAgents } from "@/lib/api";

export default function Home() {
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    getAgents().then(setAgents);
  }, []);

  return (
    <div>
      <h1>Shoujiki Marketplace</h1>

      {agents.map((agent) => (
        <div key={agent.id}>
          <h2>{agent.name}</h2>
          <p>{agent.price} SOL</p>
        </div>
      ))}
    </div>
  );
}
```

---

# ⚙️ EXECUTION UI

---

## `ExecuteModal.tsx`

```tsx
"use client";

import { useState } from "react";
import { runAgent } from "@/lib/api";

export default function ExecuteModal({ agent }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);

  const handleRun = async () => {
    const txSignature = await signAndSendTx(agent.price);

    const res = await runAgent({
      agent_id: agent.id,
      input: { text: input },
      tx_signature: txSignature
    });

    setResult(res.result);
  };

  return (
    <div>
      <input onChange={(e) => setInput(e.target.value)} />

      <button onClick={handleRun}>
        Pay & Run
      </button>

      {result && <p>{result}</p>}
    </div>
  );
}
```

---

# 💰 TRANSACTION SIGNING (SIMPLIFIED)

---

## `wallet.ts`

```tsx
import { useWallet } from "@solana/wallet-adapter-react";

export const usePayment = () => {
  const { publicKey, sendTransaction } = useWallet();

  const pay = async (amount) => {
    // create tx → send → return signature
    return "mock_tx_signature";
  };

  return { pay };
};
```

---

👉 For demo: mock or minimal implementation is fine
👉 For judges: show signature + flow

---

# 🔌 API LAYER

---

## `lib/api.ts`

```tsx
export async function getAgents() {
  const res = await fetch("http://localhost:8000/agents");
  return res.json();
}

export async function runAgent(payload) {
  const res = await fetch("http://localhost:8000/agents/run", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json"
    }
  });

  return res.json();
}
```

---

# 🎨 UI DESIGN (KEEP SIMPLE BUT CLEAN)

---

## Required Screens:

### 1. Marketplace

* Agent cards
* Price
* Button: “Run”

---

### 2. Agent Detail

* Input box
* Run button

---

### 3. Wallet

* Connect button
* Wallet address

---

---

# 🐳 FULL SYSTEM (NOW COMPLETE)

```text
Frontend (Next.js)
   ↓
Backend (FastAPI)
   ↓
Sandbox (Docker)
   ↓
Solana (Devnet)
```

---

# 🎯 WHAT THIS GIVES YOU

Now you can **actually show**:

* Wallet connect
* Marketplace browsing
* Real interaction
* Payment flow
* Agent execution

---

# ⚡ FINAL TRUTH

Before:

> You had a system engineers understand

Now:

> You have a system judges understand

