"""Account and investigation API routers."""

from fastapi import APIRouter, HTTPException, Query, status

from app.database.duckdb import get_connection
from app.database.repositories.account import AccountRepository
from app.database.repositories.dataset import DatasetRepository
from app.schemas.account import AccountSummaryResponse, AccountTransactionsResponse
from app.schemas.investigation import InvestigationTraceResponse
from app.schemas.risk import AccountRiskProfileResponse
from app.services.investigation import InvestigationService
from app.services.risk_engine import RiskAssessmentService

account_router = APIRouter(prefix="/accounts", tags=["accounts"])
investigation_router = APIRouter(prefix="/investigations", tags=["investigations"])


@account_router.get(
    "/search",
    summary="Search accounts by prefix or fuzzy match in dataset",
)
async def search_accounts(
    query: str = Query("", description="Account ID query or prefix"),
    dataset_id: str | None = Query(None, description="Optional dataset ID. Defaults to latest dataset."),
    limit: int = Query(15, ge=1, le=50),
):
    """Search accounts by prefix or substring for autocomplete and candidate suggestion."""
    conn = get_connection()
    repo_ds = DatasetRepository(conn)
    if not dataset_id:
        latest = repo_ds.get_latest_dataset()
        if not latest:
            return {"results": [], "dataset_id": ""}
        dataset_id = latest["dataset_id"]

    repo_acc = AccountRepository(conn)
    results = repo_acc.search_accounts(query=query, dataset_id=dataset_id, limit=limit)
    return {"results": results, "dataset_id": dataset_id}


@account_router.get(
    "/{account_id}",
    response_model=AccountSummaryResponse,
    summary="Get account profile, precomputed features, and net flow summary",
)
async def get_account(
    account_id: str,
    dataset_id: str | None = Query(None, description="Optional dataset ID. Defaults to latest dataset."),
):
    """Retrieve precomputed incoming/outgoing volumes, transaction counts, and active period."""
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

    repo_acc = AccountRepository(conn)
    profile = repo_acc.get_account_profile(account_id=account_id, dataset_id=dataset_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account '{account_id}' not found in dataset '{dataset_id}'.",
        )
    return profile


@account_router.get(
    "/{account_id}/transactions",
    response_model=AccountTransactionsResponse,
    summary="Get chronologically ordered transaction timeline for an account",
)
async def get_account_transactions(
    account_id: str,
    dataset_id: str | None = Query(None, description="Optional dataset ID. Defaults to latest dataset."),
    direction: str | None = Query(None, description="Filter direction: 'IN' or 'OUT'"),
    limit: int = Query(1000, ge=1, le=50000, description="Max transactions to return"),
):
    """Reconstruct unified chronological transaction timeline with full source provenance."""
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

    repo_acc = AccountRepository(conn)
    return repo_acc.get_account_transactions(
        account_id=account_id,
        dataset_id=dataset_id,
        limit=limit,
        direction_filter=direction,
    )


@account_router.get(
    "/{account_id}/risk",
    response_model=AccountRiskProfileResponse,
    summary="Calculate explainable Mule Risk Index and candidate classifications",
)
async def get_account_risk(
    account_id: str,
    dataset_id: str | None = Query(None, description="Optional dataset ID. Defaults to latest dataset."),
):
    """Retrieve explainable 0-100 Mule Risk Index, feature evidence contract, and L1/L2/L3 classifications."""
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

    risk_service = RiskAssessmentService(conn)
    profile = risk_service.assess_account_risk(account_id=account_id, dataset_id=dataset_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account '{account_id}' not found in dataset '{dataset_id}'.",
        )
    return profile



@investigation_router.get(
    "/trace/{account_id}",
    response_model=InvestigationTraceResponse,
    summary="Execute bounded 4-hop temporal trace and transaction amount lineage",
)
async def trace_victim_funds(
    account_id: str,
    dataset_id: str | None = Query(None, description="Optional dataset ID. Defaults to latest dataset."),
    initial_tx_id: str | None = Query(None, description="Specific starting transaction ID or record_id"),
    max_hops: int = Query(4, ge=1, le=4, description="Maximum hops to traverse (strictly <= 4)"),
    time_window_hours: float | None = Query(None, description="Max hours forward from starting transaction"),
    min_amount: float | None = Query(None, description="Minimum transaction amount filter"),
):
    """Execute deterministic forensic investigation starting from victim account/transaction.

    Enforces:
    - Bounded max depth = 4 (strictly rejected/not traversed beyond 4)
    - Temporal continuity (t_out >= t_in)
    - Path-specific cycle detection
    - Conservative amount lineage and double-count prevention
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

    service = InvestigationService(conn)
    try:
        return service.run_trace(
            victim_account=account_id,
            dataset_id=dataset_id,
            initial_tx_id=initial_tx_id,
            max_hops=max_hops,
            time_window_hours=time_window_hours,
            min_amount=min_amount,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Investigation trace failed: {e}",
        )
