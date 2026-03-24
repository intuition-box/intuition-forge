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

// EIP-6963: Multi-wallet discovery
interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: EIP1193Provider;
}

interface EIP1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
}

interface WalletOption {
  name: string;
  icon: string;
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

  // EIP-6963: listen for wallet announcements
  useEffect(() => {
    function handleAnnounce(event: Event) {
      const detail = (event as CustomEvent<EIP6963ProviderDetail>).detail;
      if (!detail?.info?.uuid) return;
      discoveredRef.current.set(detail.info.uuid, detail);
      setWallets(
        Array.from(discoveredRef.current.values()).map((d) => ({
          name: d.info.name,
          icon: d.info.icon,
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

  const connect = useCallback(async (explicitProvider?: EIP1193Provider) => {
    // Priority: explicit provider > first discovered wallet > window.ethereum
    const provider =
      explicitProvider ??
      discoveredRef.current.values().next().value?.provider ??
      (window as { ethereum?: EIP1193Provider }).ethereum;

    if (!provider) {
      setError("No wallet detected. Install MetaMask.");
      return;
    }

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

      // Re-create provider after chain switch
      const freshProvider = new BrowserProvider(provider);
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
