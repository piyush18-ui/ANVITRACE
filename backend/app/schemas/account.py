"""Account-related schemas for profile, summary, and timeline queries."""

from datetime import datetime

from pydantic import BaseModel, Field


class AccountSummaryResponse(BaseModel):
    """Forensic summary profile of an account."""

    account_id: str
    dataset_id: str
    in_tx_count: int = 0
    out_tx_count: int = 0
    in_amount: float = 0.0
    out_amount: float = 0.0
    net_flow: float = 0.0
    distinct_senders: int = 0
    distinct_receivers: int = 0
    first_tx_timestamp: datetime | None = None
    last_tx_timestamp: datetime | None = None


class AccountTransactionItem(BaseModel):
    """Single transaction entry in an account chronological timeline."""

    record_id: str
    Transaction_ID: str
    direction: str = Field(..., description="'IN' or 'OUT'")
    counterparty_account: str
    amount: float
    timestamp: datetime
    payment_mode: str
    narration: str | None = None
    ip_address: str | None = None
    device_type: str | None = None
    validation_status: str | None = None


class AccountTransactionsResponse(BaseModel):
    """Chronologically ordered transaction timeline for an account."""

    account_id: str
    dataset_id: str
    total_transactions: int
    transactions: list[AccountTransactionItem] = Field(default_factory=list)
