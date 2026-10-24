"""API routes for dataset ingestion, status tracking, and analytical statistics."""

import shutil

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status

from app.config.settings import settings
from app.database.duckdb import get_connection
from app.database.repositories.dataset import DatasetRepository
from app.evidence.audit import AuditService
from app.evidence.integrity import EvidenceIntegrityService
from app.schemas.dataset import (
    DatasetStatisticsResponse,
    DatasetStatusResponse,
    DatasetUploadResponse,
)
from app.services.ingestion import IngestionService
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
    override_manifest: bool = Query(
        False,
        description="Explicit investigator override to ingest despite trusted manifest discrepancy",
    ),
):
    """Save uploaded CSV in 8 MB streaming chunks while hashing, verify integrity, and ingest."""
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .csv files are supported for ingestion.",
        )

    conn = get_connection()
    integrity_svc = EvidenceIntegrityService(conn)
    audit_svc = AuditService(conn)

    # 1. Save and hash in 8 MB chunks (single-pass, zero whole-file reads into RAM), fsync, set read-only
    raw_dir = settings.project_root / settings.DATA_RAW_DIR
    try:
        reg_info = integrity_svc.save_and_hash_upload(
            file_stream=file.file,
            filename=file.filename,
            dest_dir=raw_dir,
            actor="investigator",
        )
    except Exception as e:
        logger.error(f"Failed to stream and hash uploaded file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not persist uploaded file: {e}",
        )

    evidence_id = reg_info["evidence_id"]
    storage_path = Path(reg_info["storage_path"])
    file_hash = reg_info["sha256"]
    dataset_id = f"ds_{file_hash[:16]}"
    manifest_warning = reg_info.get("manifest_warning")
    warning_info = reg_info.get("warning")

    # 2. Check trusted manifest: block ingestion if discrepancy and no override
    if manifest_warning:
        if not override_manifest:
            audit_svc.append_event(
                action="INGESTION_BLOCKED",
                entity_type="dataset",
                entity_id=dataset_id,
                details={
                    "evidence_id": evidence_id,
                    "filename": file.filename,
                    "reason": "DIFFERS_FROM_TRUSTED_ORIGINAL",
                    "expected_sha256": manifest_warning.get("expected_sha256"),
                    "calculated_sha256": file_hash,
                },
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "DIFFERS_FROM_TRUSTED_ORIGINAL",
                    "message": manifest_warning["message"],
                    "evidence_id": evidence_id,
                    "expected_sha256": manifest_warning.get("expected_sha256"),
                    "calculated_sha256": file_hash,
                },
            )
        else:
            audit_svc.append_event(
                action="MANIFEST_OVERRIDE",
                entity_type="dataset",
                entity_id=dataset_id,
                details={
                    "evidence_id": evidence_id,
                    "filename": file.filename,
                    "overridden_hash": file_hash,
                },
            )

    # 3. Pre-ingestion check: verify_evidence must be VERIFIED
    verif = integrity_svc.verify_evidence(evidence_id)
    if verif["status"] != "VERIFIED":
        audit_svc.append_event(
            action="INGESTION_BLOCKED",
            entity_type="dataset",
            entity_id=dataset_id,
            details={
                "evidence_id": evidence_id,
                "status": verif["status"],
                "note": verif.get("note"),
            },
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ingestion blocked: Evidence integrity verification failed ({verif['status']}).",
        )

    # 4. Audit INGESTION_STARTED
    audit_svc.append_event(
        action="INGESTION_STARTED",
        entity_type="dataset",
        entity_id=dataset_id,
        details={
            "evidence_id": evidence_id,
            "filename": file.filename,
            "storage_path": str(storage_path),
        },
    )

    # 5. Link evidence_files to dataset_id in DuckDB
    conn.execute(
        f"UPDATE evidence_files SET dataset_id = '{dataset_id}' WHERE evidence_id = '{evidence_id}'"
    )

    # 6. Execute streaming ingestion in worker thread so event loop remains responsive
    try:
        import asyncio
        service = IngestionService(conn)
        result = await asyncio.to_thread(
            service.ingest_file,
            storage_path,
            dataset_id=dataset_id,
            dataset_hash=file_hash,
        )

        msg = f"Dataset ingested successfully. Processed {result['total_rows']:,} rows."
        if manifest_warning and manifest_warning.get("expected_rows"):
            exp_r = manifest_warning["expected_rows"]
            msg += f" (Manifest expected: {exp_r:,} rows; Actual: {result['total_rows']:,} rows)."

        return DatasetUploadResponse(
            dataset_id=dataset_id,
            dataset_hash=file_hash,
            filename=file.filename,
            status=result["status"],
            message=msg,
            evidence_id=evidence_id,
            warning=warning_info,
            manifest_warning=manifest_warning,
        )
    except Exception as e:
        logger.error(f"Ingestion failed for {dataset_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ingestion failed: {e}",
        )


@router.post(
    "/upload-multi",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload and ingest multiple forensic evidence files simultaneously",
)
async def upload_multiple_datasets(
    files: list[UploadFile] = File(..., description="Multiple CSV forensic evidence files"),
):
    """Save multiple CSV files, compute hashes in 8 MB chunks, and perform multi-file ingestion."""
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one evidence CSV file is required.",
        )

    conn = get_connection()
    integrity_svc = EvidenceIntegrityService(conn)
    audit_svc = AuditService(conn)
    raw_dir = settings.project_root / settings.DATA_RAW_DIR
    raw_dir.mkdir(parents=True, exist_ok=True)

    saved_paths: list[Path] = []
    registered_evidence_ids: list[str] = []

    try:
        for f in files:
            if not f.filename or not f.filename.endswith(".csv"):
                continue
            reg = integrity_svc.save_and_hash_upload(
                file_stream=f.file,
                filename=f.filename,
                dest_dir=raw_dir,
            )
            saved_paths.append(Path(reg["storage_path"]))
            registered_evidence_ids.append(reg["evidence_id"])

        if not saved_paths:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid .csv files found in upload payload.",
            )

        import asyncio
        service = IngestionService(conn)
        result = await asyncio.to_thread(service.ingest_multiple_files, saved_paths)

        # Link evidence records to dataset_id
        ds_id = result["dataset_id"]
        for eid in registered_evidence_ids:
            conn.execute(
                f"UPDATE evidence_files SET dataset_id = '{ds_id}' WHERE evidence_id = '{eid}'"
            )

        audit_svc.append_event(
            action="INGESTION_STARTED",
            entity_type="dataset",
            entity_id=ds_id,
            details={
                "total_files": len(saved_paths),
                "evidence_ids": registered_evidence_ids,
            },
        )

        return {
            "status": "COMPLETED",
            "dataset_id": result["dataset_id"],
            "dataset_hash": result["dataset_hash"],
            "total_files": result["total_files"],
            "total_rows": result["total_rows"],
            "valid_rows": result["valid_rows"],
            "invalid_rows": result["invalid_rows"],
            "files": result["files"],
            "evidence_ids": registered_evidence_ids,
            "message": f"Successfully ingested {len(saved_paths)} evidence files ({result['total_rows']:,} rows).",
        }
    except Exception as e:
        logger.error(f"Multi-file ingestion error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Multi-file ingestion failed: {e}",
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

