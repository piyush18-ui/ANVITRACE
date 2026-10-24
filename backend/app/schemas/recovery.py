"""Recovery analysis schemas for transaction-derived recovery candidate prioritization."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class RecoveryCandidate(BaseModel):
    """Transaction-derived recovery investigation candidate."""

    account_id: str = Field(..., description="Target account identifier")
    observed_net_flow: float = Field(
        ...,
        description="sum(observed incoming amounts) - sum(observed outgoing amounts) within the observed scope",
    )
    total_incoming_amount: float = Field(..., description="Total observed incoming funds")
    total_outgoing_amount: float = Field(..., description="Total observed outgoing funds")
    retention_percentage: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Percentage of incoming funds retained within the observation period",
    )
    time_window_start: datetime | None = Field(
        None, description="Earliest transaction timestamp observed for this account"
    )
    time_window_end: datetime | None = Field(
        None, description="Latest transaction timestamp observed for this account"
    )
    supporting_incoming_record_ids: list[str] = Field(
        default_factory=list, description="Record IDs of observed incoming transactions"
    )
    supporting_outgoing_record_ids: list[str] = Field(
        default_factory=list, description="Record IDs of observed outgoing transactions"
    )
    mule_risk_index: float | None = Field(
        None, description="Mule Risk Index for this account if computed"
    )
    recovery_priority_score: float = Field(
        ...,
        description="Priority ranking score combining observed net flow, retention, and risk index",
    )
    recovery_related_evidence: dict[str, Any] = Field(
        default_factory=dict,
        description="Forensic context such as terminal payment modes, counterparty summaries, or narratives",
    )
    disclaimer: str = Field(
        default="Observed Net Flow is strictly limited to the selected dataset and investigation window. It represents transaction-derived observed net flow and is NOT a verified current bank balance.",
        description="Mandatory disclaimer on balance authority",
    )


class RecoveryCandidatesResponse(BaseModel):
    """Response containing ranked recovery candidates."""

    dataset_id: str = Field(..., description="Dataset identifier")
    total_candidates: int = Field(..., description="Total accounts identified with positive observed net flow")
    candidates: list[RecoveryCandidate] = Field(
        default_factory=list, description="Ranked list of recovery candidates"
    )
    methodology: str = Field(
        default="Ranked by ObservedNetFlow = sum(incoming) - sum(outgoing) within dataset scope, weighted by retention percentage and risk index.",
        description="Analytical methodology explanation",
    )
