"""Deep Dive Multi-Identifier Search & Primary Candidate Recommendation Service.

Supports:
- Auto-detected and field-specific searching across Accounts, Transaction IDs,
  Record IDs, IP Addresses, Device Types, IFSC Codes, and Evidence IDs.
- Source-file provenance and row references for all search hits.
- Explainable Primary Investigation-Candidate recommendation using combined
  rule-based and Isolation Forest ML anomaly signals.
"""

from __future__ import annotations

import re
from typing import Any

import duckdb

from app.algorithms.isolation_forest import IsolationForestEngine
from app.database.repositories.dataset import DatasetRepository
from app.services.risk_engine import RiskAssessmentService


class SearchRecommendationService:
    """Provides universal identifier search and primary investigation candidate ranking."""

    def __init__(self, conn: duckdb.DuckDBPyConnection):
        self.conn = conn
        self.dataset_repo = DatasetRepository(conn)
        self.risk_service = RiskAssessmentService(conn)
        self.ml_engine = IsolationForestEngine()

    def detect_identifier_type(self, query: str) -> str:
        """Infer the most likely identifier type from syntax heuristics."""
        q = query.strip()
        # IP address (IPv4)
        if re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$", q):
            return "ip_address"
        # Indian IFSC Code: 4 alphabetic, 0, 6 alphanumeric
        if re.match(r"^[A-Za-z]{4}0[A-Za-z0-9]{6}$", q):
            return "ifsc"
        # Evidence ID or Dataset ID
        if q.startswith("ev_") or q.startswith("ds_"):
            return "evidence_id"
        # Transaction ID: e.g. TX..., TXN..., or numeric string with >12 digits
        if q.upper().startswith("TX") or (q.isalnum() and len(q) >= 16):
            return "transaction_id"
        # Standard Account ID
        return "account"

    def search_universal(
        self,
        query: str,
        field_type: str = "auto",
        dataset_id: str | None = None,
        limit: int = 50,
    ) -> dict[str, Any]:
        """Perform multi-identifier search with full provenance references."""
        q = query.strip()
        if not q:
            return {"query": "", "field_type": field_type, "results": [], "total_count": 0}

        ds_id = dataset_id
        if not ds_id:
            latest = self.dataset_repo.get_latest_dataset()
            ds_id = latest["dataset_id"] if latest else ""

        detected_type = self.detect_identifier_type(q) if field_type == "auto" else field_type
        escaped_q = q.replace("'", "''")

        ds_filter = f"dataset_id = '{ds_id}' AND" if ds_id else ""

        results: list[dict[str, Any]] = []

        if detected_type == "account":
            # Search both Sender and Receiver accounts
            tx_rows = self.conn.execute(
                f"""
                SELECT
                    record_id, Transaction_ID, Sender_Account, Receiver_Account,
                    Amount, Timestamp, Payment_Mode, Narration, IP_Address, Device_Type,
                    dataset_id, source_row, COALESCE(source_filename, 'primary_evidence.csv') as source_filename
                FROM transactions
                WHERE {ds_filter} (
                    Sender_Account ILIKE '%{escaped_q}%' OR
                    Receiver_Account ILIKE '%{escaped_q}%'
                )
                ORDER BY Timestamp DESC
                LIMIT {limit}
                """
            ).fetchall()
            for r in tx_rows:
                results.append({
                    "match_type": "account_transaction",
                    "record_id": r[0],
                    "transaction_id": r[1],
                    "sender_account": r[2],
                    "receiver_account": r[3],
                    "amount": float(r[4]),
                    "timestamp": str(r[5]),
                    "payment_mode": r[6],
                    "narration": r[7],
                    "ip_address": r[8],
                    "device_type": r[9],
                    "dataset_id": r[10],
                    "source_row": r[11],
                    "source_filename": r[12],
                })

        elif detected_type == "transaction_id":
            tx_rows = self.conn.execute(
                f"""
                SELECT
                    record_id, Transaction_ID, Sender_Account, Receiver_Account,
                    Amount, Timestamp, Payment_Mode, Narration, IP_Address, Device_Type,
                    dataset_id, source_row, COALESCE(source_filename, 'primary_evidence.csv') as source_filename
                FROM transactions
                WHERE {ds_filter} Transaction_ID ILIKE '%{escaped_q}%'
                ORDER BY Timestamp DESC
                LIMIT {limit}
                """
            ).fetchall()
            for r in tx_rows:
                results.append({
                    "match_type": "transaction",
                    "record_id": r[0],
                    "transaction_id": r[1],
                    "sender_account": r[2],
                    "receiver_account": r[3],
                    "amount": float(r[4]),
                    "timestamp": str(r[5]),
                    "payment_mode": r[6],
                    "narration": r[7],
                    "ip_address": r[8],
                    "device_type": r[9],
                    "dataset_id": r[10],
                    "source_row": r[11],
                    "source_filename": r[12],
                })

        elif detected_type == "ip_address":
            tx_rows = self.conn.execute(
                f"""
                SELECT
                    record_id, Transaction_ID, Sender_Account, Receiver_Account,
                    Amount, Timestamp, Payment_Mode, Narration, IP_Address, Device_Type,
                    dataset_id, source_row, COALESCE(source_filename, 'primary_evidence.csv') as source_filename
                FROM transactions
                WHERE {ds_filter} IP_Address ILIKE '%{escaped_q}%'
                ORDER BY Timestamp DESC
                LIMIT {limit}
                """
            ).fetchall()
            for r in tx_rows:
                results.append({
                    "match_type": "ip_network_record",
                    "record_id": r[0],
                    "transaction_id": r[1],
                    "sender_account": r[2],
                    "receiver_account": r[3],
                    "amount": float(r[4]),
                    "timestamp": str(r[5]),
                    "payment_mode": r[6],
                    "narration": r[7],
                    "ip_address": r[8],
                    "device_type": r[9],
                    "dataset_id": r[10],
                    "source_row": r[11],
                    "source_filename": r[12],
                })

        elif detected_type == "ifsc":
            tx_rows = self.conn.execute(
                f"""
                SELECT
                    record_id, Transaction_ID, Sender_Account, Receiver_Account,
                    Sender_IFSC, Receiver_IFSC, Amount, Timestamp,
                    dataset_id, source_row, COALESCE(source_filename, 'primary_evidence.csv') as source_filename
                FROM transactions
                WHERE {ds_filter} (Sender_IFSC ILIKE '%{escaped_q}%' OR Receiver_IFSC ILIKE '%{escaped_q}%')
                ORDER BY Timestamp DESC
                LIMIT {limit}
                """
            ).fetchall()
            for r in tx_rows:
                results.append({
                    "match_type": "ifsc_branch",
                    "record_id": r[0],
                    "transaction_id": r[1],
                    "sender_account": r[2],
                    "receiver_account": r[3],
                    "sender_ifsc": r[4],
                    "receiver_ifsc": r[5],
                    "amount": float(r[6]),
                    "timestamp": str(r[7]),
                    "dataset_id": r[8],
                    "source_row": r[9],
                    "source_filename": r[10],
                })

        elif detected_type == "evidence_id":
            ev_rows = self.conn.execute(
                f"""
                SELECT evidence_id, dataset_id, item_type, title, file_path, created_at, sha256_hash
                FROM evidence_items
                WHERE {ds_filter} evidence_id ILIKE '%{escaped_q}%'
                LIMIT {limit}
                """
            ).fetchall()
            for r in ev_rows:
                results.append({
                    "match_type": "evidence_item",
                    "evidence_id": r[0],
                    "dataset_id": r[1],
                    "item_type": r[2],
                    "title": r[3],
                    "file_path": r[4],
                    "created_at": str(r[5]),
                    "sha256_hash": r[6],
                })

        return {
            "query": query,
            "detected_type": detected_type,
            "field_type_used": field_type,
            "dataset_id": ds_id,
            "total_count": len(results),
            "results": results,
        }

    def recommend_primary_candidates(
        self,
        dataset_id: str | None = None,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        """Rank and return explainable primary investigation candidates across dataset."""
        ds_id = dataset_id
        if not ds_id:
            latest = self.dataset_repo.get_latest_dataset()
            ds_id = latest["dataset_id"] if latest else ""

        if not ds_id:
            return []

        # 1. Fetch top candidate accounts prioritized by volume & counterparty activity
        candidate_pool_limit = max(limit * 4, 40)
        accounts = self.conn.execute(
            f"""
            SELECT
                account_id,
                CAST(in_amount AS DOUBLE) as in_amount,
                CAST(out_amount AS DOUBLE) as out_amount,
                CAST(in_tx_count AS BIGINT) as in_tx_count,
                CAST(out_tx_count AS BIGINT) as out_tx_count,
                CAST(distinct_senders AS BIGINT) as distinct_senders,
                CAST(distinct_receivers AS BIGINT) as distinct_receivers
            FROM account_features
            WHERE dataset_id = '{ds_id}'
              AND (in_amount > 0 OR out_amount > 0)
            ORDER BY (in_amount + out_amount) DESC
            LIMIT {candidate_pool_limit}
            """
        ).fetchall()

        if not accounts:
            return []

        # 2. Run Isolation Forest ML anomaly scoring across all accounts
        ml_scores = self.ml_engine.score_dataset(self.conn, ds_id)

        candidates: list[dict[str, Any]] = []

        for acc_id, in_amt, out_amt, in_count, out_count, senders, receivers in accounts:
            # Rule risk assessment
            risk_prof = self.risk_service.assess_account_risk(acc_id, ds_id)
            rule_score = risk_prof.mule_risk_index if risk_prof else 0.0

            # ML anomaly assessment
            ml_res = ml_scores.get(acc_id)
            ml_score = ml_res.anomaly_score if ml_res else 0.0

            # Combined Priority: 60% rule-based heuristics + 40% Isolation Forest anomaly
            combined_priority = (0.60 * rule_score) + (0.40 * ml_score)

            # Build explainable supporting signals
            signals: list[str] = []
            if in_amt > 0 and out_amt > 0:
                pass_ratio = min(out_amt / in_amt, 1.0) * 100
                if pass_ratio >= 80:
                    signals.append(f"Rapid Pass-Through: Dispersed {pass_ratio:.1f}% of inbound funds")

            if senders >= 3 and receivers >= 2:
                signals.append(f"Multi-Hop Structuring: {senders} remitter sources to {receivers} beneficiary destinations")
            elif senders >= 4:
                signals.append(f"Collector Hub (Fan-In): Aggregates funds from {senders} distinct remitters")
            elif receivers >= 4:
                signals.append(f"Distributor Node (Fan-Out): Disperses funds into {receivers} distinct accounts")

            if ml_res and ml_res.is_anomaly:
                for exp in ml_res.explanations[:2]:
                    signals.append(f"ML Outlier: {exp.feature_label} is {exp.deviation_factor:.1f}x population median")

            if risk_prof:
                for f in risk_prof.features[:2]:
                    if f.score_contribution > 10:
                        signals.append(f"Heuristic Flag: {f.explanation}")

            # Assign investigative candidate tier
            if combined_priority >= 75:
                tier = "High Priority Candidate"
            elif combined_priority >= 50:
                tier = "Moderate Priority Candidate"
            else:
                tier = "Observational Candidate"

            candidates.append({
                "account_id": acc_id,
                "dataset_id": ds_id,
                "investigation_priority_score": round(combined_priority, 1),
                "rule_risk_score": round(rule_score, 1),
                "ml_anomaly_score": round(ml_score, 1),
                "candidate_tier": tier,
                "in_amount": round(in_amt, 2),
                "out_amount": round(out_amt, 2),
                "in_tx_count": in_count,
                "out_tx_count": out_count,
                "distinct_senders": senders,
                "distinct_receivers": receivers,
                "supporting_signals": signals[:4],
                "why_ranked": (
                    f"Account exhibits a combined score of {combined_priority:.1f}/100 driven by "
                    f"{' and '.join(signals[:2]) if signals else 'volume dispersion characteristics'}."
                ),
                "disclaimer": "Designation as a primary investigation candidate represents an investigative lead, not proof of fraud.",
            })

        # Rank by highest combined priority score
        candidates.sort(key=lambda x: x["investigation_priority_score"], reverse=True)
        return candidates[:limit]
