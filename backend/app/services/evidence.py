"""Evidence Snapshot Service — reproducible investigation provenance.

Implements:
- Full investigation snapshot with deterministic result hashing
- Evidence item extraction from all Phase 3 detectors
- SHA-256 integrity verification (integrity mechanism only)
- Snapshot reproducibility guarantee
"""

import hashlib
import json
import uuid
from datetime import UTC, datetime
from typing import Any

import duckdb

from app.config.risk_rules import DEFAULT_RISK_CONFIG
from app.database.repositories.dataset import DatasetRepository
from app.evidence.audit import AuditService, canonical
from app.schemas.evidence import EvidenceItem, InvestigationSnapshot, SnapshotResponse
from app.services.investigation import InvestigationService
from app.services.risk_engine import RiskAssessmentService
from app.utils.logging import log_event

APP_VERSION = "1.0.0"


def _compute_result_hash(data: dict[str, Any]) -> str:
    """Compute SHA-256 hash of canonical investigation result for integrity verification.

    NOTE: A matching SHA-256 hash is an integrity mechanism.
    It does NOT constitute proof of source authenticity or legal custody.
    """
    canonical_str = canonical(data)
    return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()


class EvidenceSnapshotService:
    """Creates reproducible investigation snapshots with full provenance metadata."""

    def __init__(self, conn: duckdb.DuckDBPyConnection):
        self.conn = conn
        self.dataset_repo = DatasetRepository(conn)
        self.investigation_service = InvestigationService(conn)
        self.risk_service = RiskAssessmentService(conn)
        self.audit_service = AuditService(conn)

    def create_snapshot(
        self,
        victim_account: str,
        dataset_id: str,
        max_hops: int = 4,
        time_window_hours: float | None = None,
        min_amount: float | None = None,
    ) -> SnapshotResponse:
        """Create a complete investigation evidence snapshot with reproducibility guarantees."""
        investigation_id = f"inv_{uuid.uuid4().hex[:12]}"
        clean_acc = victim_account.strip()

        # 1. Retrieve dataset metadata for provenance
        ds_meta = self.dataset_repo.get_dataset(dataset_id)
        dataset_hash = ds_meta["dataset_hash"] if ds_meta else "unknown"
        norm_ver = ds_meta.get("normalization_version", "1.0.0") if ds_meta else "1.0.0"
        src_meta = {
            "filename": ds_meta.get("filename", "unknown") if ds_meta else "unknown",
            "total_rows": ds_meta.get("total_rows", 0) if ds_meta else 0,
            "valid_rows": ds_meta.get("valid_rows", 0) if ds_meta else 0,
            "uploaded_at": str(ds_meta.get("uploaded_at")) if ds_meta and ds_meta.get("uploaded_at") else None,
        }
        threshold_config = DEFAULT_RISK_CONFIG.get_thresholds_dict()

        rule_version = DEFAULT_RISK_CONFIG.rule_version

        # 2. Run the investigation trace
        trace_result = self.investigation_service.run_trace(
            victim_account=clean_acc,
            dataset_id=dataset_id,
            max_hops=max_hops,
            time_window_hours=time_window_hours,
            min_amount=min_amount,
        )

        # 3. Compute risk profile
        risk_profile = self.risk_service.assess_account_risk(clean_acc, dataset_id)

        # 4. Collect all supporting IDs from the money trail
        supporting_record_ids: list[str] = []
        supporting_tx_ids: list[str] = []
        for edge in trace_result.money_trail:
            supporting_record_ids.append(edge.record_id)
            supporting_tx_ids.append(edge.Transaction_ID)

        # 5. Extract evidence items from risk features
        evidence_items: list[EvidenceItem] = []
        if risk_profile:
            for feat in risk_profile.features:
                if feat.score_contribution > 0:
                    eid = f"ev_{uuid.uuid4().hex[:8]}"
                    evidence_items.append(
                        EvidenceItem(
                            evidence_id=eid,
                            feature_name=feat.feature_name,
                            dataset_id=dataset_id,
                            record_ids=feat.supporting_record_ids,
                            transaction_ids=feat.supporting_transaction_ids,
                            investigation_id=investigation_id,
                            rule_version=rule_version,
                            measured_value=feat.measured_value,
                            explanation=feat.explanation,
                        )
                    )

        # 6. Build layer candidates summary
        layer_candidates: list[dict[str, Any]] = []
        if risk_profile:
            for lc in risk_profile.layer_classifications:
                layer_candidates.append(
                    {
                        "role": lc.role,
                        "confidence": lc.confidence,
                        "evidence_summary": lc.evidence_summary,
                        "supporting_record_ids": lc.supporting_record_ids,
                    }
                )

        # 7. Build risk summary
        risk_summary: dict[str, Any] = {}
        if risk_profile:
            risk_summary = {
                "mule_risk_index": risk_profile.mule_risk_index,
                "risk_tier": risk_profile.risk_tier,
                "rule_version": risk_profile.rule_version,
                "feature_count": len(risk_profile.features),
                "features": [
                    {
                        "feature_name": f.feature_name,
                        "score_contribution": f.score_contribution,
                        "explanation": f.explanation,
                    }
                    for f in risk_profile.features
                ],
            }

        # 8. Build money trail summary
        money_trail_summary: dict[str, Any] = {
            "total_edges": len(trace_result.money_trail),
            "total_hops_found": trace_result.graph.total_hops_found if trace_result.graph else 0,
            "total_attributed_amount": trace_result.graph.total_attributed_amount if trace_result.graph else 0.0,
            "nodes": trace_result.graph.nodes if trace_result.graph else [],
            "execution_time_ms": trace_result.execution_time_ms,
        }

        # 9. Build query parameters
        query_parameters = {
            "victim_account": clean_acc,
            "dataset_id": dataset_id,
            "max_hops": max_hops,
            "time_window_hours": time_window_hours,
            "min_amount": min_amount,
        }

        # 10. Compute result hash for integrity verification
        # Only include deterministic factual data — exclude timing metrics
        hashable_trail = {
            "total_edges": money_trail_summary["total_edges"],
            "total_hops_found": money_trail_summary["total_hops_found"],
            "total_attributed_amount": money_trail_summary["total_attributed_amount"],
            "nodes": money_trail_summary["nodes"],
        }
        hashable_data = {
            "dataset_id": dataset_id,
            "dataset_hash": dataset_hash,
            "victim_account": clean_acc,
            "max_hops": max_hops,
            "time_window_hours": time_window_hours,
            "min_amount": min_amount,
            "money_trail_summary": hashable_trail,
            "layer_candidates": layer_candidates,
            "risk_summary": risk_summary,
            "supporting_record_ids": sorted(set(supporting_record_ids)),
            "supporting_transaction_ids": sorted(set(supporting_tx_ids)),
        }
        result_hash = _compute_result_hash(hashable_data)

        snapshot = InvestigationSnapshot(
            investigation_id=investigation_id,
            dataset_id=dataset_id,
            dataset_hash=dataset_hash,
            source_metadata=src_meta,
            normalization_version=norm_ver,
            rule_version=rule_version,
            threshold_configuration=threshold_config,
            app_version=APP_VERSION,
            victim_account=clean_acc,
            max_hops=max_hops,
            time_window_hours=time_window_hours,
            min_amount=min_amount,
            query_parameters=query_parameters,
            supporting_record_ids=list(dict.fromkeys(supporting_record_ids)),
            supporting_transaction_ids=list(dict.fromkeys(supporting_tx_ids)),
            result_hash=result_hash,
            created_at=datetime.now(UTC),
            money_trail_summary=money_trail_summary,
            layer_candidates=layer_candidates,
            risk_summary=risk_summary,
            evidence_items=evidence_items,
        )

        log_event(
            "EVIDENCE_SNAPSHOT_CREATED",
            investigation_id=investigation_id,
            victim_account=clean_acc,
            dataset_id=dataset_id,
            result_hash=result_hash,
            evidence_items_count=len(evidence_items),
        )

        self.audit_service.append_event(
            action="SNAPSHOT_CREATED",
            entity_type="investigation_snapshot",
            entity_id=investigation_id,
            details={
                "victim_account": clean_acc,
                "dataset_id": dataset_id,
                "dataset_hash": dataset_hash,
                "result_hash": result_hash,
                "evidence_items_count": len(evidence_items),
            },
        )

        return SnapshotResponse(snapshot=snapshot)
