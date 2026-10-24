"""Evidence snapshot and document generation API routers.

Endpoints:
- POST /api/evidence/snapshot — Create reproducible investigation snapshot
- POST /api/documents/case-diary — Generate deterministic case diary PDF
- POST /api/documents/freeze-requisition — Generate bank freeze requisition draft PDF
"""

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse

from app.config.settings import settings
from app.database.duckdb import get_connection
from app.database.repositories.dataset import DatasetRepository
from app.evidence.audit import AuditService
from app.evidence.integrity import EvidenceIntegrityService
from app.schemas.documents import (
    CaseDiaryRequest,
    CaseDiaryResponse,
    FreezeRequisitionRequest,
    FreezeRequisitionResponse,
)
from app.schemas.evidence import (
    AuditEventsResponse,
    AuditVerifyResponse,
    EvidenceDetailResponse,
    EvidenceUploadVerifyResponse,
    EvidenceVerifyResponse,
    SnapshotRequest,
    SnapshotResponse,
    VerificationEventItem,
)
from app.services.documents import DocumentService
from app.services.evidence import EvidenceSnapshotService
from app.utils.logging import log_event

evidence_router = APIRouter(prefix="/evidence", tags=["evidence"])
documents_router = APIRouter(prefix="/documents", tags=["documents"])
audit_router = APIRouter(prefix="/audit", tags=["audit"])


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


@evidence_router.get(
    "",
    response_model=list[EvidenceDetailResponse],
    summary="List registered physical evidence files",
)
async def list_evidence_files(
    dataset_id: str | None = Query(None, description="Filter by dataset ID"),
    limit: int = Query(50, ge=1, le=100, description="Max evidence items"),
):
    """Retrieve list of registered evidence files and their current verification status."""
    conn = get_connection()
    svc = EvidenceIntegrityService(conn)
    return svc.list_evidence(dataset_id=dataset_id, limit=limit)


@evidence_router.get(
    "/{evidence_id}",
    response_model=EvidenceDetailResponse,
    summary="Get recorded evidence file details and status",
)
async def get_evidence(evidence_id: str):
    """Fetch physical evidence record and its latest verification status."""
    conn = get_connection()
    svc = EvidenceIntegrityService(conn)
    details = svc.get_evidence_details(evidence_id)
    if not details:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evidence file '{evidence_id}' not found in registry.",
        )
    return details


@evidence_router.post(
    "/{evidence_id}/verify",
    response_model=EvidenceVerifyResponse,
    summary="Re-verify stored evidence file against recorded SHA-256 digest",
)
async def verify_stored_evidence(evidence_id: str):
    """Recompute hash of stored evidence file and compare with recorded baseline."""
    conn = get_connection()
    svc = EvidenceIntegrityService(conn)
    result = svc.verify_evidence(evidence_id)
    if result["status"] == "MISSING" and "not exist in registry" in result.get("note", ""):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evidence '{evidence_id}' not found in registry.",
        )
    return result


@evidence_router.post(
    "/{evidence_id}/verify-upload",
    response_model=EvidenceUploadVerifyResponse,
    summary="Verify candidate file via streaming upload against recorded digest (Judge Demo)",
)
async def verify_candidate_upload(
    evidence_id: str,
    file: UploadFile = File(..., description="Candidate evidence file to verify"),
):
    """Stream and verify candidate file in 8 MB chunks without storing or ingesting it."""
    conn = get_connection()
    svc = EvidenceIntegrityService(conn)
    result = svc.verify_upload(evidence_id, file.file)
    if result["status"] == "MISSING":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evidence '{evidence_id}' not found in registry.",
        )
    return result


@evidence_router.get(
    "/{evidence_id}/history",
    response_model=list[VerificationEventItem],
    summary="Get verification history for an evidence file",
)
async def get_evidence_history(evidence_id: str):
    """Retrieve full chronological log of re-verification runs for an evidence file."""
    conn = get_connection()
    svc = EvidenceIntegrityService(conn)
    details = svc.get_evidence_details(evidence_id)
    if not details:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evidence '{evidence_id}' not found in registry.",
        )
    return svc.get_verification_history(evidence_id)


# --- Cryptographic Tamper-Evident Audit Chain Endpoints ---

@audit_router.get(
    "/verify",
    response_model=AuditVerifyResponse,
    summary="Cryptographically verify HMAC-SHA256 audit chain integrity",
)
async def verify_audit():
    """Verify all sequential HMAC-SHA256 audit entries against the cryptographic secret key."""
    conn = get_connection()
    svc = AuditService(conn)
    return svc.verify_audit_chain()


@audit_router.get(
    "/events",
    response_model=AuditEventsResponse,
    summary="Query paginated tamper-evident audit log events",
)
async def get_audit_events(
    entity_id: str | None = Query(None, description="Filter by entity ID"),
    action: str | None = Query(None, description="Filter by event action"),
    limit: int = Query(50, ge=1, le=200, description="Page limit"),
    offset: int = Query(0, ge=0, description="Page offset"),
):
    """Retrieve paginated audit entries with HMAC hashes and previous hash linkage."""
    conn = get_connection()
    svc = AuditService(conn)
    return svc.get_events(entity_id=entity_id, action=action, limit=limit, offset=offset)


@evidence_router.get("/audit/verify", response_model=AuditVerifyResponse, include_in_schema=False)
async def verify_audit_alias():
    return await verify_audit()


@evidence_router.get("/audit/events", response_model=AuditEventsResponse, include_in_schema=False)
async def get_audit_events_alias(
    entity_id: str | None = None,
    action: str | None = None,
    limit: int = 50,
    offset: int = 0,
):
    return await get_audit_events(entity_id=entity_id, action=action, limit=limit, offset=offset)


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

