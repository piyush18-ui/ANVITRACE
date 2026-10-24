"""Case Management, Bilingual Summaries, and Isolated Chat API Router."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.database.duckdb import get_connection
from app.services.case_ai import CaseAIService

cases_router = APIRouter(prefix="/cases", tags=["cases"])


class CaseRegisterRequest(BaseModel):
    case_id: str = Field(..., description="FIR or Case reference number")
    title: str = Field("Financial Cybercrime Investigation", description="Investigation title")
    act: str = Field("Sec. 66D IT Act / 420 IPC", description="Statutory act")
    target_account: str = Field(..., description="Primary subject / victim / target account")
    officer_name: str = Field("", description="Investigating officer name")
    notes: str = Field("", description="Investigator notes")
    dataset_id: str | None = None
    dataset_filename: str = ""
    dataset_hash: str = ""


class CaseSummaryRequest(BaseModel):
    language: str = Field("en", description="Summary language: 'en' for English, 'hi' for Hindi")
    dataset_id: str | None = None


class CaseChatRequest(BaseModel):
    question: str = Field(..., description="Investigator question about this case")
    dataset_id: str | None = None


@cases_router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Register or sync a formal case docket with server-side isolation",
)
async def register_case(req: CaseRegisterRequest):
    """Register or sync a case docket in DuckDB to enforce server-side case boundaries."""
    conn = get_connection()
    svc = CaseAIService(conn)
    return svc.register_or_sync_case(
        case_id=req.case_id,
        title=req.title,
        act=req.act,
        target_account=req.target_account,
        officer_name=req.officer_name,
        notes=req.notes,
        dataset_id=req.dataset_id,
        dataset_filename=req.dataset_filename,
        dataset_hash=req.dataset_hash,
    )


@cases_router.get(
    "",
    summary="List all registered case dockets",
)
async def list_cases():
    """Retrieve all active case dockets from DuckDB."""
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT case_id, title, act, target_account, officer_name, notes, created_at, status, dataset_id, dataset_filename, dataset_hash
        FROM case_dockets
        ORDER BY created_at DESC
        """
    ).fetchall()
    return [
        {
            "id": r[0],
            "title": r[1],
            "act": r[2],
            "targetAccount": r[3],
            "officerName": r[4],
            "notes": r[5],
            "createdAt": str(r[6]),
            "status": r[7],
            "datasetId": r[8],
            "datasetFilename": r[9],
            "datasetHash": r[10],
        }
        for r in rows
    ]


@cases_router.get(
    "/{case_id}",
    summary="Get case docket details by ID",
)
async def get_case(case_id: str):
    """Retrieve details for a specific case with strict server-side scoping."""
    conn = get_connection()
    svc = CaseAIService(conn)
    case = svc._get_case(case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case docket '{case_id}' not found.",
        )
    return case


@cases_router.post(
    "/{case_id}/summary",
    summary="Generate grounded 16-section investigative summary in English or Hindi",
)
async def generate_case_summary(case_id: str, req: CaseSummaryRequest):
    """Generate bilingual structured case summary strictly from verified case evidence."""
    conn = get_connection()
    svc = CaseAIService(conn)
    return svc.generate_case_summary(
        case_id=case_id,
        language=req.language,
        dataset_id=req.dataset_id,
    )


@cases_router.post(
    "/{case_id}/chat",
    summary="Ask investigative questions strictly scoped to this case's evidence",
)
async def chat_with_case(case_id: str, req: CaseChatRequest):
    """Case-scoped AI chatbot answering questions exclusively using verified case records."""
    if not req.question.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty.",
        )
    conn = get_connection()
    svc = CaseAIService(conn)
    return svc.answer_case_query(
        case_id=case_id,
        question=req.question,
        dataset_id=req.dataset_id,
    )
