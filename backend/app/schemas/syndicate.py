"""Cross-victim shared infrastructure schemas.

Adheres strictly to candidate linkage terminology:
- Identifies common accounts, shared device indicators, shared IP indicators, and exact connecting transactions.
- Never asserts criminal guilt; presents forensic correlation hypotheses.
"""

from datetime import datetime

from pydantic import BaseModel, Field


class ConnectingTransaction(BaseModel):
    """Forensic transaction linking a victim trace to shared infrastructure."""

    record_id: str = Field(..., description="Unique record identifier")
    Transaction_ID: str = Field(..., description="Original transaction identifier")
    victim_account: str = Field(..., description="Originating victim account for this path")
    from_account: str = Field(..., description="Source account of this hop")
    to_account: str = Field(..., description="Destination account of this hop")
    amount: float = Field(..., description="Transaction amount")
    timestamp: datetime = Field(..., description="Transaction timestamp")
    payment_mode: str = Field(..., description="Payment mode (UPI, IMPS, etc.)")
    hop_level: int = Field(..., description="Hop distance from the originating victim")


class SharedInfrastructureCandidate(BaseModel):
    """Account or node identified as receiving or distributing funds originating from multiple victims."""

    candidate_account_id: str = Field(..., description="Account identifier of the candidate node")
    connected_victim_accounts: list[str] = Field(
        ..., description="List of victim accounts whose funds reach or pass through this node"
    )
    victim_count: int = Field(..., description="Number of distinct victim accounts linked")
    shared_device_types: list[str] = Field(
        default_factory=list, description="Anomalous or shared device types observed on this node"
    )
    shared_ip_addresses: list[str] = Field(
        default_factory=list, description="Anomalous or shared IP addresses observed on this node"
    )
    connecting_transactions: list[ConnectingTransaction] = Field(
        default_factory=list, description="Exact transactions connecting the victims to this candidate"
    )
    total_flowing_amount: float = Field(
        ..., description="Aggregated amount flowing from all linked victims through this candidate"
    )
    candidate_layer_roles: list[str] = Field(
        default_factory=list, description="Observed candidate layer roles (e.g. Collector, Distributor)"
    )
    linkage_rationale: str = Field(
        ..., description="Forensic explanation of how and why this account is linked across victims"
    )


class CrossVictimAnalysisRequest(BaseModel):
    """Request payload for cross-victim shared infrastructure analysis."""

    victim_accounts: list[str] = Field(
        ...,
        min_length=2,
        description="List of two or more victim account identifiers to analyze for shared infrastructure",
    )
    dataset_id: str | None = Field(
        None, description="Optional dataset identifier. If omitted, uses the latest ingested dataset."
    )
    max_hops: int = Field(
        4, ge=1, le=4, description="Maximum traversal depth from each victim (bounded at 4)"
    )


class CrossVictimAnalysisResponse(BaseModel):
    """Response payload detailing detected shared infrastructure candidates and correlation evidence."""

    dataset_id: str = Field(..., description="Dataset identifier")
    analyzed_victims: list[str] = Field(..., description="Victim accounts analyzed")
    shared_infrastructure_candidates: list[SharedInfrastructureCandidate] = Field(
        default_factory=list,
        description="Accounts appearing downstream across multiple victim money trails",
    )
    shared_device_correlations: dict[str, list[str]] = Field(
        default_factory=dict,
        description="Device types shared across different victim branches (device -> list of accounts)",
    )
    shared_ip_correlations: dict[str, list[str]] = Field(
        default_factory=dict,
        description="IP addresses or subnets shared across different victim branches (ip -> list of accounts)",
    )
    candidate_linkage_disclaimer: str = Field(
        default="Candidate linkage terminology: These correlations identify shared infrastructure candidate indicators for forensic hypothesis testing. They do not constitute conclusive proof of a coordinated criminal syndicate.",
        description="Mandatory candidate terminology disclaimer",
    )
