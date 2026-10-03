"""Document generation request/response schemas.

Implements:
- Case Diary: deterministic evidence-backed document pipeline
- Bank Freeze Requisition: draft with only verified fields
- Validation before rendering — no factual fields from outside validated evidence
"""

from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field


class CaseDiaryRequest(BaseModel):
    """Request payload for deterministic case diary generation."""

    victim_account: str = Field(..., description="Victim account to document")
    dataset_id: str | None = Field(None, description="Dataset ID (defaults to latest)")
    investigation_id: str | None = Field(None, description="Existing investigation ID to reference")
    max_hops: int = Field(4, ge=1, le=4, description="Maximum traversal depth")
    officer_name: str = Field("Investigating Officer", description="Name of reviewing officer")
    officer_designation: str = Field("Cyber Crime Cell", description="Officer designation")
    case_reference: str = Field("", description="Optional case reference number")


class CaseDiaryResponse(BaseModel):
    """Response payload containing rendered case diary metadata."""

    document_id: str = Field(..., description="Unique document identifier")
    investigation_id: str = Field(..., description="Investigation that produced this diary")
    victim_account: str
    dataset_id: str
    file_path: str = Field(..., description="Local path to generated document")
    file_format: str = Field("PDF", description="Output format")
    page_count: int = Field(0, description="Number of pages")
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    evidence_item_count: int = Field(0, description="Number of evidence items included")
    integrity_hash: str = Field("", description="SHA-256 of the generated document")
    factual_validation_passed: bool = Field(
        True,
        description="Whether all factual fields in the document were validated against backend evidence",
    )
    diary_text: str | None = Field(None, description="Full 23-section forensic case diary report text")
    txt_file_path: str | None = Field(None, description="Local path to .txt formatted diary")
    disclaimer: str = Field(
        default=(
            "This document contains only validated factual fields from backend evidence. "
            "No free-form narrative invents factual fields. Officer review and approval is required."
        ),
    )


class FreezeRequisitionRequest(BaseModel):
    """Request payload for bank freeze requisition draft."""

    target_account_id: str = Field(..., description="Account to freeze")
    dataset_id: str | None = Field(None, description="Dataset ID (defaults to latest)")
    investigation_id: str | None = Field(None, description="Existing investigation ID")
    requesting_officer: str = Field("Investigating Officer", description="Requesting officer name")
    requesting_designation: str = Field("Cyber Crime Cell", description="Officer designation")
    requesting_authority: str = Field("", description="Requesting authority / police station")
    case_reference: str = Field("", description="FIR/case reference number")
    bank_name: str = Field("", description="Target bank name (updatable configuration)")
    branch_name: str = Field("", description="Target branch name")


class FreezeRequisitionResponse(BaseModel):
    """Response payload containing rendered freeze requisition metadata."""

    document_id: str = Field(..., description="Unique document identifier")
    investigation_id: str = Field(..., description="Associated investigation")
    target_account_id: str
    dataset_id: str
    file_path: str = Field(..., description="Local path to generated document")
    file_format: str = Field("PDF", description="Output format")
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    integrity_hash: str = Field("", description="SHA-256 of the generated document")
    contains_only_verified_fields: bool = Field(
        True,
        description="Confirms all account, IFSC, and transaction fields come from validated records",
    )
    officer_approval_required: bool = Field(
        True,
        description="Officer review and approval is required before any external dispatch",
    )
    automatic_dispatch_enabled: bool = Field(
        False,
        description="No automatic external bank dispatch is supported",
    )
    disclaimer: str = Field(
        default=(
            "This is a DRAFT requisition containing only verified fields from validated backend evidence. "
            "Unknown values remain marked as unavailable. Officer review and approval is REQUIRED. "
            "No automatic external bank dispatch is supported."
        ),
    )
    evidence_summary: dict[str, Any] = Field(
        default_factory=dict,
        description="Summary of verified evidence backing this requisition",
    )
