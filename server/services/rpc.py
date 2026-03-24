"""Direct MultiVault RPC service — no Sofia Proxy."""

from web3 import Web3
from web3.contract import Contract

from config import settings

MULTIVAULT_ABI = [
    {
        "name": "getAtomCost",
        "type": "function",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [{"name": "", "type": "uint256"}],
    },
    {
        "name": "getTripleCost",
        "type": "function",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [{"name": "", "type": "uint256"}],
    },
    {
        "name": "calculateAtomId",
        "type": "function",
        "stateMutability": "pure",
        "inputs": [{"name": "data", "type": "bytes"}],
        "outputs": [{"name": "", "type": "bytes32"}],
    },
    {
        "name": "calculateTripleId",
        "type": "function",
        "stateMutability": "pure",
        "inputs": [
            {"name": "subjectId", "type": "bytes32"},
            {"name": "predicateId", "type": "bytes32"},
            {"name": "objectId", "type": "bytes32"},
        ],
        "outputs": [{"name": "", "type": "bytes32"}],
    },
    {
        "name": "isTermCreated",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "id", "type": "bytes32"}],
        "outputs": [{"name": "", "type": "bool"}],
    },
    {
        "name": "isAtom",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "atomId", "type": "bytes32"}],
        "outputs": [{"name": "", "type": "bool"}],
    },
    {
        "name": "isTriple",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "id", "type": "bytes32"}],
        "outputs": [{"name": "", "type": "bool"}],
    },
    {
        "name": "getVault",
        "type": "function",
        "stateMutability": "view",
        "inputs": [
            {"name": "termId", "type": "bytes32"},
            {"name": "curveId", "type": "uint256"},
        ],
        "outputs": [
            {"name": "totalAssets", "type": "uint256"},
            {"name": "totalShares", "type": "uint256"},
        ],
    },
    {
        "name": "currentSharePrice",
        "type": "function",
        "stateMutability": "view",
        "inputs": [
            {"name": "termId", "type": "bytes32"},
            {"name": "curveId", "type": "uint256"},
        ],
        "outputs": [{"name": "", "type": "uint256"}],
    },
    {
        "name": "getTriple",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "tripleId", "type": "bytes32"}],
        "outputs": [
            {"name": "", "type": "bytes32"},
            {"name": "", "type": "bytes32"},
            {"name": "", "type": "bytes32"},
        ],
    },
    {
        "name": "atom",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "atomId", "type": "bytes32"}],
        "outputs": [{"name": "", "type": "bytes"}],
    },
    {
        "name": "getBondingCurveConfig",
        "type": "function",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "tuple",
                "components": [
                    {"name": "registry", "type": "address"},
                    {"name": "defaultCurveId", "type": "uint256"},
                ],
            }
        ],
    },
    {
        "name": "previewDeposit",
        "type": "function",
        "stateMutability": "view",
        "inputs": [
            {"name": "termId", "type": "bytes32"},
            {"name": "curveId", "type": "uint256"},
            {"name": "assets", "type": "uint256"},
        ],
        "outputs": [
            {"name": "shares", "type": "uint256"},
            {"name": "assetsAfterFees", "type": "uint256"},
        ],
    },
]


