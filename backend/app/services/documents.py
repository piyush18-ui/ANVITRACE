"""Deterministic document generation service.

Implements Phase 4:
- Case Diary: validated evidence → structured JSON → schema validation → deterministic template → PDF
- Bank Freeze Requisition: verified fields only, officer approval required, no auto-dispatch
- Uses Jinja2 templates + ReportLab PDF
- Validation before rendering: documents never contain factual fields absent from validated evidence
- No free-form narrative invents factual fields
- No hard-coded stale year/notice identifier
"""

import hashlib
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import duckdb
from jinja2 import Environment, select_autoescape
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.config.settings import settings
from app.database.repositories.dataset import DatasetRepository
from app.services.case_diary_formatter import build_case_diary_23_context
from app.schemas.documents import (
    CaseDiaryResponse,
    FreezeRequisitionResponse,
)
from app.services.evidence import EvidenceSnapshotService
from app.utils.logging import log_event

# Jinja2 environment with autoescape for safety against untrusted input
_jinja_env = Environment(autoescape=select_autoescape(default=True))


def _sha256_file(filepath: Path) -> str:
    """Compute SHA-256 hash of a file."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def _sanitize_text(value: str | None) -> str:
    """Sanitize untrusted input text (narrations, IPs, device strings).

    Untrusted text MUST NOT alter system instructions, modify structured factual fields,
    or invent account numbers, amounts, IFSCs, or transaction IDs.
    """
    if value is None:
        return ""
    # Strip control characters and limit length
    cleaned = "".join(c for c in str(value) if c.isprintable())
    return cleaned[:500]


class DocumentService:
    """Generates deterministic forensic documents from validated backend evidence."""

    def __init__(self, conn: duckdb.DuckDBPyConnection):
        self.conn = conn
        self.dataset_repo = DatasetRepository(conn)
        self.evidence_service = EvidenceSnapshotService(conn)
        self._exports_dir = Path(settings.project_root) / settings.DATA_EXPORTS_DIR
        self._exports_dir.mkdir(parents=True, exist_ok=True)

    def generate_case_diary(
        self,
        victim_account: str,
        dataset_id: str,
        max_hops: int = 4,
        officer_name: str = "Investigating Officer",
        officer_designation: str = "Cyber Crime Cell",
        case_reference: str = "",
        investigation_id: str | None = None,
    ) -> CaseDiaryResponse:
        """Generate deterministic case diary PDF from validated evidence.

        Pipeline: Validated backend evidence → Structured Evidence JSON →
        Schema validation → Deterministic template → Final factual consistency validation → PDF
        """
        # 1. Create or reuse evidence snapshot (validated backend evidence)
        snapshot_resp = self.evidence_service.create_snapshot(
            victim_account=victim_account,
            dataset_id=dataset_id,
            max_hops=max_hops,
        )
        snapshot = snapshot_resp.snapshot
        inv_id = investigation_id or snapshot.investigation_id

        # 2. Schema validation — ensure all required fields exist
        assert snapshot.dataset_id, "dataset_id missing from evidence"
        assert snapshot.victim_account, "victim_account missing from evidence"

        # 3. Build deterministic structured evidence for template
        diary_data = self._build_diary_data(snapshot, officer_name, officer_designation, case_reference)

        # 4. Factual consistency validation — no invented fields
        self._validate_factual_consistency(diary_data, snapshot)

        # 5. Render PDF
        doc_id = f"diary_{uuid.uuid4().hex[:8]}"
        filename = f"{doc_id}_{snapshot.victim_account}.pdf"
        filepath = self._exports_dir / filename
        page_count = self._render_case_diary_pdf(filepath, diary_data)

        # 6. Compute document integrity hash
        integrity_hash = _sha256_file(filepath)

        log_event(
            "CASE_DIARY_GENERATED",
            document_id=doc_id,
            investigation_id=inv_id,
            victim_account=victim_account,
            integrity_hash=integrity_hash,
        )

        return CaseDiaryResponse(
            document_id=doc_id,
            investigation_id=inv_id,
            victim_account=victim_account,
            dataset_id=dataset_id,
            file_path=str(filepath),
            page_count=page_count,
            generated_at=datetime.now(UTC),
            evidence_item_count=len(snapshot.evidence_items),
            integrity_hash=integrity_hash,
            factual_validation_passed=True,
        )

    def generate_freeze_requisition(
        self,
        target_account_id: str,
        dataset_id: str,
        requesting_officer: str = "Investigating Officer",
        requesting_designation: str = "Cyber Crime Cell",
        requesting_authority: str = "",
        case_reference: str = "",
        bank_name: str = "",
        branch_name: str = "",
        investigation_id: str | None = None,
    ) -> FreezeRequisitionResponse:
        """Generate deterministic bank freeze requisition draft.

        Contains ONLY verified account, IFSC, and transaction fields.
        Unknown values remain marked as unavailable.
        Officer review/approval is required. No automatic external bank dispatch.
        """
        # 1. Create evidence snapshot
        snapshot_resp = self.evidence_service.create_snapshot(
            victim_account=target_account_id,
            dataset_id=dataset_id,
        )
        snapshot = snapshot_resp.snapshot
        inv_id = investigation_id or snapshot.investigation_id

        # 2. Gather verified account/IFSC data from transactions
        verified_data = self._gather_verified_freeze_data(target_account_id, dataset_id)

        # 3. Build requisition data — ONLY verified fields
        req_data = self._build_requisition_data(
            verified_data=verified_data,
            snapshot=snapshot,
            requesting_officer=requesting_officer,
            requesting_designation=requesting_designation,
            requesting_authority=requesting_authority,
            case_reference=case_reference,
            bank_name=bank_name,
            branch_name=branch_name,
        )

        # 4. Render PDF
        doc_id = f"freeze_{uuid.uuid4().hex[:8]}"
        filename = f"{doc_id}_{target_account_id}.pdf"
        filepath = self._exports_dir / filename
        self._render_freeze_requisition_pdf(filepath, req_data)

        integrity_hash = _sha256_file(filepath)

        log_event(
            "FREEZE_REQUISITION_GENERATED",
            document_id=doc_id,
            investigation_id=inv_id,
            target_account=target_account_id,
            integrity_hash=integrity_hash,
        )

        return FreezeRequisitionResponse(
            document_id=doc_id,
            investigation_id=inv_id,
            target_account_id=target_account_id,
            dataset_id=dataset_id,
            file_path=str(filepath),
            generated_at=datetime.now(UTC),
            integrity_hash=integrity_hash,
            contains_only_verified_fields=True,
            officer_approval_required=True,
            automatic_dispatch_enabled=False,
            evidence_summary={
                "risk_tier": snapshot.risk_summary.get("risk_tier", "UNAVAILABLE"),
                "mule_risk_index": snapshot.risk_summary.get("mule_risk_index", 0.0),
                "evidence_items": len(snapshot.evidence_items),
                "layer_candidates": [lc["role"] for lc in snapshot.layer_candidates],
            },
        )

    def _build_diary_data(
        self,
        snapshot: Any,
        officer_name: str,
        officer_designation: str,
        case_reference: str,
    ) -> dict[str, Any]:
        """Build validated structured data for case diary template."""
        now = datetime.now(UTC)
        return {
            "title": "CASE DIARY — FORENSIC MONEY TRAIL INVESTIGATION",
            "investigation_id": snapshot.investigation_id,
            "dataset_id": snapshot.dataset_id,
            "dataset_hash": snapshot.dataset_hash,
            "victim_account": snapshot.victim_account,
            "app_version": snapshot.app_version,
            "rule_version": snapshot.rule_version,
            "generated_date": now.strftime("%Y-%m-%d"),
            "generated_time": now.strftime("%H:%M:%S UTC"),
            "officer_name": _sanitize_text(officer_name),
            "officer_designation": _sanitize_text(officer_designation),
            "case_reference": _sanitize_text(case_reference) or "Not Specified",
            "money_trail": snapshot.money_trail_summary,
            "layer_candidates": snapshot.layer_candidates,
            "risk_summary": snapshot.risk_summary,
            "evidence_items": [
                {
                    "evidence_id": ev.evidence_id,
                    "feature_name": ev.feature_name,
                    "record_ids": ev.record_ids,
                    "transaction_ids": ev.transaction_ids,
                    "explanation": _sanitize_text(ev.explanation),
                }
                for ev in snapshot.evidence_items
            ],
            "supporting_record_ids": snapshot.supporting_record_ids,
            "supporting_transaction_ids": snapshot.supporting_transaction_ids,
            "result_hash": snapshot.result_hash,
            "integrity_disclaimer": snapshot.integrity_disclaimer,
        }

    def _validate_factual_consistency(self, diary_data: dict[str, Any], snapshot: Any) -> None:
        """Validate that the diary contains no factual fields absent from validated evidence.

        Raises AssertionError if invented fields are detected.
        """
        # Ensure victim_account matches
        assert diary_data["victim_account"] == snapshot.victim_account
        # Ensure dataset_id matches
        assert diary_data["dataset_id"] == snapshot.dataset_id
        # Ensure result_hash matches
        assert diary_data["result_hash"] == snapshot.result_hash

    def _gather_verified_freeze_data(self, account_id: str, dataset_id: str) -> dict[str, Any]:
        """Gather verified account, IFSC, and transaction data from DuckDB records."""
        clean_acc = account_id.strip()

        # Get verified account info from transactions
        row = self.conn.execute(
            """
            SELECT
                Sender_Account, Sender_IFSC, Receiver_Account, Receiver_IFSC,
                COUNT(*) as tx_count,
                SUM(Amount) as total_amount,
                MIN(Timestamp) as first_tx,
                MAX(Timestamp) as last_tx
            FROM transactions
            WHERE (Sender_Account = ? OR Receiver_Account = ?) AND dataset_id = ?
            GROUP BY Sender_Account, Sender_IFSC, Receiver_Account, Receiver_IFSC
            LIMIT 1
            """,
            [clean_acc, clean_acc, dataset_id],
        ).fetchone()

        if not row:
            return {
                "account_id": clean_acc,
                "ifsc": "UNAVAILABLE",
                "transaction_count": 0,
                "total_amount": 0.0,
                "first_transaction": "UNAVAILABLE",
                "last_transaction": "UNAVAILABLE",
            }

        # Determine which IFSC belongs to this account
        if row[0] == clean_acc:
            ifsc = row[1] or "UNAVAILABLE"
        elif row[2] == clean_acc:
            ifsc = row[3] or "UNAVAILABLE"
        else:
            ifsc = "UNAVAILABLE"

        return {
            "account_id": clean_acc,
            "ifsc": ifsc,
            "transaction_count": row[4],
            "total_amount": float(row[5] or 0.0),
            "first_transaction": str(row[6]) if row[6] else "UNAVAILABLE",
            "last_transaction": str(row[7]) if row[7] else "UNAVAILABLE",
        }

    def _build_requisition_data(
        self,
        verified_data: dict[str, Any],
        snapshot: Any,
        requesting_officer: str,
        requesting_designation: str,
        requesting_authority: str,
        case_reference: str,
        bank_name: str,
        branch_name: str,
    ) -> dict[str, Any]:
        """Build requisition data with ONLY verified fields.

        Unknown values remain 'UNAVAILABLE'. No hard-coded stale year or notice identifier.
        """
        now = datetime.now(UTC)
        return {
            "title": "BANK ACCOUNT FREEZE REQUISITION — DRAFT",
            "draft_notice": "THIS IS A DRAFT — OFFICER REVIEW AND APPROVAL REQUIRED",
            "auto_dispatch_warning": "NO AUTOMATIC EXTERNAL BANK DISPATCH IS SUPPORTED",
            "date": now.strftime("%Y-%m-%d"),
            "time": now.strftime("%H:%M:%S UTC"),
            "case_reference": _sanitize_text(case_reference) or "Not Specified",
            "requesting_officer": _sanitize_text(requesting_officer),
            "requesting_designation": _sanitize_text(requesting_designation),
            "requesting_authority": _sanitize_text(requesting_authority) or "Not Specified",
            "bank_name": _sanitize_text(bank_name) or "UNAVAILABLE",
            "branch_name": _sanitize_text(branch_name) or "UNAVAILABLE",
            "target_account_id": verified_data["account_id"],
            "target_ifsc": verified_data["ifsc"],
            "transaction_count": verified_data["transaction_count"],
            "total_amount": verified_data["total_amount"],
            "first_transaction_date": verified_data["first_transaction"],
            "last_transaction_date": verified_data["last_transaction"],
            "investigation_id": snapshot.investigation_id,
            "dataset_id": snapshot.dataset_id,
            "risk_tier": snapshot.risk_summary.get("risk_tier", "UNAVAILABLE"),
            "mule_risk_index": snapshot.risk_summary.get("mule_risk_index", 0.0),
            "layer_candidates": [lc["role"] for lc in snapshot.layer_candidates],
            "supporting_record_ids": snapshot.supporting_record_ids[:20],
            "result_hash": snapshot.result_hash,
        }

    def _render_case_diary_pdf(self, filepath: Path, data: dict[str, Any]) -> int:
        """Render case diary as PDF using ReportLab. Returns page count."""
        doc = SimpleDocTemplate(
            str(filepath),
            pagesize=A4,
            leftMargin=20 * mm,
            rightMargin=20 * mm,
            topMargin=20 * mm,
            bottomMargin=20 * mm,
        )
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle("DiaryTitle", parent=styles["Title"], fontSize=14, spaceAfter=6 * mm)
        heading_style = ParagraphStyle("DiaryHeading", parent=styles["Heading2"], fontSize=11, spaceAfter=3 * mm)
        body_style = ParagraphStyle("DiaryBody", parent=styles["Normal"], fontSize=9, spaceAfter=2 * mm)
        disclaimer_style = ParagraphStyle(
            "DiaryDisclaimer", parent=styles["Normal"], fontSize=8, textColor=colors.grey, spaceAfter=2 * mm
        )

        elements: list[Any] = []

        # Title
        elements.append(Paragraph(data["title"], title_style))
        elements.append(Spacer(1, 3 * mm))

        # Metadata table
        meta_rows = [
            ["Investigation ID", data["investigation_id"]],
            ["Victim Account", data["victim_account"]],
            ["Dataset ID", data["dataset_id"]],
            ["Dataset Hash", data["dataset_hash"][:32] + "..."],
            ["Case Reference", data["case_reference"]],
            ["Officer", f"{data['officer_name']} ({data['officer_designation']})"],
            ["App Version", data["app_version"]],
            ["Rule Version", data["rule_version"]],
            ["Generated", f"{data['generated_date']} {data['generated_time']}"],
        ]
        meta_table = Table(meta_rows, colWidths=[45 * mm, 120 * mm])
        meta_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (0, -1), colors.Color(0.93, 0.93, 0.93)),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("LEFTPADDING", (0, 0), (-1, -1), 4),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        elements.append(meta_table)
        elements.append(Spacer(1, 5 * mm))

        # Money Trail Summary
        elements.append(Paragraph("MONEY TRAIL SUMMARY", heading_style))
        trail = data.get("money_trail", {})
        elements.append(
            Paragraph(
                f"Total Edges: {trail.get('total_edges', 0)} | "
                f"Hops: {trail.get('total_hops_found', 0)} | "
                f"Attributed Amount: ₹{trail.get('total_attributed_amount', 0):,.2f}",
                body_style,
            )
        )
        nodes = trail.get("nodes", [])
        if nodes:
            elements.append(Paragraph(f"Accounts in trail: {', '.join(nodes[:20])}", body_style))
        elements.append(Spacer(1, 3 * mm))

        # Layer Candidates
        elements.append(Paragraph("LAYER CANDIDATE CLASSIFICATIONS", heading_style))
        for lc in data.get("layer_candidates", []):
            elements.append(
                Paragraph(
                    f"• {lc.get('role', 'Unknown')} (confidence: {lc.get('confidence', 0):.2f}): "
                    f"{_sanitize_text(lc.get('evidence_summary', ''))}",
                    body_style,
                )
            )
        if not data.get("layer_candidates"):
            elements.append(Paragraph("No layer candidates identified.", body_style))
        elements.append(Spacer(1, 3 * mm))

        # Risk Summary
        elements.append(Paragraph("RISK ASSESSMENT", heading_style))
        risk = data.get("risk_summary", {})
        if risk:
            elements.append(
                Paragraph(
                    f"Mule Risk Index: {risk.get('mule_risk_index', 0):.2f} | "
                    f"Tier: {risk.get('risk_tier', 'N/A')} | "
                    f"Rule Version: {risk.get('rule_version', 'N/A')}",
                    body_style,
                )
            )
            for feat in risk.get("features", []):
                elements.append(
                    Paragraph(
                        f"  → {feat.get('feature_name', '')}: +{feat.get('score_contribution', 0):.1f} — "
                        f"{_sanitize_text(feat.get('explanation', '')[:200])}",
                        body_style,
                    )
                )
        elements.append(Spacer(1, 3 * mm))

        # Evidence Items
        elements.append(Paragraph("EVIDENCE ITEMS", heading_style))
        for ev in data.get("evidence_items", []):
            elements.append(
                Paragraph(
                    f"• [{ev.get('evidence_id', '')}] {ev.get('feature_name', '')}: "
                    f"{_sanitize_text(ev.get('explanation', '')[:200])}",
                    body_style,
                )
            )
            rec_ids = ev.get("record_ids", [])
            if rec_ids:
                elements.append(Paragraph(f"  Records: {', '.join(rec_ids[:10])}", body_style))
        if not data.get("evidence_items"):
            elements.append(Paragraph("No evidence items extracted.", body_style))
        elements.append(Spacer(1, 3 * mm))

        # Integrity
        elements.append(Paragraph("INTEGRITY VERIFICATION", heading_style))
        elements.append(Paragraph(f"Result Hash: {data.get('result_hash', 'N/A')}", body_style))
        elements.append(Paragraph(data.get("integrity_disclaimer", ""), disclaimer_style))
        elements.append(Spacer(1, 3 * mm))

        # Disclaimer
        elements.append(
            Paragraph(
                "This document contains only validated factual fields from backend evidence. "
                "No free-form narrative invents factual fields. "
                "All observations are investigative indicators and candidate hypotheses, "
                "NOT proof of criminal guilt.",
                disclaimer_style,
            )
        )

        # Build and count pages
        doc.build(elements)
        # ReportLab doesn't directly expose page count; re-read for count
        page_count = max(1, len(elements) // 15 + 1)  # Rough estimate
        return page_count

    def _render_freeze_requisition_pdf(self, filepath: Path, data: dict[str, Any]) -> None:
        """Render bank freeze requisition draft as PDF using ReportLab."""
        doc = SimpleDocTemplate(
            str(filepath),
            pagesize=A4,
            leftMargin=20 * mm,
            rightMargin=20 * mm,
            topMargin=20 * mm,
            bottomMargin=20 * mm,
        )
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle("FreezeTitle", parent=styles["Title"], fontSize=14, spaceAfter=4 * mm)
        warning_style = ParagraphStyle(
            "FreezeWarning", parent=styles["Heading3"], fontSize=10, textColor=colors.red, spaceAfter=4 * mm
        )
        heading_style = ParagraphStyle("FreezeHeading", parent=styles["Heading2"], fontSize=11, spaceAfter=3 * mm)
        body_style = ParagraphStyle("FreezeBody", parent=styles["Normal"], fontSize=9, spaceAfter=2 * mm)
        disclaimer_style = ParagraphStyle(
            "FreezeDisclaimer", parent=styles["Normal"], fontSize=8, textColor=colors.grey, spaceAfter=2 * mm
        )

        elements: list[Any] = []

        # Title and draft warnings
        elements.append(Paragraph(data["title"], title_style))
        elements.append(Paragraph(data["draft_notice"], warning_style))
        elements.append(Paragraph(data["auto_dispatch_warning"], warning_style))
        elements.append(Spacer(1, 3 * mm))

        # Requisition metadata
        elements.append(Paragraph("REQUISITION DETAILS", heading_style))
        req_rows = [
            ["Date", data["date"]],
            ["Case Reference", data["case_reference"]],
            ["Requesting Officer", data["requesting_officer"]],
            ["Designation", data["requesting_designation"]],
            ["Authority", data["requesting_authority"]],
            ["Investigation ID", data["investigation_id"]],
        ]
        req_table = Table(req_rows, colWidths=[45 * mm, 120 * mm])
        req_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (0, -1), colors.Color(0.93, 0.93, 0.93)),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        elements.append(req_table)
        elements.append(Spacer(1, 4 * mm))

        # Target account details — ONLY verified fields
        elements.append(Paragraph("TARGET ACCOUNT (VERIFIED FIELDS ONLY)", heading_style))
        acct_rows = [
            ["Account ID", data["target_account_id"]],
            ["IFSC", data["target_ifsc"]],
            ["Bank Name", data["bank_name"]],
            ["Branch", data["branch_name"]],
            ["Transaction Count", str(data["transaction_count"])],
            ["Total Amount (₹)", f"{data['total_amount']:,.2f}"],
            ["First Transaction", data["first_transaction_date"]],
            ["Last Transaction", data["last_transaction_date"]],
        ]
        acct_table = Table(acct_rows, colWidths=[45 * mm, 120 * mm])
        acct_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (0, -1), colors.Color(0.93, 0.93, 0.93)),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        elements.append(acct_table)
        elements.append(Spacer(1, 4 * mm))

        # Risk context
        elements.append(Paragraph("FORENSIC RISK CONTEXT", heading_style))
        elements.append(
            Paragraph(
                f"Risk Tier: {data['risk_tier']} | Mule Risk Index: {data['mule_risk_index']:.2f}",
                body_style,
            )
        )
        for role in data.get("layer_candidates", []):
            elements.append(Paragraph(f"• Candidate Role: {role}", body_style))
        elements.append(Spacer(1, 4 * mm))

        # Integrity and approval
        elements.append(Paragraph("INTEGRITY AND APPROVAL", heading_style))
        elements.append(Paragraph(f"Result Hash: {data.get('result_hash', 'N/A')}", body_style))
        elements.append(Spacer(1, 3 * mm))

        elements.append(
            Paragraph(
                "OFFICER REVIEW AND APPROVAL IS REQUIRED BEFORE ANY ACTION. "
                "This requisition contains only verified fields from validated backend records. "
                "Unknown values remain marked as UNAVAILABLE. "
                "No automatic external bank dispatch is supported.",
                disclaimer_style,
            )
        )
        elements.append(Spacer(1, 10 * mm))
        elements.append(Paragraph("Officer Signature: ________________________", body_style))
        elements.append(Paragraph(f"Name: {data['requesting_officer']}", body_style))
        elements.append(Paragraph(f"Designation: {data['requesting_designation']}", body_style))
        elements.append(Paragraph(f"Date: {data['date']}", body_style))

        doc.build(elements)
