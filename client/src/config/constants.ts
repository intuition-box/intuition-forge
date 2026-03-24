export const CHAIN_ID = 1155;
export const CHAIN_HEX = "0x483";
export const RPC_URL = "https://rpc.intuition.systems/http";
export const MULTIVAULT_ADDRESS = "0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e";
export const EXPLORER_URL = "https://explorer.intuition.systems";
export const GRAPHQL_URL = "https://mainnet.intuition.sh/v1/graphql";

export const INTUITION_CHAIN = {
  chainId: CHAIN_HEX,
  chainName: "Intuition",
  nativeCurrency: { name: "Intuition", symbol: "TRUST", decimals: 18 },
  rpcUrls: [RPC_URL],
  blockExplorerUrls: [EXPLORER_URL],
};

export const MULTIVAULT_ABI = [
  "function getAtomCost() view returns (uint256)",
  "function getTripleCost() view returns (uint256)",
  "function calculateAtomId(bytes data) pure returns (bytes32)",
  "function isTermCreated(bytes32 id) view returns (bool)",
  "function createAtoms(bytes[] atomDatas, uint256[] assets) payable returns (bytes32[])",
  "function createTriples(bytes32[] subjectIds, bytes32[] predicateIds, bytes32[] objectIds, uint256[] assets) payable returns (bytes32[])",
  "function approve(address sender, uint8 approvalType)",
];

export const KNOWN_PREDICATES: Record<string, string> = {
  "has tag":
    "0x7ec36d201c842dc787b45cb5bb753bea4cf849be3908fb1b0a7d067c3c3cc1f5",
  "speaking at":
    "0xddbdcf95cfac2135b0dfbfa055952b839ce5ee0467a5729eb15f9df250d3cf37",
  "presented at":
    "0xd565b68b86bbca8c77bfac6c6947ce96046ecf6d23c997c04cb10af7638ac6b6",
  "are interested by":
    "0x0cdf2b27b15fafb69a4e08b4fcb04e923a43d398dc14b66b0e6cc3c25b8f0c1e",
  attending:
    "0x8e03a2f5fea05108c37c45de51e3bfbe77c81ad51b82fe8c28fe33847b90b3f2",
};

export const BATCH_SIZE = 20;
