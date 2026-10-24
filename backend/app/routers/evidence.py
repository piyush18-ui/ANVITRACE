"""Evidence snapshot and document generation API routers.

Endpoints:
- POST /api/evidence/snapshot — Create reproducible investigation snapshot
- POST /api/documents/case-diary — Generate deterministic case diary PDF
- POST /api/documents/freeze-requisition — Generate bank freeze requisition draft PDF
"""

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

from app.config.settings import settings
from app.database.duckdb import get_connection
from app.database.repositories.dataset import DatasetRepository
from app.schemas.documents import (
    CaseDiaryRequest,
    CaseDiaryResponse,
    FreezeRequisitionRequest,
    FreezeRequisitionResponse,
)
from app.schemas.evidence import SnapshotRequest, SnapshotResponse
from app.services.documents import DocumentService
from app.services.evidence import EvidenceSnapshotService
from app.utils.logging import log_event

evidence_router = APIRouter(prefix="/evidence", tags=["evidence"])
documents_router = APIRouter(prefix="/documents", tags=["documents"])


def _resolve_dataset_id(dataset_id: str | None) -> str:
    """Resolve dataset_id, defaulting to latest if not provided."""
    conn = get_connection()
    repo = DatasetRepository(conn)
    if dataset_id:
        ds = repo.get_dataset(dataset_id)
        if not ds:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Dataset '{dataset_id}' not found.",
            )
        return dataset_id

    latest = repo.get_latest_dataset()
    if not latest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No datasets found in database.",
        )
    return latest["dataset_id"]


@evidence_router.post(
    "/snapshot",
    response_model=SnapshotResponse,
    summary="Create reproducible investigation evidence snapshot",
)
async def create_evidence_snapshot(request: SnapshotRequest):
    """Create a complete, reproducible investigation snapshot with:
    - Full provenance (dataset_hash, app_version, rule_version, parameters)
    - SHA-256 result integrity hash
    - Evidence items linked to exact source records
    - Reproducibility guarantee

    Audit event logged for investigation creation.
    """
    dataset_id = _resolve_dataset_id(request.dataset_id)
    conn = get_connection()

    log_event(
        "SNAPSHOT_REQUEST_RECEIVED",
        victim_account=request.victim_account,
        dataset_id=dataset_id,
    )

    try:
        service = EvidenceSnapshotService(conn)
        return service.create_snapshot(
            victim_account=request.victim_account,
            dataset_id=dataset_id,
            max_hops=request.max_hops,
            time_window_hours=request.time_window_hours,
            min_amount=request.min_amount,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Evidence snapshot creation failed: {e}",
        )


@evidence_router.post(
    "/verify-integrity",
    summary="Verify evidence file against SHA-256 baseline and detect structured record changes",
)
async def verify_evidence_integrity(
    dataset_id: str | None = None,
    filename: str | None = None,
):
    """Verify evidence file against baseline SHA-256 and generate structured change diffs."""
    from pathlib import Path
    from app.services.integrity_check import IntegrityVerificationService
    conn = get_connection()
    repo = DatasetRepository(conn)

    target_filename = filename
    if not target_filename:
        if dataset_id:
            ds = repo.get_dataset(dataset_id)
            if ds:
                target_filename = ds["filename"]
        else:
            latest = repo.get_latest_dataset()
            if latest:
                target_filename = latest["filename"]
                dataset_id = latest["dataset_id"]

    if not target_filename:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No dataset found to verify.",
        )

    raw_dir = settings.project_root / settings.DATA_RAW_DIR
    target_path = raw_dir / target_filename

    svc = IntegrityVerificationService(conn)
    return svc.verify_file_integrity(target_path, dataset_id=dataset_id)


@documents_router.post(
    "/case-diary",
    response_model=CaseDiaryResponse,
    summary="Generate deterministic case diary PDF from validated evidence",
)
async def generate_case_diary(request: CaseDiaryRequest):
    """Generate case diary document containing:
    - Chronological money movement
    - Layer candidates
    - Timestamps and exact evidence references
    - No free-form narrative invents factual fields

    Audit event logged for document generation.
    """
    dataset_id = _resolve_dataset_id(request.dataset_id)
    conn = get_connection()

    log_event(
        "CASE_DIARY_REQUEST_RECEIVED",
        victim_account=request.victim_account,
        dataset_id=dataset_id,
    )

    try:
        service = DocumentService(conn)
        return service.generate_case_diary(
            victim_account=request.victim_account,
            dataset_id=dataset_id,
            max_hops=request.max_hops,
            officer_name=request.officer_name,
            officer_designation=request.officer_designation,
            case_reference=request.case_reference,
            investigation_id=request.investigation_id,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Case diary generation failed: {e}",
        )


@documents_router.post(
    "/freeze-requisition",
    response_model=FreezeRequisitionResponse,
    summary="Generate bank freeze requisition draft from verified evidence",
)
async def generate_freeze_requisition(request: FreezeRequisitionRequest):
    """Generate bank freeze requisition containing ONLY:
    - Verified account and IFSC fields
    - Verified transaction fields and evidence references
    - No hard-coded stale year or notice identifier
    - Unknown values remain UNAVAILABLE
    - Officer review/approval required
    - NO automatic external bank dispatch

    Audit event logged for document generation.
    """
    dataset_id = _resolve_dataset_id(request.dataset_id)
    conn = get_connection()

    log_event(
        "FREEZE_REQUISITION_REQUEST_RECEIVED",
        target_account=request.target_account_id,
        dataset_id=dataset_id,
    )

    try:
        service = DocumentService(conn)
        return service.generate_freeze_requisition(
            target_account_id=request.target_account_id,
            dataset_id=dataset_id,
            requesting_officer=request.requesting_officer,
            requesting_designation=request.requesting_designation,
            requesting_authority=request.requesting_authority,
            case_reference=request.case_reference,
            bank_name=request.bank_name,
            branch_name=request.branch_name,
            investigation_id=request.investigation_id,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Freeze requisition generation failed: {e}",
        )


@documents_router.get(
    "/download/{document_id}",
    summary="Download or view generated statutory document PDF",
)
async def download_document(document_id: str):
    """Serve generated PDF document file for download or direct browser viewing."""
    exports_dir = settings.project_root / settings.DATA_EXPORTS_DIR
    matches = list(exports_dir.glob(f"{document_id}*.pdf"))
    if not matches:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found in exports archive.",
        )
    target_file = matches[0]
    return FileResponse(
        target_file,
        media_type="application/pdf",
        filename=target_file.name,
    )

