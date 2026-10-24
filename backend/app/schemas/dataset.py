"""Pydantic schemas for dataset operations and statistics."""

from datetime import datetime

from pydantic import BaseModel, Field


class DatasetUploadResponse(BaseModel):
    """Response returned upon triggering dataset ingestion."""

    dataset_id: str = Field(..., description="Unique deterministic identifier of dataset")
    dataset_hash: str = Field(..., description="SHA-256 hash of original raw dataset")
    filename: str = Field(..., description="Name of the uploaded file")
    status: str = Field(..., description="Current status (PROCESSING, COMPLETED, FAILED)")
    message: str = Field(..., description="Status message")


class DatasetStatusResponse(BaseModel):
    """Response containing status of a dataset ingestion run."""

    dataset_id: str
    dataset_hash: str
    filename: str
    status: str
    total_rows: int
    valid_rows: int
    invalid_rows: int
    uploaded_at: datetime
    duration_seconds: float | None = None
    rows_per_second: float | None = None
    error_message: str | None = None


class DatasetStatisticsResponse(BaseModel):
    """Detailed forensic statistics and metrics for an ingested dataset."""

    dataset_id: str
    dataset_hash: str
    filename: str
    total_rows: int
    valid_rows: int
    invalid_rows: int
    repeated_tx_ids: int
    exact_duplicates: int
    schema_version: str
    normalization_version: str
    uploaded_at: datetime
    status: str
    # Analytical summaries
    distinct_senders: int = 0
    distinct_receivers: int = 0
    total_accounts: int = 0
    total_volume_inr: float = 0.0
    payment_mode_distribution: dict[str, int] = Field(default_factory=dict)
    ingestion_duration_seconds: float | None = None
    rows_per_second: float | None = None
    peak_memory_mb: float | None = None
