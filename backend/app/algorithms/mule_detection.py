"""Mule ring pattern detection and evidence-backed forensic analysis.

Implements deterministic detection for:
- Rapid pass-through
- Fan-in (Layer 1 Collector)
- Fan-out (Layer 2 Distributor)
- Smurfing / Splitting (structured lineage)
- Cycle indicators (path-aware circular flow)
- Terminal indicators (retention, payment modes, endpoint conversion)
- Dataset-specific signals (Linux_Script, Web_Emulator, 185.*, 194.*, TASK_EARNING, etc.)
- Baseline mitigation (SALARY, UTILITY, 103.*, etc.)
- Evidence-backed Layer 1 / Layer 2 / Layer 3 candidate classifications

Enforces strict candidate terminology: all detections represent investigative indicators
and candidate hypotheses, NOT proof of criminal guilt.
"""

from typing import Any

from app.config.risk_rules import DEFAULT_RISK_CONFIG, RiskEngineConfig
from app.schemas.account import AccountTransactionItem
from app.schemas.risk import LayerClassification


class MuleDetectionEngine:
    """Deterministic, configurable rule engine for detecting mule patterns on transaction data."""

    def __init__(self, config: RiskEngineConfig = DEFAULT_RISK_CONFIG):
        self.config = config

    def detect_rapid_pass_through(
        self,
        transactions: list[AccountTransactionItem],
    ) -> dict[str, Any]:
        """Detect accounts exhibiting rapid pass-through signal based on incoming-relative timing.

        Evaluates:
        - Percentage of incoming value dispersed
        - Elapsed time from the relevant incoming transaction
        - Number of outgoing transfers and destinations
        - Official 90% criterion within configured 3-15 minute window
        - Graduated signal strength: STRONG (>=90%), MODERATE (80-89.99%), WEAK (70-79.99%), LOW/NO SIGNAL (<70%)
        - Double-count prevention across consecutive incoming transactions
        """
        in_txs = [t for t in transactions if t.direction == "IN" and t.amount > 0]
        out_txs = [t for t in transactions if t.direction == "OUT" and t.amount > 0]

        # Sort both chronologically
        in_txs_sorted = sorted(in_txs, key=lambda x: (x.timestamp, x.record_id))
        out_txs_sorted = sorted(out_txs, key=lambda x: (x.timestamp, x.record_id))

        max_window_sec = self.config.rapid_pass_through_max_minutes * 60.0

        # Available capacity per outgoing transaction to prevent double counting
        out_remaining: dict[str, float] = {t.record_id: t.amount for t in out_txs_sorted}

        incidents: list[dict[str, Any]] = []
        all_supporting_record_ids: list[str] = []
        all_supporting_tx_ids: list[str] = []

        for in_tx in in_txs_sorted:
            in_ts = in_tx.timestamp
            in_amt = in_tx.amount
            in_remaining = in_amt

            dispersed_txs: list[AccountTransactionItem] = []
            dispersed_amounts: dict[str, float] = {}

            for out_tx in out_txs_sorted:
                if out_tx.timestamp < in_ts:
                    continue
                diff_sec = (out_tx.timestamp - in_ts).total_seconds()
                if diff_sec <= max_window_sec:
                    avail = out_remaining.get(out_tx.record_id, 0.0)
                    if avail > 0.001 and in_remaining > 0.001:
                        alloc = min(in_remaining, avail)
                        in_remaining -= alloc
                        out_remaining[out_tx.record_id] -= alloc
                        dispersed_txs.append(out_tx)
                        dispersed_amounts[out_tx.record_id] = alloc
                elif out_tx.timestamp > in_ts:
                    break

            dispersed_amt = round(in_amt - in_remaining, 2)
            ratio = round(dispersed_amt / in_amt, 4) if in_amt > 0 else 0.0
            percentage = round(ratio * 100.0, 2)

            if dispersed_txs:
                latest_out_ts = max(t.timestamp for t in dispersed_txs)
                elapsed_min = round((latest_out_ts - in_ts).total_seconds() / 60.0, 2)
            else:
                elapsed_min = 0.0

            # Official criterion: >= 90% dispersed within the configured 3-15 minute window
            is_within_window = (
                self.config.rapid_pass_through_min_minutes <= elapsed_min <= self.config.rapid_pass_through_max_minutes
            )
            official_criterion_met = (
                ratio >= self.config.rapid_pass_through_official_ratio and is_within_window
            )

            # Graduated signal strength (only within valid evaluation window)
            if is_within_window:
                if ratio >= self.config.pass_through_strong_ratio:
                    sig_strength = "STRONG"
                    score_contrib = self.config.weight_rapid_pass_through
                elif ratio >= self.config.pass_through_moderate_ratio:
                    sig_strength = "MODERATE"
                    score_contrib = round(self.config.weight_rapid_pass_through * 0.75, 2)
                elif ratio >= self.config.pass_through_weak_ratio:
                    sig_strength = "WEAK"
                    score_contrib = round(self.config.weight_rapid_pass_through * 0.50, 2)
                else:
                    sig_strength = "LOW/NO SIGNAL"
                    score_contrib = 0.0
            else:
                sig_strength = "LOW/NO SIGNAL"
                score_contrib = 0.0

            destinations = sorted({t.counterparty_account for t in dispersed_txs if t.counterparty_account})
            rec_ids = [in_tx.record_id] + [t.record_id for t in dispersed_txs] if dispersed_txs else []
            tx_ids = [in_tx.Transaction_ID] + [t.Transaction_ID for t in dispersed_txs] if dispersed_txs else []

            incident = {
                "incoming_record_id": in_tx.record_id,
                "incoming_tx_id": in_tx.Transaction_ID,
                "incoming_amount": in_amt,
                "incoming_timestamp": in_ts.isoformat(),
                "dispersed_outgoing_amount": dispersed_amt,
                "percentage": percentage,
                "elapsed_time": elapsed_min,
                "elapsed_minutes": elapsed_min,
                "number_of_outgoing_transfers": len(dispersed_txs),
                "destinations": destinations,
                "official_criterion_met": official_criterion_met,
                "signal_strength": sig_strength,
                "score_contribution": score_contrib,
                "supporting_record_ids": rec_ids,
                "supporting_transaction_ids": tx_ids,
            }
            incidents.append(incident)

            if sig_strength != "LOW/NO SIGNAL":
                all_supporting_record_ids.extend(rec_ids)
                all_supporting_tx_ids.extend(tx_ids)

        # Rank incidents to determine primary signal
        severity_rank = {"STRONG": 3, "MODERATE": 2, "WEAK": 1, "LOW/NO SIGNAL": 0}
        active_incidents = [i for i in incidents if i["signal_strength"] != "LOW/NO SIGNAL"]

        if active_incidents:
            primary = max(
                active_incidents,
                key=lambda x: (severity_rank[x["signal_strength"]], x["percentage"], -x["elapsed_minutes"]),
            )
        elif incidents:
            primary = max(
                incidents,
                key=lambda x: (x["percentage"], -x["elapsed_minutes"]),
            )
        else:
            primary = None

        is_detected = primary is not None and primary["signal_strength"] != "LOW/NO SIGNAL"
        primary_strength = primary["signal_strength"] if primary else "LOW/NO SIGNAL"
        primary_official_met = primary["official_criterion_met"] if primary else False
        primary_elapsed = primary["elapsed_minutes"] if primary else 0.0
        primary_score_contrib = primary["score_contribution"] if primary else 0.0
        primary_percentage = primary["percentage"] if primary else 0.0
        primary_incoming_amt = primary["incoming_amount"] if primary else 0.0
        primary_dispersed_amt = primary["dispersed_outgoing_amount"] if primary else 0.0
        primary_out_count = primary["number_of_outgoing_transfers"] if primary else 0
        primary_destinations = primary["destinations"] if primary else []

        # Candidate explanation conforming to forensic terminology
        if primary_strength == "STRONG":
            explanation = (
                f"Pass-through signal [STRONG]: {primary_percentage}% of incoming funds (₹{primary_incoming_amt:,.2f}) "
                f"dispersed across {primary_out_count} transfer(s) to {len(primary_destinations)} destination(s) "
                f"within {primary_elapsed}m (Official 90% criterion met). Candidate indicator for investigative prioritization."
            )
        elif primary_strength == "MODERATE":
            explanation = (
                f"Pass-through signal [MODERATE]: {primary_percentage}% of incoming funds (₹{primary_incoming_amt:,.2f}) "
                f"dispersed across {primary_out_count} transfer(s) to {len(primary_destinations)} destination(s) "
                f"within {primary_elapsed}m (Official 90% criterion not met). Moderate candidate indicator."
            )
        elif primary_strength == "WEAK":
            explanation = (
                f"Pass-through signal [WEAK]: {primary_percentage}% of incoming funds (₹{primary_incoming_amt:,.2f}) "
                f"dispersed across {primary_out_count} transfer(s) to {len(primary_destinations)} destination(s) "
                f"within {primary_elapsed}m (Official 90% criterion not met). Weak candidate indicator."
            )
        else:
            explanation = "No rapid pass-through candidate indicator observed within configured window."

        dedup_records = list(dict.fromkeys(all_supporting_record_ids)) if is_detected else []
        dedup_txs = list(dict.fromkeys(all_supporting_tx_ids)) if is_detected else []

        official_threshold = {
            "min_ratio": self.config.rapid_pass_through_official_ratio,
            "min_minutes": self.config.rapid_pass_through_min_minutes,
            "max_minutes": self.config.rapid_pass_through_max_minutes,
        }

        measured_value = {
            "percentage": primary_percentage,
            "elapsed_time": primary_elapsed,
            "elapsed_minutes": primary_elapsed,
            "number_of_outgoing_transfers": primary_out_count,
            "destinations": primary_destinations,
            "incoming_amount": primary_incoming_amt,
            "dispersed_outgoing_amount": primary_dispersed_amt,
            "official_threshold": official_threshold,
            "official_criterion_met": primary_official_met,
            "official_pass_through_criterion_met": primary_official_met,
            "signal_strength": primary_strength,
            "is_detected": is_detected,
            "incidents_count": len(active_incidents),
            "primary_incident": primary,
        }

        threshold_configured = {
            "official_criterion": official_threshold,
            "graduated_severity_thresholds": {
                "STRONG": self.config.pass_through_strong_ratio,
                "MODERATE": self.config.pass_through_moderate_ratio,
                "WEAK": self.config.pass_through_weak_ratio,
            },
            "window_minutes": self.config.rapid_pass_through_max_minutes,
            "min_ratio": self.config.pass_through_weak_ratio,
        }

        return {
            "feature_name": "rapid_pass_through",
            "is_detected": is_detected,
            "measured_value": measured_value,
            "elapsed_time": primary_elapsed,
            "official_threshold": official_threshold,
            "official_criterion_met": primary_official_met,
            "official_pass_through_criterion_met": primary_official_met,
            "signal_strength": primary_strength,
            "incidents_count": len(active_incidents),
            "primary_incident": primary,
            "all_incidents": incidents,
            "supporting_record_ids": dedup_records,
            "supporting_transaction_ids": dedup_txs,
            "data_quality_confidence": 1.0 if transactions else 0.5,
            "score_contribution": primary_score_contrib,
            "explanation": explanation,
            "human_readable_explanation": explanation,
            "threshold_configured": threshold_configured,
        }


    def detect_fan_in(
        self,
        transactions: list[AccountTransactionItem],
    ) -> dict[str, Any]:
        """Detect accounts aggregating incoming funds from multiple distinct senders."""
        in_txs = [t for t in transactions if t.direction == "IN" and t.amount > 0]
        distinct_senders = {t.counterparty_account for t in in_txs if t.counterparty_account}
        sender_count = len(distinct_senders)
        in_count = len(in_txs)
        in_amount = round(sum(t.amount for t in in_txs), 2)

        is_detected = sender_count >= self.config.fan_in_min_senders
        supporting_record_ids = [t.record_id for t in in_txs]
        supporting_tx_ids = [t.Transaction_ID for t in in_txs]

        return {
            "is_detected": is_detected,
            "distinct_senders_count": sender_count,
            "distinct_senders": sorted(distinct_senders),
            "incoming_transaction_count": in_count,
            "incoming_amount": in_amount,
            "supporting_record_ids": supporting_record_ids,
            "supporting_transaction_ids": supporting_tx_ids,
            "threshold_configured": {
                "fan_in_min_senders": self.config.fan_in_min_senders,
            },
        }

    def detect_fan_out(
        self,
        transactions: list[AccountTransactionItem],
    ) -> dict[str, Any]:
        """Detect accounts distributing funds outward to multiple distinct receivers."""
        out_txs = [t for t in transactions if t.direction == "OUT" and t.amount > 0]
        distinct_receivers = {t.counterparty_account for t in out_txs if t.counterparty_account}
        receiver_count = len(distinct_receivers)
        out_count = len(out_txs)
        out_amount = round(sum(t.amount for t in out_txs), 2)

        is_detected = receiver_count >= self.config.fan_out_min_receivers
        supporting_record_ids = [t.record_id for t in out_txs]
        supporting_tx_ids = [t.Transaction_ID for t in out_txs]

        return {
            "is_detected": is_detected,
            "distinct_receivers_count": receiver_count,
            "distinct_receivers": sorted(distinct_receivers),
            "outgoing_transaction_count": out_count,
            "outgoing_amount": out_amount,
            "supporting_record_ids": supporting_record_ids,
            "supporting_transaction_ids": supporting_tx_ids,
            "threshold_configured": {
                "fan_out_min_receivers": self.config.fan_out_min_receivers,
            },
        }

    def detect_smurfing(
        self,
        transactions: list[AccountTransactionItem],
    ) -> dict[str, Any]:
        """Detect suspicious splitting of incoming money across multiple downstream destinations.

        Connects actual source transaction to structured downstream fragments.
        """
        in_txs = [t for t in transactions if t.direction == "IN" and t.amount > 0]
        out_txs = [t for t in transactions if t.direction == "OUT" and t.amount > 0]

        window_sec = self.config.smurfing_max_window_minutes * 60.0
        min_splits = self.config.smurfing_min_splits
        min_ratio = self.config.smurfing_min_ratio

        incidents: list[dict[str, Any]] = []
        all_supporting_record_ids: list[str] = []
        all_supporting_tx_ids: list[str] = []

        out_txs_sorted = sorted(out_txs, key=lambda x: (x.timestamp, x.record_id))

        for in_tx in in_txs:
            in_ts = in_tx.timestamp
            in_amt = in_tx.amount

            split_txs: list[AccountTransactionItem] = []
            for out_tx in out_txs_sorted:
                if out_tx.timestamp < in_ts:
                    continue
                diff_sec = (out_tx.timestamp - in_ts).total_seconds()
                if diff_sec <= window_sec:
                    # Smurfing requires smaller structured splits relative to source lump sum
                    if out_tx.amount < in_amt:
                        split_txs.append(out_tx)
                elif out_tx.timestamp > in_ts:
                    break

            if len(split_txs) >= min_splits:
                destinations = {t.counterparty_account for t in split_txs if t.counterparty_account}
                total_split_amt = sum(t.amount for t in split_txs)
                ratio = round(total_split_amt / in_amt, 4) if in_amt > 0 else 0.0

                if len(destinations) >= 2 and ratio >= min_ratio:
                    rec_ids = [in_tx.record_id] + [t.record_id for t in split_txs]
                    tx_ids = [in_tx.Transaction_ID] + [t.Transaction_ID for t in split_txs]

                    incidents.append(
                        {
                            "source_record_id": in_tx.record_id,
                            "source_tx_id": in_tx.Transaction_ID,
                            "incoming_amount": in_amt,
                            "split_count": len(split_txs),
                            "split_amounts": [t.amount for t in split_txs],
                            "total_split_amount": round(total_split_amt, 2),
                            "distinct_destinations_count": len(destinations),
                            "distinct_destinations": sorted(destinations),
                            "split_ratio": ratio,
                            "supporting_record_ids": rec_ids,
                            "supporting_transaction_ids": tx_ids,
                        }
                    )
                    all_supporting_record_ids.extend(rec_ids)
                    all_supporting_tx_ids.extend(tx_ids)

        is_detected = len(incidents) > 0
        primary = max(incidents, key=lambda x: x["split_count"]) if incidents else None

        dedup_records = list(dict.fromkeys(all_supporting_record_ids))
        dedup_txs = list(dict.fromkeys(all_supporting_tx_ids))

        return {
            "is_detected": is_detected,
            "incidents_count": len(incidents),
            "primary_incident": primary,
            "all_incidents": incidents,
            "supporting_record_ids": dedup_records,
            "supporting_transaction_ids": dedup_txs,
            "threshold_configured": {
                "smurfing_min_splits": min_splits,
                "smurfing_max_window_minutes": self.config.smurfing_max_window_minutes,
                "smurfing_min_ratio": min_ratio,
            },
        }

    def detect_cycles(
        self,
        account_id: str,
        transactions: list[AccountTransactionItem],
    ) -> dict[str, Any]:
        """Detect circular flows connecting back to this account or its immediate counterparty loop."""
        in_txs = [t for t in transactions if t.direction == "IN" and t.amount > 0]
        out_txs = [t for t in transactions if t.direction == "OUT" and t.amount > 0]

        cycle_instances: list[dict[str, Any]] = []
        all_supporting_record_ids: list[str] = []
        all_supporting_tx_ids: list[str] = []

        # 2-hop circular flow: Account A -> B then B -> A at later or equal timestamp
        for out_tx in out_txs:
            b_acc = out_tx.counterparty_account
            if not b_acc or b_acc == account_id:
                continue

            for in_tx in in_txs:
                if in_tx.counterparty_account == b_acc and in_tx.timestamp >= out_tx.timestamp:
                    cycle_path = [account_id, b_acc, account_id]
                    rec_ids = [out_tx.record_id, in_tx.record_id]
                    tx_ids = [out_tx.Transaction_ID, in_tx.Transaction_ID]
                    cycle_instances.append(
                        {
                            "cycle_path": cycle_path,
                            "hop_length": 2,
                            "outflow_record_id": out_tx.record_id,
                            "inflow_record_id": in_tx.record_id,
                            "outflow_amount": out_tx.amount,
                            "inflow_amount": in_tx.amount,
                            "supporting_record_ids": rec_ids,
                            "supporting_transaction_ids": tx_ids,
                        }
                    )
                    all_supporting_record_ids.extend(rec_ids)
                    all_supporting_tx_ids.extend(tx_ids)

        is_detected = len(cycle_instances) > 0
        dedup_records = list(dict.fromkeys(all_supporting_record_ids))
        dedup_txs = list(dict.fromkeys(all_supporting_tx_ids))

        return {
            "is_detected": is_detected,
            "cycles_count": len(cycle_instances),
            "cycles": cycle_instances,
            "supporting_record_ids": dedup_records,
            "supporting_transaction_ids": dedup_txs,
            "threshold_configured": {
                "cycle_detection": "temporal_circular_flow",
            },
        }

    def detect_terminal_indicators(
        self,
        transactions: list[AccountTransactionItem],
    ) -> dict[str, Any]:
        """Detect downstream endpoint indicators combining retention, payment modes, and narrations."""
        in_txs = [t for t in transactions if t.direction == "IN" and t.amount > 0]
        out_txs = [t for t in transactions if t.direction == "OUT" and t.amount > 0]

        total_in = sum(t.amount for t in in_txs)
        total_out = sum(t.amount for t in out_txs)
        net_flow = max(0.0, total_in - total_out)

        retention_ratio = round(net_flow / total_in, 4) if total_in > 0 else 0.0

        # Check for terminal payment modes
        terminal_modes_found: list[str] = []
        mode_records: list[str] = []
        mode_tx_ids: list[str] = []

        terminal_modes = set(self.config.terminal_payment_modes)
        for t in out_txs:
            pm = (t.payment_mode or "").upper().strip()
            if pm in terminal_modes:
                terminal_modes_found.append(pm)
                mode_records.append(t.record_id)
                mode_tx_ids.append(t.Transaction_ID)

        # Check for terminal narrations
        narr_found: list[str] = []
        narr_records: list[str] = []
        narr_tx_ids: list[str] = []
        for t in transactions:
            narr = (t.narration or "").upper()
            for kw in ("WALLET_LOAD", "P2P_CRYPTO", "ATM_CASH", "CRYPTO_PURCHASE"):
                if kw in narr:
                    narr_found.append(kw)
                    narr_records.append(t.record_id)
                    narr_tx_ids.append(t.Transaction_ID)

        # Terminal candidate triggered if high retention ratio >= threshold OR explicit terminal off-ramps
        high_retention = (
            total_in > 0
            and retention_ratio >= self.config.terminal_min_retention_ratio
            and len(out_txs) <= len(in_txs)
        )
        is_terminal = high_retention or len(terminal_modes_found) > 0 or len(narr_found) > 0

        supporting_records: list[str] = []
        supporting_txs: list[str] = []
        if high_retention:
            supporting_records.extend([t.record_id for t in in_txs])
            supporting_txs.extend([t.Transaction_ID for t in in_txs])
        supporting_records.extend(mode_records)
        supporting_records.extend(narr_records)
        supporting_txs.extend(mode_tx_ids)
        supporting_txs.extend(narr_tx_ids)

        return {
            "is_detected": is_terminal,
            "high_retention": high_retention,
            "retention_ratio": retention_ratio,
            "total_incoming": round(total_in, 2),
            "total_outgoing": round(total_out, 2),
            "observed_net_flow": round(net_flow, 2),
            "terminal_modes_found": list(set(terminal_modes_found)),
            "terminal_narrations_found": list(set(narr_found)),
            "supporting_record_ids": list(dict.fromkeys(supporting_records)),
            "supporting_transaction_ids": list(dict.fromkeys(supporting_txs)),
            "threshold_configured": {
                "terminal_min_retention_ratio": self.config.terminal_min_retention_ratio,
                "terminal_payment_modes": list(self.config.terminal_payment_modes),
            },
        }

    def detect_dataset_signals(
        self,
        transactions: list[AccountTransactionItem],
    ) -> dict[str, Any]:
        """Detect dataset-specific contextual signals: devices, IP prefixes, and narrations."""
        device_matches: list[str] = []
        device_rec_ids: list[str] = []
        device_tx_ids: list[str] = []

        ip_matches: list[str] = []
        ip_rec_ids: list[str] = []
        ip_tx_ids: list[str] = []

        narr_matches: list[str] = []
        narr_rec_ids: list[str] = []
        narr_tx_ids: list[str] = []

        baseline_narr_count = 0
        baseline_ip_count = 0

        high_risk_devices = set(self.config.high_risk_devices)
        high_risk_ips = self.config.high_risk_ip_prefixes
        baseline_ips = self.config.baseline_ip_prefixes
        high_risk_narrs = self.config.high_risk_narrations
        baseline_narrs = self.config.baseline_narrations

        for t in transactions:
            # Device check
            dev = (t.device_type or "").strip()
            if dev in high_risk_devices:
                device_matches.append(dev)
                device_rec_ids.append(t.record_id)
                device_tx_ids.append(t.Transaction_ID)

            # IP check
            ip = (t.ip_address or "").strip()
            if any(ip.startswith(prefix) for prefix in high_risk_ips):
                ip_matches.append(ip)
                ip_rec_ids.append(t.record_id)
                ip_tx_ids.append(t.Transaction_ID)
            elif any(ip.startswith(prefix) for prefix in baseline_ips):
                baseline_ip_count += 1

            # Narration check
            narr = (t.narration or "").upper().strip()
            if any(hrn in narr for hrn in high_risk_narrs):
                narr_matches.append(narr)
                narr_rec_ids.append(t.record_id)
                narr_tx_ids.append(t.Transaction_ID)
            elif any(bn in narr for bn in baseline_narrs):
                baseline_narr_count += 1

        is_baseline_dominant = (
            (baseline_narr_count > 0 or baseline_ip_count > 0)
            and len(device_matches) == 0
            and len(ip_matches) == 0
            and len(narr_matches) == 0
        )

        return {
            "device_anomaly": {
                "is_detected": len(device_matches) > 0,
                "matches": list(dict.fromkeys(device_matches)),
                "supporting_record_ids": list(dict.fromkeys(device_rec_ids)),
                "supporting_transaction_ids": list(dict.fromkeys(device_tx_ids)),
                "threshold_configured": {"high_risk_devices": list(high_risk_devices)},
            },
            "ip_anomaly": {
                "is_detected": len(ip_matches) > 0,
                "matches": list(dict.fromkeys(ip_matches)),
                "supporting_record_ids": list(dict.fromkeys(ip_rec_ids)),
                "supporting_transaction_ids": list(dict.fromkeys(ip_tx_ids)),
                "threshold_configured": {"high_risk_ip_prefixes": list(high_risk_ips)},
            },
            "narration_pattern": {
                "is_detected": len(narr_matches) > 0,
                "matches": list(dict.fromkeys(narr_matches)),
                "supporting_record_ids": list(dict.fromkeys(narr_rec_ids)),
                "supporting_transaction_ids": list(dict.fromkeys(narr_tx_ids)),
                "threshold_configured": {"high_risk_narrations": list(high_risk_narrs)},
            },
            "is_baseline_dominant": is_baseline_dominant,
            "baseline_narr_count": baseline_narr_count,
            "baseline_ip_count": baseline_ip_count,
        }

    def classify_candidate_layers(
        self,
        fan_in_res: dict[str, Any],
        fan_out_res: dict[str, Any],
        pass_through_res: dict[str, Any],
        smurfing_res: dict[str, Any],
        terminal_res: dict[str, Any],
    ) -> list[LayerClassification]:
        """Evidence-backed candidate layer classification (L1/L2/L3).

        Supports multiple non-exclusive candidate roles when justified by forensic evidence.
        """
        classifications: list[LayerClassification] = []

        # Layer 1: Collector Candidate
        if fan_in_res["is_detected"]:
            sender_count = fan_in_res["distinct_senders_count"]
            in_amt = fan_in_res["incoming_amount"]
            conf = min(1.0, round(0.50 + min(sender_count, 10) * 0.05, 2))
            classifications.append(
                LayerClassification(
                    role="Layer 1 Collector Candidate",
                    confidence=conf,
                    evidence_summary=(
                        f"Aggregated ₹{in_amt:,.2f} from {sender_count} distinct senders across "
                        f"{fan_in_res['incoming_transaction_count']} incoming transactions."
                    ),
                    supporting_record_ids=fan_in_res["supporting_record_ids"],
                )
            )

        # Layer 2: Distributor Candidate
        l2_evidences: list[str] = []
        l2_records: list[str] = []
        l2_weights = 0.0

        if fan_out_res["is_detected"]:
            rec_count = fan_out_res["distinct_receivers_count"]
            out_amt = fan_out_res["outgoing_amount"]
            l2_evidences.append(f"Distributed ₹{out_amt:,.2f} across {rec_count} distinct receivers.")
            l2_records.extend(fan_out_res["supporting_record_ids"])
            l2_weights += 0.40

        if pass_through_res["is_detected"]:
            p = pass_through_res["primary_incident"]
            l2_evidences.append(
                f"Rapid pass-through: {p['percentage']}% dispersed within {p['elapsed_minutes']}m."
            )
            l2_records.extend(pass_through_res["supporting_record_ids"])
            l2_weights += 0.35

        if smurfing_res["is_detected"]:
            p = smurfing_res["primary_incident"]
            l2_evidences.append(
                f"Smurfing: structured splitting into {p['split_count']} downstream payments."
            )
            l2_records.extend(smurfing_res["supporting_record_ids"])
            l2_weights += 0.25

        if l2_evidences:
            conf = min(1.0, round(min(l2_weights, 0.95), 2))
            classifications.append(
                LayerClassification(
                    role="Layer 2 Distributor Candidate",
                    confidence=conf,
                    evidence_summary="; ".join(l2_evidences),
                    supporting_record_ids=list(dict.fromkeys(l2_records)),
                )
            )

        # Layer 3: Terminal Candidate
        if terminal_res["is_detected"]:
            term_reasons: list[str] = []
            if terminal_res["high_retention"]:
                term_reasons.append(
                    f"Retained {terminal_res['retention_ratio']*100:.1f}% of incoming funds (net flow: ₹{terminal_res['observed_net_flow']:,.2f})"
                )
            if terminal_res["terminal_modes_found"]:
                term_reasons.append(f"Terminal payment modes: {', '.join(terminal_res['terminal_modes_found'])}")
            if terminal_res["terminal_narrations_found"]:
                term_reasons.append(
                    f"Terminal narrations: {', '.join(terminal_res['terminal_narrations_found'])}"
                )

            conf = min(1.0, round(max(0.60, terminal_res["retention_ratio"]), 2))
            classifications.append(
                LayerClassification(
                    role="Layer 3 Terminal Candidate",
                    confidence=conf,
                    evidence_summary="; ".join(term_reasons) or "Terminal endpoint indicators observed.",
                    supporting_record_ids=terminal_res["supporting_record_ids"],
                )
            )

        return classifications
