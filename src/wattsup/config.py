from pathlib import Path
from typing import Self
from urllib.parse import quote_plus

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# wattsup/src/wattsup/config.py -> project root (where pyproject.toml and .env live)
_WATTSUP_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_WATTSUP_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    mongodb_uri: str = Field(default="mongodb://localhost:27017", validation_alias="MONGODB_URI")
    mongodb_db: str = Field(default="wattsup", validation_alias="MONGODB_DB")
    mongodb_host: str = Field(default="localhost", validation_alias="MONGODB_HOST")
    mongodb_port: int = Field(default=27017, validation_alias="MONGODB_PORT")
    mongodb_username: str | None = Field(default=None, validation_alias="MONGODB_USERNAME")
    mongodb_password: str | None = Field(default=None, validation_alias="MONGODB_PASSWORD")
    mongodb_auth_source: str | None = Field(default="admin", validation_alias="MONGODB_AUTH_SOURCE")

    @model_validator(mode="after")
    def assemble_mongodb_uri_from_credentials(self) -> Self:
        """If MONGODB_USERNAME is set, build MONGODB_URI (password is URL-encoded)."""
        if not self.mongodb_username:
            return self
        password = self.mongodb_password if self.mongodb_password is not None else ""
        user = quote_plus(self.mongodb_username)
        pwd = quote_plus(password)
        host = self.mongodb_host
        port = self.mongodb_port
        uri = f"mongodb://{user}:{pwd}@{host}:{port}/"
        if self.mongodb_auth_source:
            uri = f"{uri}?authSource={quote_plus(self.mongodb_auth_source)}"
        object.__setattr__(self, "mongodb_uri", uri)
        return self

    comed_5min_url: str = Field(
        default="https://hourlypricing.comed.com/api?type=5minutefeed&format=json",
        validation_alias="COMED_5MIN_URL",
    )
    http_timeout_seconds: float = Field(default=30.0, validation_alias="HTTP_TIMEOUT_SECONDS")
    gridstatus_timeout_seconds: float = Field(
        default=120.0, validation_alias="GRIDSTATUS_TIMEOUT_SECONDS"
    )

    gridstatus_api_key: str | None = Field(
        default=None,
        validation_alias="GRIDSTATUS_API_KEY",
        description="GridStatus.io hosted API key (preferred over direct PJM).",
    )
    gridstatus_io_fuel_dataset: str = Field(
        default="pjm_fuel_mix", validation_alias="GRIDSTATUS_IO_FUEL_DATASET"
    )
    gridstatus_io_row_limit: int = Field(
        default=5000, validation_alias="GRIDSTATUS_IO_ROW_LIMIT"
    )

    pjm_api_key: str | None = Field(
        default=None,
        validation_alias="PJM_API_KEY",
        description="PJM Data Miner API key; used if GridStatus.io is not configured or fails.",
    )

    k2v2_base_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("K2V2_BASE_URL", "LAVA_BASE_URL"),
    )
    k2v2_api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("K2V2_API_KEY", "LAVA_KEY"),
    )
    # Defaults suit Lava / OpenAI-compatible gateways; override with GEMINI_* for native Gemini IDs.
    gemini_flash_model: str = Field(
        default="gpt-4o-mini", validation_alias="GEMINI_FLASH_MODEL"
    )
    gemini_pro_model: str = Field(default="gpt-4o", validation_alias="GEMINI_PRO_MODEL")

    hex_api_key: str | None = Field(default=None, validation_alias="HEX_API_KEY")
    hex_run_url: str | None = Field(default=None, validation_alias="HEX_RUN_URL")

    telegram_bot_token: str | None = Field(default=None, validation_alias="TELEGRAM_BOT_TOKEN")
    telegram_chat_id: str | None = Field(default=None, validation_alias="TELEGRAM_CHAT_ID")
    whatsapp_webhook_url: str | None = Field(default=None, validation_alias="WHATSAPP_WEBHOOK_URL")

    slack_webhook_url: str | None = Field(
        default=None,
        validation_alias="SLACK_WEBHOOK_URL",
        description="Incoming webhook URL for proactive price/eco alerts.",
    )
    slack_signing_secret: str | None = Field(
        default=None,
        validation_alias="SLACK_SIGNING_SECRET",
        description="For verifying Slack Events API requests to /webhooks/slack.",
    )
    slack_bot_token: str | None = Field(
        default=None,
        validation_alias="SLACK_BOT_TOKEN",
        description="xoxb- token to post agent replies when using Events API (chat.postMessage).",
    )
    slack_app_token: str | None = Field(
        default=None,
        validation_alias="SLACK_APP_TOKEN",
        description="xapp- app-level token for Slack Socket Mode (receives events without public URL).",
    )

    ideal_price_cents_max: float | None = Field(
        default=None,
        validation_alias="IDEAL_PRICE_CENTS_MAX",
        description="If set, push when ComEd 5m price drops to or below this (edge-triggered).",
    )
    alert_cooldown_seconds: int = Field(
        default=900,
        ge=60,
        validation_alias="ALERT_COOLDOWN_SECONDS",
        description="Minimum gap between duplicate z-score push notifications per user.",
    )

    zscore_window: int = Field(default=96, validation_alias="ZSCORE_WINDOW")
    zscore_sigma: float = Field(default=2.0, validation_alias="ZSCORE_SIGMA")
    fallback_demand_mw: float = Field(default=90_000.0, validation_alias="FALLBACK_DEMAND_MW")
    pro_history_threshold: int = Field(
        default=36,
        validation_alias="PRO_HISTORY_THRESHOLD",
        description="Minimum prior scores to route LLM analysis to Gemini Pro.",
    )

    wattsup_host: str = Field(default="127.0.0.1", validation_alias="WATTSUP_HOST")
    wattsup_port: int = Field(default=8000, validation_alias="WATTSUP_PORT")
    wattsup_default_user_id: str = Field(
        default="default",
        validation_alias="WATTSUP_DEFAULT_USER_ID",
        description="Maps chat webhooks (Slack/Telegram) to energy_logs user_id when not overridden.",
    )

    poll_interval_seconds: int = Field(
        default=300,
        ge=60,
        validation_alias="POLL_INTERVAL_SECONDS",
        description="Background worker sleep between energy polls (ComEd + grid + Mongo).",
    )
