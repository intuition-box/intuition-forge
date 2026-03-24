import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { BrowserProvider, JsonRpcSigner, formatEther } from "ethers";
import { CHAIN_HEX, INTUITION_CHAIN } from "@/config/constants";
import { createElement } from "react";

declare global {
  interface Window {
    ethereum?: {
      request: (args: {
        method: string;
        params?: unknown[];
      }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (
        event: string,
        handler: (...args: unknown[]) => void
      ) => void;
    };
  }
}

interface WalletState {
  address: string | null;
  balance: string | null;
  signer: JsonRpcSigner | null;
  connected: boolean;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError("MetaMask not detected");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: CHAIN_HEX }],
        });
      } catch (e: unknown) {
        if ((e as { code?: number }).code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [INTUITION_CHAIN],
          });
        } else {
          throw e;
        }
      }

      const freshProvider = new BrowserProvider(window.ethereum);
      freshProvider.pollingInterval = 30000;
      const s = await freshProvider.getSigner();
      const addr = await s.getAddress();
      const bal = await freshProvider.getBalance(addr);

      setAddress(addr);
      setBalance(parseFloat(formatEther(bal)).toFixed(4));
      setSigner(s);
      setConnected(true);
      setConnecting(false);
    } catch (e) {
      setConnecting(false);
      setError(e instanceof Error ? e.message : "Connection failed");
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setBalance(null);
    setSigner(null);
    setConnected(false);
    setError(null);
  }, []);

  return createElement(
    WalletContext.Provider,
    {
      value: {
        address,
        balance,
        signer,
        connected,
        connecting,
        error,
        connect,
        disconnect,
      },
    },
    children
  );
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return ctx;
}
