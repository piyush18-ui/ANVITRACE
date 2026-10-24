"""Explainable Mule Risk Index Engine adhering strictly to the Engineering Specification.

Provides:
- 0-100 Mule Risk Index calculation
- Evidence-backed feature output contract for every forensic feature
- Non-exclusive L1/L2/L3 candidate classifications
- Candidate terminology and legal disclaimers
- Deterministic, reproducible scoring
"""

from datetime import UTC, datetime

import duckdb

from app.algorithms.mule_detection import MuleDetectionEngine
from app.config.risk_rules import DEFAULT_RISK_CONFIG, RiskEngineConfig
from app.database.repositories.account import AccountRepository
from app.schemas.risk import (
    AccountRiskProfileResponse,
    RiskFeature,
)
from app.utils.logging import log_event


class RiskAssessmentService:
    """Orchestrates explainable forensic risk assessment for accounts."""

    def __init__(
        self,
        conn: duckdb.DuckDBPyConnection,
        config: RiskEngineConfig = DEFAULT_RISK_CONFIG,
    ):
        self.conn = conn
        self.config = config
        self.account_repo = AccountRepository(conn)
        self.detection_engine = MuleDetectionEngine(config)

    def assess_account_risk(
        self,
        account_id: str,
        dataset_id: str,
    ) -> AccountRiskProfileResponse | None:
        """Calculate explainable Mule Risk Index and candidate classifications for an account."""
        clean_acc = account_id.strip()

        # Check account existence in profile or transactions
        profile = self.account_repo.get_account_profile(clean_acc, dataset_id)
        if not profile:
            return None

        # Fetch chronological transaction history
        transactions = self.account_repo.get_all_account_transactions(clean_acc, dataset_id)

        # 1. Run pattern detectors
        pass_through_res = self.detection_engine.detect_rapid_pass_through(transactions)
        fan_in_res = self.detection_engine.detect_fan_in(transactions)
        fan_out_res = self.detection_engine.detect_fan_out(transactions)
        smurfing_res = self.detection_engine.detect_smurfing(transactions)
        cycle_res = self.detection_engine.detect_cycles(clean_acc, transactions)
        terminal_res = self.detection_engine.detect_terminal_indicators(transactions)
        dataset_signals = self.detection_engine.detect_dataset_signals(transactions)

        # 2. Build explainable RiskFeature objects adhering to mandatory contract
        features: list[RiskFeature] = []

        # Feature 1: Rapid Pass-Through
        pt_contrib = pass_through_res.get("score_contribution", 0.0)
        pt_explanation = pass_through_res.get("explanation", "No rapid pass-through candidate indicator observed.")

        features.append(
            RiskFeature(
                feature_name="rapid_pass_through",
                measured_value=pass_through_res["measured_value"],
                threshold_configured=pass_through_res["threshold_configured"],
                supporting_record_ids=pass_through_res["supporting_record_ids"],
                supporting_transaction_ids=pass_through_res["supporting_transaction_ids"],
                data_quality_confidence=pass_through_res.get("data_quality_confidence", 1.0 if transactions else 0.5),
                score_contribution=pt_contrib,
                explanation=pt_explanation,
            )
        )

        # Feature 2: Fan-In
        fi_contrib = 0.0
        fi_explanation = (
            f"Fan-in below threshold: received funds from {fan_in_res['distinct_senders_count']} "
            f"senders (threshold: {self.config.fan_in_min_senders})."
        )
        if fan_in_res["is_detected"]:
            fi_contrib = self.config.weight_fan_in
            fi_explanation = (
                f"Collector pattern indicator: received funds from {fan_in_res['distinct_senders_count']} "
                f"distinct senders across {fan_in_res['incoming_transaction_count']} transactions "
                f"totaling ₹{fan_in_res['incoming_amount']:,.2f}."
            )

        features.append(
            RiskFeature(
                feature_name="fan_in",
                measured_value={
                    "distinct_senders": fan_in_res["distinct_senders_count"],
                    "incoming_tx_count": fan_in_res["incoming_transaction_count"],
                    "incoming_amount": fan_in_res["incoming_amount"],
                },
                threshold_configured=fan_in_res["threshold_configured"],
                supporting_record_ids=fan_in_res["supporting_record_ids"],
                supporting_transaction_ids=fan_in_res["supporting_transaction_ids"],
                data_quality_confidence=1.0,
                score_contribution=fi_contrib,
                explanation=fi_explanation,
            )
        )

        # Feature 3: Fan-Out
        fo_contrib = 0.0
        fo_explanation = (
            f"Fan-out below threshold: distributed funds to {fan_out_res['distinct_receivers_count']} "
            f"receivers (threshold: {self.config.fan_out_min_receivers})."
        )
        if fan_out_res["is_detected"]:
            fo_contrib = self.config.weight_fan_out
            fo_explanation = (
                f"Distributor pattern indicator: distributed funds to {fan_out_res['distinct_receivers_count']} "
                f"distinct receivers across {fan_out_res['outgoing_transaction_count']} transactions "
                f"totaling ₹{fan_out_res['outgoing_amount']:,.2f}."
            )

        features.append(
            RiskFeature(
                feature_name="fan_out",
                measured_value={
                    "distinct_receivers": fan_out_res["distinct_receivers_count"],
                    "outgoing_tx_count": fan_out_res["outgoing_transaction_count"],
                    "outgoing_amount": fan_out_res["outgoing_amount"],
                },
                threshold_configured=fan_out_res["threshold_configured"],
                supporting_record_ids=fan_out_res["supporting_record_ids"],
                supporting_transaction_ids=fan_out_res["supporting_transaction_ids"],
                data_quality_confidence=1.0,
                score_contribution=fo_contrib,
                explanation=fo_explanation,
            )
        )

        # Feature 4: Smurfing
        sm_contrib = 0.0
        sm_explanation = "No smurfing or structured splitting behavior detected."
        if smurfing_res["is_detected"]:
            p = smurfing_res["primary_incident"]
            sm_contrib = self.config.weight_smurfing
            sm_explanation = (
                f"Smurfing indicator: incoming amount ₹{p['incoming_amount']:,.2f} was structured and split "
                f"into {p['split_count']} smaller outgoing transfers across {p['distinct_destinations_count']} "
                f"destinations within {self.config.smurfing_max_window_minutes} minutes."
            )

        features.append(
            RiskFeature(
                feature_name="smurfing",
                measured_value={
                    "is_detected": smurfing_res["is_detected"],
                    "incidents_count": smurfing_res["incidents_count"],
                    "primary_incident": smurfing_res["primary_incident"],
                },
                threshold_configured=smurfing_res["threshold_configured"],
                supporting_record_ids=smurfing_res["supporting_record_ids"],
                supporting_transaction_ids=smurfing_res["supporting_transaction_ids"],
                data_quality_confidence=1.0,
                score_contribution=sm_contrib,
                explanation=sm_explanation,
            )
        )

        # Feature 5: Cycles
        cy_contrib = 0.0
        cy_explanation = "No circular flow movement observed."
        if cycle_res["is_detected"]:
            cy_contrib = self.config.weight_cycle
            paths_str = ", ".join(" -> ".join(c["cycle_path"]) for c in cycle_res["cycles"][:3])
            cy_explanation = f"Circular flow indicator detected along path(s): {paths_str}."

        features.append(
            RiskFeature(
                feature_name="cycle",
                measured_value={
                    "is_detected": cycle_res["is_detected"],
                    "cycles_count": cycle_res["cycles_count"],
                    "cycles": cycle_res["cycles"],
                },
                threshold_configured=cycle_res["threshold_configured"],
                supporting_record_ids=cycle_res["supporting_record_ids"],
                supporting_transaction_ids=cycle_res["supporting_transaction_ids"],
                data_quality_confidence=1.0,
                score_contribution=cy_contrib,
                explanation=cy_explanation,
            )
        )

        # Feature 6: Device Anomaly
        dev_res = dataset_signals["device_anomaly"]
        dev_contrib = 0.0
        dev_explanation = "No anomalous high-risk devices identified."
        if dev_res["is_detected"]:
            dev_contrib = self.config.weight_device_anomaly
            dev_explanation = (
                f"Automated/Script device anomaly detected: transactions executed via {dev_res['matches']}."
            )

        features.append(
            RiskFeature(
                feature_name="device_anomaly",
                measured_value={
                    "is_detected": dev_res["is_detected"],
                    "matched_devices": dev_res["matches"],
                },
                threshold_configured=dev_res["threshold_configured"],
                supporting_record_ids=dev_res["supporting_record_ids"],
                supporting_transaction_ids=dev_res["supporting_transaction_ids"],
                data_quality_confidence=1.0,
                score_contribution=dev_contrib,
                explanation=dev_explanation,
            )
        )

        # Feature 7: IP Anomaly
        ip_res = dataset_signals["ip_anomaly"]
        ip_contrib = 0.0
        ip_explanation = "No anomalous foreign or high-risk IP subnets detected."
        if ip_res["is_detected"]:
            ip_contrib = self.config.weight_ip_anomaly
            ip_explanation = (
                f"Suspicious IP prefix indicator detected: transactions routed via {ip_res['matches']}."
            )

        features.append(
            RiskFeature(
                feature_name="ip_anomaly",
                measured_value={
                    "is_detected": ip_res["is_detected"],
                    "matched_ips": ip_res["matches"],
                },
                threshold_configured=ip_res["threshold_configured"],
                supporting_record_ids=ip_res["supporting_record_ids"],
                supporting_transaction_ids=ip_res["supporting_transaction_ids"],
                data_quality_confidence=1.0,
                score_contribution=ip_contrib,
                explanation=ip_explanation,
            )
        )

        # Feature 8: Narration Pattern
        narr_res = dataset_signals["narration_pattern"]
        narr_contrib = 0.0
        narr_explanation = "No known deceptive or mule task-earning narrations detected."
        if narr_res["is_detected"]:
            narr_contrib = self.config.weight_narration_pattern
            narr_explanation = (
                f"Deceptive narration pattern detected: transactions marked with {narr_res['matches']}."
            )

        features.append(
            RiskFeature(
                feature_name="narration_pattern",
                measured_value={
                    "is_detected": narr_res["is_detected"],
                    "matched_narrations": narr_res["matches"],
                },
                threshold_configured=narr_res["threshold_configured"],
                supporting_record_ids=narr_res["supporting_record_ids"],
                supporting_transaction_ids=narr_res["supporting_transaction_ids"],
                data_quality_confidence=1.0,
                score_contribution=narr_contrib,
                explanation=narr_explanation,
            )
        )

        # 3. Calculate Normalized Mule Risk Index (0-100)
        raw_score = sum(f.score_contribution for f in features)

        # Baseline mitigation: dampens score if account exhibits clean utility/salary narratives and no behavioural red flags
        mitigation_applied = False
        if dataset_signals["is_baseline_dominant"] and not (
            pass_through_res["is_detected"] or smurfing_res["is_detected"] or cycle_res["is_detected"]
        ):
            raw_score *= self.config.baseline_mitigation_factor
            mitigation_applied = True

        mule_risk_index = round(min(100.0, max(0.0, raw_score)), 2)

        # Risk Tier assignment
        if mule_risk_index >= 75.0:
            risk_tier = "CRITICAL"
        elif mule_risk_index >= 50.0:
            risk_tier = "HIGH"
        elif mule_risk_index >= 25.0:
            risk_tier = "MEDIUM"
        else:
            risk_tier = "LOW"

        # 4. Generate candidate layer classifications
        layer_classifications = self.detection_engine.classify_candidate_layers(
            fan_in_res=fan_in_res,
            fan_out_res=fan_out_res,
            pass_through_res=pass_through_res,
            smurfing_res=smurfing_res,
            terminal_res=terminal_res,
        )

        log_event(
            "RISK_ASSESSMENT_COMPLETED",
            account_id=clean_acc,
            dataset_id=dataset_id,
            mule_risk_index=mule_risk_index,
            risk_tier=risk_tier,
            layers=[layer.role for layer in layer_classifications],
            mitigation_applied=mitigation_applied,
        )

        return AccountRiskProfileResponse(
            account_id=clean_acc,
            dataset_id=dataset_id,
            mule_risk_index=mule_risk_index,
            risk_tier=risk_tier,
            rule_version=self.config.rule_version,
            candidate_terminology_disclaimer=(
                "This risk index is an investigative prioritization indicator and candidate hypothesis. "
                "It is NOT legal proof or automatic evidence of criminal intent."
            ),
            layer_classifications=layer_classifications,
            features=features,
            calculated_at=datetime.now(UTC),
        )