class RpcService:
    def __init__(self):
        self._read_w3 = Web3(Web3.HTTPProvider(
            settings.rpc_read_url,
            request_kwargs={"timeout": 15},
        ))
        self._write_w3 = Web3(Web3.HTTPProvider(
            settings.rpc_url,
            request_kwargs={"timeout": 15},
        ))
        self._contract: Contract = self._read_w3.eth.contract(
            address=Web3.to_checksum_address(settings.multivault_address),
            abi=MULTIVAULT_ABI,
        )

    @property
    def read_w3(self) -> Web3:
        return self._read_w3

    @property
    def contract(self) -> Contract:
        return self._contract

    def get_atom_cost(self) -> int:
        return self._contract.functions.getAtomCost().call()

    def get_triple_cost(self) -> int:
        return self._contract.functions.getTripleCost().call()

    def get_balance(self, address: str) -> int:
        return self._read_w3.eth.get_balance(
            Web3.to_checksum_address(address)
        )

    def get_block_number(self) -> int:
        return self._read_w3.eth.block_number

    def is_term_created(self, term_id: str) -> bool:
        return self._contract.functions.isTermCreated(
            bytes.fromhex(term_id.removeprefix("0x"))
        ).call()

    def calculate_atom_id(self, data: bytes) -> str:
        result = self._contract.functions.calculateAtomId(data).call()
        return "0x" + result.hex()

    def calculate_triple_id(
        self, subject_id: str, predicate_id: str, object_id: str
    ) -> str:
        result = self._contract.functions.calculateTripleId(
            bytes.fromhex(subject_id.removeprefix("0x")),
            bytes.fromhex(predicate_id.removeprefix("0x")),
            bytes.fromhex(object_id.removeprefix("0x")),
        ).call()
        return "0x" + result.hex()

    def get_vault(self, term_id: str, curve_id: int = 1) -> dict:
        total_assets, total_shares = self._contract.functions.getVault(
            bytes.fromhex(term_id.removeprefix("0x")), curve_id
        ).call()
        return {"total_assets": total_assets, "total_shares": total_shares}

    def get_atom_data(self, atom_id: str) -> str:
        result = self._contract.functions.atom(
            bytes.fromhex(atom_id.removeprefix("0x"))
        ).call()
        return result.decode("utf-8", errors="replace")

    def get_triple(self, triple_id: str) -> dict:
        s, p, o = self._contract.functions.getTriple(
            bytes.fromhex(triple_id.removeprefix("0x"))
        ).call()
        return {
            "subject_id": "0x" + s.hex(),
            "predicate_id": "0x" + p.hex(),
            "object_id": "0x" + o.hex(),
        }

    def get_default_curve_id(self) -> int:
        result = self._contract.functions.getBondingCurveConfig().call()
        return result[1]

    def build_create_atoms_calldata(
        self, atom_datas: list[bytes], assets: list[int]
    ) -> dict:
        """Build unsigned tx params for createAtoms (direct MultiVault)."""
        create_atoms_abi = [
            {
                "name": "createAtoms",
                "type": "function",
                "stateMutability": "payable",
                "inputs": [
                    {"name": "atomDatas", "type": "bytes[]"},
                    {"name": "assets", "type": "uint256[]"},
                ],
                "outputs": [{"name": "", "type": "bytes32[]"}],
            }
        ]
        write_contract = self._write_w3.eth.contract(
            address=Web3.to_checksum_address(settings.multivault_address),
            abi=create_atoms_abi,
        )
        data = write_contract.encode_abi(
            "createAtoms", [atom_datas, assets]
        )
        return {
            "to": settings.multivault_address,
            "data": data,
            "value": str(sum(assets)),
            "chainId": str(settings.chain_id),
        }

    def build_create_triples_calldata(
        self,
        subject_ids: list[bytes],
        predicate_ids: list[bytes],
        object_ids: list[bytes],
        assets: list[int],
    ) -> dict:
        """Build unsigned tx params for createTriples (direct MultiVault)."""
        create_triples_abi = [
            {
                "name": "createTriples",
                "type": "function",
                "stateMutability": "payable",
                "inputs": [
                    {"name": "subjectIds", "type": "bytes32[]"},
                    {"name": "predicateIds", "type": "bytes32[]"},
                    {"name": "objectIds", "type": "bytes32[]"},
                    {"name": "assets", "type": "uint256[]"},
                ],
                "outputs": [{"name": "", "type": "bytes32[]"}],
            }
        ]
        write_contract = self._write_w3.eth.contract(
            address=Web3.to_checksum_address(settings.multivault_address),
            abi=create_triples_abi,
        )
        data = write_contract.encode_abi(
            "createTriples",
            [subject_ids, predicate_ids, object_ids, assets],
        )
        return {
            "to": settings.multivault_address,
            "data": data,
            "value": str(sum(assets)),
            "chainId": str(settings.chain_id),
        }


rpc_service = RpcService()
