from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    rpc_url: str = "https://rpc.intuition.systems/http"
    rpc_read_url: str = "https://vib.rpc.intuition.box/http"
    graphql_url: str = "https://mainnet.intuition.sh/v1/graphql"
    multivault_address: str = "0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e"
    chain_id: int = 1155
    explorer_url: str = "https://explorer.intuition.systems"
    cors_origins: str = "http://localhost:5173"

    class Config:
        env_file = ".env"


settings = Settings()
