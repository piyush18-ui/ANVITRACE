"""API routes for dataset ingestion, status tracking, and analytical statistics."""

import shutil

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status

from app.config.settings import settings
from app.database.duckdb import get_connection
from app.database.repositories.dataset import DatasetRepository
from app.schemas.dataset import (
    DatasetStatisticsResponse,
    DatasetStatusResponse,
    DatasetUploadResponse,
)
from app.services.ingestion import IngestionService, compute_file_sha256
from app.utils.logging import logger

router = APIRouter(prefix="/dataset", tags=["dataset"])


@router.post(
    "/upload",
    response_model=DatasetUploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload and ingest a forensic transaction dataset",
)
async def upload_dataset(
    file: UploadFile = File(..., description="CSV dataset file of financial transactions"),
):
    """Save uploaded CSV to data/raw, compute SHA-256, and trigger streaming ingestion."""
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .csv files are supported for ingestion.",
        )

    raw_dir = settings.project_root / settings.DATA_RAW_DIR
    raw_dir.mkdir(parents=True, exist_ok=True)
    temp_target = raw_dir / file.filename

    # Save to disk securely with 1MB chunk buffer
    try:
        with open(temp_target, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer, length=1024 * 1024)
    except Exception as e:
        logger.error(f"Failed to save uploaded file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not persist uploaded file: {e}",
        )

    # Compute deterministic SHA-256
    file_hash = compute_file_sha256(temp_target)
    dataset_id = f"ds_{file_hash[:16]}"

    # Execute streaming ingestion in worker thread so event loop remains responsive
    try:
        import asyncio
        service = IngestionService(get_connection())
        result = await asyncio.to_thread(
            service.ingest_file,
            temp_target,
            dataset_id=dataset_id,
            dataset_hash=file_hash,
        )
        return DatasetUploadResponse(
            dataset_id=dataset_id,
            dataset_hash=file_hash,
            filename=file.filename,
            status=result["status"],
            message=f"Dataset ingested successfully. Processed {result['total_rows']:,} rows.",
        )
    except Exception as e:
        logger.error(f"Ingestion failed for {dataset_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ingestion failed: {e}",
        )


@router.get(
    "/status",
    response_model=DatasetStatusResponse,
    summary="Get ingestion status and progress for a dataset",
)
async def get_dataset_status(
    dataset_id: str | None = Query(
        None, description="Optional dataset_id. If omitted, returns latest ingested dataset."
    ),
):
    """Retrieve status, duration, throughput and row metrics."""
    conn = get_connection()
    repo = DatasetRepository(conn)

    if not dataset_id:
        latest = repo.get_latest_dataset()
        if not latest:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No datasets have been ingested yet.",
            )
        dataset_id = latest["dataset_id"]

    stat = repo.get_dataset_status(dataset_id)
    if not stat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found.",
        )
    return stat


@router.get(
    "/statistics",
    response_model=DatasetStatisticsResponse,
    summary="Get forensic statistics, distinct account volumes, and duplicate metrics",
)
async def get_dataset_statistics(
    dataset_id: str | None = Query(
        None, description="Optional dataset_id. If omitted, returns statistics for latest dataset."
    ),
):
    """Retrieve analytical breakdown of volume, accounts, payment modes, and duplicates."""
    conn = get_connection()
    repo = DatasetRepository(conn)

    if not dataset_id:
        latest = repo.get_latest_dataset()
        if not latest:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No datasets have been ingested yet.",
            )
        dataset_id = latest["dataset_id"]

    stats = repo.get_dataset_statistics(dataset_id)
    if not stats:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found.",
        )
    return stats


@router.post(
    "/reset",
    summary="Clear all ingested datasets and transaction records",
)
async def reset_dataset():
    """Clear all ingested transactions, datasets, and analytical features from DuckDB instantly."""
    from app.database.schema import apply_schema
    conn = get_connection()
    try:
        tables = [
            "evidence_items",
            "legal_documents",
            "evidence_snapshots",
            "investigation_snapshots",
            "transaction_features",
            "account_features",
            "transactions",
            "ingestion_runs",
            "datasets",
        ]
        for t in tables:
            conn.execute(f"DROP TABLE IF EXISTS {t} CASCADE;")
        apply_schema(conn)
        conn.execute("CHECKPOINT;")
        logger.info("Successfully cleared all ingested dataset tables and transaction records from DuckDB.")
        return {"status": "success", "message": "All ingested dataset tables and transaction records have been cleared."}
    except Exception as e:
        logger.error(f"Failed to reset database: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset database: {e}",
        )

