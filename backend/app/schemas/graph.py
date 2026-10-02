"""Graph and money trail schemas."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class MoneyTrailEdge(BaseModel):
    """Forensic directed edge in a multi-hop money trail."""

    hop: int = Field(..., ge=1, le=4, description="Hop depth (1 to 4)")
    record_id: str = Field(..., description="Unique physical internal record identifier")
    Transaction_ID: str = Field(..., description="Source transaction ID")
    from_account: str
    to_account: str
    amount: float
    timestamp: datetime
    payment_mode: str
    # Lineage fields
    attributable_amount: float = Field(..., description="Calculated conservative lineage amount")
    lineage_status: str = Field(
        ...,
        description="'traced', 'attributed', 'estimated', or 'unresolved'",
    )
    is_cycle: bool = False
    parent_record_id: str | None = None
    direction: str = Field("downstream", description="'root' | 'upstream' | 'downstream'")
    provenance: dict[str, Any] = Field(default_factory=dict)


class MoneyTrailGraph(BaseModel):
    """Structured graph representation of an investigation trace."""

    nodes: list[str] = Field(default_factory=list)
    edges: list[MoneyTrailEdge] = Field(default_factory=list)
    total_hops_found: int = 0
    total_attributed_amount: float = 0.0
