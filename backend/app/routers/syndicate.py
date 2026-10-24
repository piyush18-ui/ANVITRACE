"""Cross-victim shared infrastructure syndicate analysis API router."""

from fastapi import APIRouter, HTTPException, status

from app.database.duckdb import get_connection
from app.database.repositories.dataset import DatasetRepository
from app.schemas.syndicate import (
    CrossVictimAnalysisRequest,
    CrossVictimAnalysisResponse,
)
from app.services.cross_victim import CrossVictimService

router = APIRouter(prefix="/syndicates", tags=["syndicates"])


@router.post(
    "/cross-victim",
    response_model=CrossVictimAnalysisResponse,
    summary="Perform cross-victim shared infrastructure correlation analysis",
)
async def analyze_cross_victim_infrastructure(
    request: CrossVictimAnalysisRequest,
):
    """Analyze multi-victim money trails to discover shared accounts, devices, and IP infrastructure.

    Candidate Linkage Terminology: Identifies candidate indicators for hypothesis testing.
    Does not constitute conclusive proof of a coordinated criminal syndicate.
    """
    if len(request.victim_accounts) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cross-victim analysis requires at least 2 victim accounts.",
        )

    conn = get_connection()
    repo_ds = DatasetRepository(conn)

    dataset_id = request.dataset_id
    if not dataset_id:
        latest = repo_ds.get_latest_dataset()
        if not latest:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No datasets found in database.",
            )
        dataset_id = latest["dataset_id"]
        request.dataset_id = dataset_id

    service = CrossVictimService(conn)
    return service.analyze_cross_victim_infrastructure(request)
