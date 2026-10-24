"""Recovery analysis service implementing Observed Net Flow and candidate prioritization.

Adheres strictly to the Engineering Specification:
- ObservedNetFlow = sum(observed incoming amounts) - sum(observed outgoing amounts)
- Strictly limited to selected dataset and investigation window.
- NOT a verified current bank balance.
- Transaction-derived prioritization for asset freeze and forensic recovery.
"""

from typing import Any

import duckdb

from app.database.repositories.account import AccountRepository
from app.schemas.recovery import RecoveryCandidate, RecoveryCandidatesResponse
from app.services.risk_engine import RiskAssessmentService
from app.utils.logging import log_event, logger


class RecoveryService:
    """Calculates Observed Net Flow and prioritizes recovery investigation candidates."""

    def __init__(self, conn: duckdb.DuckDBPyConnection):
        self.conn = conn
        self.account_repo = AccountRepository(conn)
        self.risk_service = RiskAssessmentService(conn)

    def get_recovery_candidates(
        self,
        dataset_id: str,
        min_net_flow: float = 1.0,
        limit: int = 50,
        compute_risk: bool = True,
    ) -> RecoveryCandidatesResponse:
        """Identify, rank, and contextualize accounts retaining positive observed net flow."""
        logger.info(
            f"Scanning recovery candidates for dataset {dataset_id} (min_net_flow={min_net_flow}, limit={limit})"
        )

        raw_candidates = self.account_repo.get_positive_net_flow_accounts(
            dataset_id=dataset_id,
            min_net_flow=min_net_flow,
            limit=limit,
        )

        candidates: list[RecoveryCandidate] = []

        for item in raw_candidates:
            acc_id = item["account_id"]
            in_amt = item["in_amount"]
            out_amt = item["out_amount"]
            net_flow = item["observed_net_flow"]

            retention_pct = round((net_flow / in_amt * 100.0), 2) if in_amt > 0 else 0.0

            # Retrieve supporting transactions
            txs = self.account_repo.get_all_account_transactions(acc_id, dataset_id)
            in_records = [t.record_id for t in txs if t.direction == "IN"]
            out_records = [t.record_id for t in txs if t.direction == "OUT"]

            modes_used = list({t.payment_mode for t in txs if t.payment_mode})
            narrations_used = [t.narration for t in txs if t.narration]

            # Optional Mule Risk Index computation for weighting priority
            mule_risk = None
            if compute_risk:
                risk_profile = self.risk_service.assess_account_risk(acc_id, dataset_id)
                if risk_profile:
                    mule_risk = risk_profile.mule_risk_index

            # Deterministic recovery priority score (0-100 scale)
            # Combines Mule Risk Index (50%), net flow magnitude (30%), and retention (20%)
            flow_norm = min(100.0, net_flow / 500.0) if net_flow > 0 else 0.0
            priority_score = round(
                0.50 * (mule_risk or 0.0) + 0.30 * flow_norm + 0.20 * retention_pct,
                2,
            )

            # Contextual recovery evidence
            evidence: dict[str, Any] = {
                "payment_modes_observed": modes_used,
                "inflow_transaction_count": len(in_records),
                "outflow_transaction_count": len(out_records),
                "terminal_narrations": [
                    n for n in narrations_used if any(k in n for k in ("WALLET", "CRYPTO", "ATM"))
                ],
            }

            candidates.append(
                RecoveryCandidate(
                    account_id=acc_id,
                    observed_net_flow=round(net_flow, 2),
                    total_incoming_amount=round(in_amt, 2),
                    total_outgoing_amount=round(out_amt, 2),
                    retention_percentage=retention_pct,
                    time_window_start=item["first_tx_timestamp"],
                    time_window_end=item["last_tx_timestamp"],
                    supporting_incoming_record_ids=in_records,
                    supporting_outgoing_record_ids=out_records,
                    mule_risk_index=mule_risk,
                    recovery_priority_score=priority_score,
                    recovery_related_evidence=evidence,
                    disclaimer=(
                        "Observed Net Flow is strictly limited to the selected dataset and investigation window. "
                        "It represents transaction-derived observed net flow and is NOT a verified current bank balance."
                    ),
                )
            )

        # Sort descending by Mule Risk Index first, then priority score and net flow
        candidates.sort(
            key=lambda x: (
                x.mule_risk_index if x.mule_risk_index is not None else 0.0,
                x.recovery_priority_score,
                x.observed_net_flow,
            ),
            reverse=True,
        )

        log_event(
            "RECOVERY_CANDIDATES_GENERATED",
            dataset_id=dataset_id,
            total_found=len(candidates),
        )

        return RecoveryCandidatesResponse(
            dataset_id=dataset_id,
            total_candidates=len(candidates),
            candidates=candidates,
            methodology=(
                "Ranked by deterministic recovery priority score combining ObservedNetFlow = sum(incoming) - sum(outgoing), "
                "retention percentage, and Mule Risk Index within dataset scope. "
                "Observed Net Flow is strictly limited to the selected dataset and investigation window and is NOT a verified bank balance."
            ),
        )
