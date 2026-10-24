"""Recovery investigation candidate API router."""

from fastapi import APIRouter, HTTPException, Query, status

from app.database.duckdb import get_connection
from app.database.repositories.dataset import DatasetRepository
from app.schemas.recovery import RecoveryCandidatesResponse
from app.services.recovery import RecoveryService

router = APIRouter(prefix="/recovery", tags=["recovery"])


@router.get(
    "/candidates",
    response_model=RecoveryCandidatesResponse,
    summary="Get transaction-derived recovery investigation candidates based on Observed Net Flow",
)
async def get_recovery_candidates(
    dataset_id: str | None = Query(None, description="Optional dataset ID. Defaults to latest dataset."),
    min_net_flow: float = Query(1.0, ge=0.0, description="Minimum observed net flow threshold"),
    limit: int = Query(50, ge=1, le=500, description="Max candidates to return"),
    compute_risk: bool = Query(True, description="Whether to include Mule Risk Index in ranking"),
):
    """Identify and rank accounts retaining positive observed net flow within the selected dataset scope.

    Disclaimer: Observed Net Flow is strictly limited to the selected dataset and investigation window.
    It represents transaction-derived observed net flow and is NOT a verified current bank balance.
    """
    conn = get_connection()
    repo_ds = DatasetRepository(conn)

    if not dataset_id:
        latest = repo_ds.get_latest_dataset()
        if not latest:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No datasets found in database.",
            )
        dataset_id = latest["dataset_id"]

    recovery_service = RecoveryService(conn)
    return recovery_service.get_recovery_candidates(
        dataset_id=dataset_id,
        min_net_flow=min_net_flow,
        limit=limit,
        compute_risk=compute_risk,
    )
