import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import bs58 from 'bs58';
import { loginWallet } from '@/lib/api';

export function useWalletAuth() {
  const { publicKey, signMessage, connected, disconnect } = useWallet();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('shoujiki_token');
    if (token && connected) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, [connected]);

  const login = async () => {
    if (!publicKey || !signMessage) return;
    try {
      setLoading(true);
      const message = "Login to Shoujiki";
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);
      const signatureStr = bs58.encode(signature);

      await loginWallet(publicKey.toBase58(), signatureStr, message);
      setIsAuthenticated(true);
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('shoujiki_token');
    setIsAuthenticated(false);
    disconnect();
  };

  return { isAuthenticated, login, logout, loading, publicKey, connected };
}
