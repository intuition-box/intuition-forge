import { useState, useCallback } from "react";
import { BrowserProvider, JsonRpcSigner, formatEther } from "ethers";
import { CHAIN_HEX, INTUITION_CHAIN } from "@/config/constants";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
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
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    balance: null,
    signer: null,
    connected: false,
    connecting: false,
    error: null,
  });

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setState((s) => ({ ...s, error: "MetaMask not detected" }));
      return;
    }
    setState((s) => ({ ...s, connecting: true, error: null }));
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
      const signer = await freshProvider.getSigner();
      const address = await signer.getAddress();
      const bal = await freshProvider.getBalance(address);

      setState({
        address,
        balance: parseFloat(formatEther(bal)).toFixed(4),
        signer,
        connected: true,
        connecting: false,
        error: null,
      });
    } catch (e) {
      setState((s) => ({
        ...s,
        connecting: false,
        error: e instanceof Error ? e.message : "Connection failed",
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      address: null,
      balance: null,
      signer: null,
      connected: false,
      connecting: false,
      error: null,
    });
  }, []);

  return { ...state, connect, disconnect };
}
