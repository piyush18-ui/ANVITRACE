"""Risk analysis and explainable Mule Risk Index schemas.

Enforces candidate terminology and the mandatory feature output contract:
- feature_name
- measured_value
- threshold_configured
- supporting_record_ids
- supporting_transaction_ids
- data_quality_confidence
- score_contribution
"""

from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field


class RiskFeature(BaseModel):
    """Explainable risk feature contract fulfilling the Engineering Report requirement."""

    feature_name: str = Field(..., description="Name of the forensic pattern/feature")
    measured_value: Any = Field(..., description="Observed quantitative or qualitative measurement")
    threshold_configured: Any = Field(..., description="Active threshold configuration used for detection")
    supporting_record_ids: list[str] = Field(
        default_factory=list, description="Unique primary keys of supporting transaction records"
    )
    supporting_transaction_ids: list[str] = Field(
        default_factory=list, description="Preserved source Transaction_IDs from raw data"
    )
    data_quality_confidence: float = Field(
        1.0, ge=0.0, le=1.0, description="Data quality / confidence factor for this feature"
    )
    score_contribution: float = Field(
        0.0, ge=0.0, le=100.0, description="Contribution of this feature to the 0-100 Mule Risk Index"
    )
    explanation: str = Field(..., description="Human-readable explanation of why this feature fired")


class LayerClassification(BaseModel):
    """Evidence-backed candidate layer classification (L1/L2/L3)."""

    role: str = Field(
        ...,
        description="Candidate role: 'Layer 1 Collector Candidate', 'Layer 2 Distributor Candidate', or 'Layer 3 Terminal Candidate'",
    )
    confidence: float = Field(..., ge=0.0, le=1.0, description="Classification confidence based on evidence volume")
    evidence_summary: str = Field(..., description="Summary of forensic indicators justifying this candidate role")
    supporting_record_ids: list[str] = Field(
        default_factory=list, description="Supporting transaction record IDs establishing this role"
    )


class AccountRiskProfileResponse(BaseModel):
    """Complete explainable risk profile for an account."""

    account_id: str = Field(..., description="12-character sanitized account identifier")
    dataset_id: str = Field(..., description="Forensic dataset scope identifier")
    mule_risk_index: float = Field(
        ..., ge=0.0, le=100.0, description="Mule Risk Index (0-100 score). Higher indicates stronger anomalous patterns."
    )
    risk_tier: str = Field(..., description="Risk tier: 'LOW', 'MEDIUM', 'HIGH', or 'CRITICAL'")
    rule_version: str = Field(..., description="Version of the risk rules used to generate this assessment")
    candidate_terminology_disclaimer: str = Field(
        default="This risk index is an investigative prioritization indicator and candidate hypothesis. It is NOT legal proof or automatic evidence of criminal intent.",
        description="Legal and forensic disclaimer emphasizing candidate terminology",
    )
    layer_classifications: list[LayerClassification] = Field(
        default_factory=list,
        description="Candidate layer classifications (accounts may exhibit multiple roles)",
    )
    features: list[RiskFeature] = Field(
        default_factory=list,
        description="Detailed list of explainable risk features and their score contributions",
    )
    calculated_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        description="Timestamp of risk calculation",
    )
