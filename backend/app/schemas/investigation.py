"""Investigation schemas for forensic multi-hop traces and amount lineage."""

from typing import Any

from pydantic import BaseModel, Field

from app.schemas.graph import MoneyTrailEdge, MoneyTrailGraph


class InvestigationParameters(BaseModel):
    """Configuration parameters for deterministic temporal trace."""

    max_hops: int = Field(default=4, ge=1, le=4, description="Bounded maximum depth (1..4)")
    time_window_hours: float | None = Field(
        default=None,
        description="Optional maximum chronological window forward from victim transaction in hours",
    )
    min_amount: float | None = Field(
        default=None,
        description="Optional minimum transaction amount filter",
    )
    rule_version: str = "2.0.0"


class EvidenceMetadata(BaseModel):
    """Evidence provenance metadata for investigation results.

    Exposes: record_ids, transaction_ids, dataset_hash, rule_version, result_hash.
    """

    record_ids: list[str] = Field(default_factory=list, description="Supporting record_ids from source data")
    transaction_ids: list[str] = Field(default_factory=list, description="Supporting Transaction_IDs from source data")
    dataset_hash: str = Field("", description="SHA-256 of the source dataset")
    rule_version: str = Field("2.0.0", description="Detection/rule engine version")
    result_hash: str = Field("", description="SHA-256 integrity hash of investigation result")
    lineage_rule: str = Field("conservative_inflow_proportional", description="Amount lineage algorithm used")
    max_bounded_depth: int = Field(4, description="Maximum traversal depth enforced")


class InvestigationTraceResponse(BaseModel):
    """Full forensic investigation trace result.

    Final investigation object contract:
    - investigation_id, victim_account, parameters
    - money_trail, graph
    - layer_candidates, risk (score + tier + features)
    - recovery, shared_infrastructure
    - evidence (record_ids, transaction_ids, dataset_hash, rule_version, result_hash)
    """

    investigation_id: str
    dataset_id: str
    victim_account: str
    victim_transaction: dict[str, Any] | None = None
    parameters: InvestigationParameters
    money_trail: list[MoneyTrailEdge] = Field(default_factory=list)
    graph: MoneyTrailGraph | None = None
    execution_time_ms: float = 0.0

    # Phase 3/4 enrichments
    layer_candidates: list[dict[str, Any]] = Field(default_factory=list)
    risk_summary: dict[str, Any] = Field(default_factory=dict)
    recovery_summary: dict[str, Any] = Field(default_factory=dict)
    shared_infrastructure: dict[str, Any] = Field(default_factory=dict)
    evidence_metadata: EvidenceMetadata = Field(default_factory=EvidenceMetadata)

