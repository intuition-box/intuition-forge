import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { BrowserProvider, JsonRpcSigner, formatEther } from "ethers";
import { CHAIN_HEX, INTUITION_CHAIN } from "@/config/constants";
import { createElement } from "react";

const WALLET_STORAGE_KEY = "intuition-forge-wallet";

interface EIP6963ProviderDetail {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: EIP1193Provider;
}

interface EIP1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
}

export interface WalletOption {
  name: string;
  icon: string;
  rdns: string;
  provider: EIP1193Provider;
}

interface WalletState {
  address: string | null;
  balance: string | null;
  signer: JsonRpcSigner | null;
  connected: boolean;
  connecting: boolean;
  error: string | null;
  wallets: WalletOption[];
  connect: (provider?: EIP1193Provider) => Promise<void>;
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
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const discoveredRef = useRef<Map<string, EIP6963ProviderDetail>>(new Map());
  const autoConnectDone = useRef(false);

  // EIP-6963: discover wallets
  useEffect(() => {
    function handleAnnounce(event: Event) {
      const detail = (event as CustomEvent<EIP6963ProviderDetail>).detail;
      if (!detail?.info?.uuid) return;
      discoveredRef.current.set(detail.info.uuid, detail);
      setWallets(
        Array.from(discoveredRef.current.values()).map((d) => ({
          name: d.info.name,
          icon: d.info.icon,
          rdns: d.info.rdns,
          provider: d.provider,
        }))
      );
    }

    window.addEventListener("eip6963:announceProvider", handleAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    return () => {
      window.removeEventListener("eip6963:announceProvider", handleAnnounce);
    };
  }, []);

  const connectWithProvider = useCallback(async (provider: EIP1193Provider, rdns?: string) => {
    setConnecting(true);
    setError(null);
    try {
      const ethersProvider = new BrowserProvider(provider);
      await ethersProvider.send("eth_requestAccounts", []);

      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: CHAIN_HEX }],
        });
      } catch (e: unknown) {
        if ((e as { code?: number }).code === 4902) {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [INTUITION_CHAIN],
          });
        } else {
          throw e;
        }
      }

      await new Promise((r) => setTimeout(r, 500));

      const freshProvider = new BrowserProvider(provider);
      freshProvider.pollingInterval = 30000;
      const s = await freshProvider.getSigner();
      const addr = await s.getAddress();

      setAddress(addr);
      setSigner(s);
      setConnected(true);
      setConnecting(false);

      // Persist which wallet was used
      if (rdns) {
        localStorage.setItem(WALLET_STORAGE_KEY, rdns);
      }

      // Non-blocking balance fetch
      try {
        const bal = await freshProvider.getBalance(addr);
        setBalance(parseFloat(formatEther(bal)).toFixed(4));
      } catch {
        setBalance("?");
      }
    } catch (e) {
      setConnecting(false);
      setError(e instanceof Error ? e.message : "Connection failed");
    }
  }, []);

  const connect = useCallback(async (explicitProvider?: EIP1193Provider) => {
    if (explicitProvider) {
      // Find rdns for this provider
      const found = Array.from(discoveredRef.current.values()).find(
        (d) => d.provider === explicitProvider
      );
      return connectWithProvider(explicitProvider, found?.info.rdns);
    }

    // No explicit provider — don't auto-pick, let TopBar show the picker
    // If only one wallet discovered, use it
    const discovered = Array.from(discoveredRef.current.values());
    if (discovered.length === 1) {
      const d = discovered[0]!;
      return connectWithProvider(d.provider, d.info.rdns);
    }
    if (discovered.length === 0) {
      setError("No wallet detected. Install MetaMask.");
      return;
    }

    // Multiple wallets — set error to trigger picker in TopBar
    setError("Multiple wallets detected — choose one from the top bar.");
  }, [connectWithProvider]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setBalance(null);
    setSigner(null);
    setConnected(false);
    setError(null);
    localStorage.removeItem(WALLET_STORAGE_KEY);
  }, []);

  // Auto-reconnect on page load
  useEffect(() => {
    if (autoConnectDone.current || connected) return;
    autoConnectDone.current = true;

    const savedRdns = localStorage.getItem(WALLET_STORAGE_KEY);
    if (!savedRdns) return;

    // Wait a bit for wallets to announce
    const timer = setTimeout(() => {
      const found = Array.from(discoveredRef.current.values()).find(
        (d) => d.info.rdns === savedRdns
      );
      if (found) {
        connectWithProvider(found.provider, found.info.rdns);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [connected, connectWithProvider]);

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
        wallets,
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
