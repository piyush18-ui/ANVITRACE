"""Evidence provenance and investigation snapshot schemas.

Implements Phase 4 evidence contract:
- Investigation Snapshot with full provenance metadata
- SHA-256 integrity checking (integrity mechanism, NOT proof of authenticity)
- Evidence items linked to exact source records
- Reproducibility metadata (dataset_hash, rule_version, app_version, parameters)
"""

from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field


class EvidenceItem(BaseModel):
    """Single evidence artifact linked to exact source records."""

    evidence_id: str = Field(..., description="Unique evidence item identifier")
    feature_name: str = Field(..., description="Forensic feature that produced this evidence")
    dataset_id: str = Field(..., description="Source dataset identifier")
    record_ids: list[str] = Field(default_factory=list, description="Exact source record_ids")
    transaction_ids: list[str] = Field(default_factory=list, description="Preserved source Transaction_IDs")
    investigation_id: str | None = Field(None, description="Investigation that produced this evidence")
    rule_version: str = Field(..., description="Detection rule version used")
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC), description="Evidence generation time")
    measured_value: Any = Field(None, description="Quantitative measurement backing this evidence")
    explanation: str = Field("", description="Human-readable evidence explanation")


class SnapshotRequest(BaseModel):
    """Request payload for creating an investigation evidence snapshot."""

    victim_account: str = Field(..., description="Victim account to investigate")
    dataset_id: str | None = Field(None, description="Dataset ID (defaults to latest)")
    max_hops: int = Field(4, ge=1, le=4, description="Maximum traversal depth")
    time_window_hours: float | None = Field(None, description="Max hours forward from victim transaction")
    min_amount: float | None = Field(None, description="Minimum transaction amount filter")


class InvestigationSnapshot(BaseModel):
    """Complete reproducible investigation snapshot with full provenance.

    Given the same dataset, dataset_hash, app_version, rule_version, victim_account,
    max_hops, time_window, and parameters, the investigation reproduces the same result.
    """

    investigation_id: str = Field(..., description="Unique investigation identifier")
    dataset_id: str = Field(..., description="Source dataset identifier")
    dataset_hash: str = Field(..., description="SHA-256 hash of the source dataset file")
    source_metadata: dict[str, Any] = Field(default_factory=dict, description="Source dataset metadata")
    normalization_version: str = Field("1.0.0", description="Normalization version used")
    rule_version: str = Field(..., description="Detection/rule engine version")
    threshold_configuration: dict[str, Any] = Field(default_factory=dict, description="Active threshold configuration")
    app_version: str = Field(..., description="Application/build version")
    victim_account: str = Field(..., description="Investigated victim account")
    max_hops: int = Field(..., description="Maximum traversal depth used")
    time_window_hours: float | None = Field(None, description="Time window parameter")
    min_amount: float | None = Field(None, description="Minimum amount filter")
    query_parameters: dict[str, Any] = Field(default_factory=dict, description="Full query parameters")
    supporting_record_ids: list[str] = Field(default_factory=list, description="All supporting record_ids")
    supporting_transaction_ids: list[str] = Field(default_factory=list, description="All supporting Transaction_IDs")
    result_hash: str = Field(..., description="SHA-256 integrity hash of the investigation result")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC), description="Snapshot creation time")

    # Investigation results
    money_trail_summary: dict[str, Any] = Field(default_factory=dict)
    layer_candidates: list[dict[str, Any]] = Field(default_factory=list)
    risk_summary: dict[str, Any] = Field(default_factory=dict)
    recovery_summary: dict[str, Any] = Field(default_factory=dict)
    shared_infrastructure: dict[str, Any] = Field(default_factory=dict)
    evidence_items: list[EvidenceItem] = Field(default_factory=list)

    # Integrity disclaimers
    integrity_disclaimer: str = Field(
        default=(
            "SHA-256 hashes provide data integrity verification only. "
            "A matching hash does NOT constitute proof of source authenticity or legal custody."
        ),
        description="Integrity mechanism disclaimer",
    )


class SnapshotResponse(BaseModel):
    """Response payload for investigation snapshot creation."""

    snapshot: InvestigationSnapshot
    reproducibility_note: str = Field(
        default=(
            "Given identical dataset, dataset_hash, app_version, rule_version, victim_account, "
            "max_hops, time_window, and parameters, this investigation will reproduce the same factual result."
        ),
    )


class EvidenceVerifyResponse(BaseModel):
    """Result of re-verifying stored evidence file against recorded digest."""

    evidence_id: str
    filename: str | None = None
    status: str = Field(..., description="VERIFIED, MISMATCH, or MISSING")
    recorded_sha256: str | None = None
    recomputed_sha256: str | None = None
    recorded_size: int | None = None
    current_size: int | None = None
    note: str


class EvidenceUploadVerifyResponse(BaseModel):
    """Result of judge-demo verify-by-upload against recorded digest."""

    evidence_id: str
    filename: str | None = None
    status: str = Field(..., description="VERIFIED or MISMATCH")
    recorded_sha256: str
    recomputed_sha256: str
    recorded_size: int
    candidate_size: int
    note: str


class VerificationEventItem(BaseModel):
    """Single chronological re-verification log entry."""

    event_id: str
    checked_at: str
    recomputed_sha256: str
    status: str
    note: str | None = None


class EvidenceDetailResponse(BaseModel):
    """Full metadata for a registered evidence file."""

    evidence_id: str
    dataset_id: str | None = None
    filename: str
    storage_path: str
    size_bytes: int
    algorithm: str
    sha256: str
    recorded_at: str
    last_verification_status: str


class AuditVerifyResponse(BaseModel):
    """Cryptographic audit chain verification result."""

    ok: bool
    status: str
    total_events: int
    last_hash: str | None = None
    broken_at_seq: int | None = None
    reason: str | None = None
    message: str


class AuditEventsResponse(BaseModel):
    """Paginated audit events response."""

    total: int
    limit: int
    offset: int
    events: list[dict[str, Any]]

