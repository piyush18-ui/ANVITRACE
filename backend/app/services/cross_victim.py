"""Cross-victim shared infrastructure correlation analysis.

Adheres strictly to candidate linkage terminology:
- Identifies common downstream accounts reached from multiple victim accounts
- Pinpoints exact connecting transactions
- Uncovers shared device types and anomalous IP addresses
- Assigns candidate layer roles and evidence-backed linkage rationales
- Uses candidate terminology and avoids asserting criminal syndicate guilt
"""

from datetime import datetime
from typing import Any

import duckdb

from app.algorithms.mule_detection import MuleDetectionEngine
from app.algorithms.temporal_traversal import TemporalTraversalEngine
from app.indexes.manager import ForensicIndexManager
from app.schemas.syndicate import (
    ConnectingTransaction,
    CrossVictimAnalysisRequest,
    CrossVictimAnalysisResponse,
    SharedInfrastructureCandidate,
)
from app.utils.logging import log_event, logger


class CrossVictimService:
    """Discovers shared infrastructure candidates across multi-victim money trails."""

    def __init__(self, conn: duckdb.DuckDBPyConnection):
        self.conn = conn
        self.detection_engine = MuleDetectionEngine()

    def analyze_cross_victim_infrastructure(
        self,
        request: CrossVictimAnalysisRequest,
    ) -> CrossVictimAnalysisResponse:
        """Trace downstream trails from each victim and identify shared infrastructure nodes."""
        dataset_id = request.dataset_id
        if not dataset_id:
            # Pick latest
            res = self.conn.execute("SELECT dataset_id FROM datasets ORDER BY uploaded_at DESC LIMIT 1").fetchone()
            dataset_id = res[0] if res else "default"

        max_hops = min(request.max_hops, 4)
        clean_victims = [v.strip() for v in request.victim_accounts]

        logger.info(
            f"Executing cross-victim analysis for {len(clean_victims)} victims in dataset {dataset_id} (depth: {max_hops})"
        )

        index_manager = ForensicIndexManager(dataset_id)
        traversal_engine = TemporalTraversalEngine(
            conn=self.conn,
            index_manager=index_manager,
            dataset_id=dataset_id,
        )

        # Mapping: victim -> list of edges
        victim_edges: dict[str, list[dict[str, Any]]] = {}
        # Mapping: account_id -> set of victims reaching it
        reached_by: dict[str, set[str]] = {}
        # Mapping: account_id -> list of ConnectingTransaction
        connecting_txs_map: dict[str, list[ConnectingTransaction]] = {}
        # Mapping: account_id -> total flowing amount
        flowing_amounts_map: dict[str, float] = {}

        # Global correlations
        device_to_accounts: dict[str, set[str]] = {}
        ip_to_accounts: dict[str, set[str]] = {}

        for victim in clean_victims:
            _, edges = traversal_engine.traverse_four_hops(
                victim_account=victim,
                max_hops=max_hops,
            )
            victim_edges[victim] = edges

            # Extract devices and IPs for these edges from DuckDB
            if edges:
                rec_ids = [e["record_id"] for e in edges]
                rec_list_sql = ", ".join(f"'{r}'" for r in rec_ids)
                rows = self.conn.execute(
                    f"""
                    SELECT record_id, IP_Address, Device_Type
                    FROM transactions
                    WHERE record_id IN ({rec_list_sql}) AND dataset_id = ?
                    """,
                    [dataset_id],
                ).fetchall()
                tx_meta = {r[0]: {"ip": r[1], "device": r[2]} for r in rows}
            else:
                tx_meta = {}

            # Process edges
            for edge in edges:
                to_acc = edge["to_account"]
                from_acc = edge["from_account"]
                hop = edge["hop"]
                rec_id = edge["record_id"]
                tx_id = edge["Transaction_ID"]
                amt = float(edge["amount"])
                ts = edge["timestamp"]
                mode = edge["payment_mode"]

                meta = tx_meta.get(rec_id, {})
                dev = meta.get("device")
                ip = meta.get("ip")

                if dev and dev not in ("UNKNOWN", ""):
                    device_to_accounts.setdefault(dev, set()).add(to_acc)
                    device_to_accounts[dev].add(from_acc)
                if ip and ip != "":
                    ip_to_accounts.setdefault(ip, set()).add(to_acc)
                    ip_to_accounts[ip].add(from_acc)

                # Track destination accounts
                reached_by.setdefault(to_acc, set()).add(victim)
                flowing_amounts_map[to_acc] = round(flowing_amounts_map.get(to_acc, 0.0) + amt, 2)

                conn_tx = ConnectingTransaction(
                    record_id=rec_id,
                    Transaction_ID=tx_id,
                    victim_account=victim,
                    from_account=from_acc,
                    to_account=to_acc,
                    amount=amt,
                    timestamp=ts,
                    payment_mode=mode,
                    hop_level=hop,
                )
                connecting_txs_map.setdefault(to_acc, []).append(conn_tx)

        # Candidates are accounts reached by >= 2 distinct victims
        candidates: list[SharedInfrastructureCandidate] = []

        for acc, victims in reached_by.items():
            # Exclude accounts if they are the victim itself unless reached from another victim
            if len(victims) >= 2:
                conn_txs = connecting_txs_map.get(acc, [])
                total_amt = flowing_amounts_map.get(acc, 0.0)

                # Get devices and IPs associated with this candidate account
                cand_devices = {
                    dev for dev, accs in device_to_accounts.items() if acc in accs
                }
                cand_ips = {
                    ip for ip, accs in ip_to_accounts.items() if acc in accs
                }

                # Evaluate layer roles for this candidate
                # Query direct transactions to determine candidate layer
                cand_tx_rows = self.conn.execute(
                    """
                    SELECT
                        record_id, Transaction_ID, 'IN' as dir, Sender_Account, Amount, Timestamp, Payment_Mode, Narration, IP_Address, Device_Type, validation_status
                    FROM transactions WHERE Receiver_Account = ? AND dataset_id = ?
                    UNION ALL
                    SELECT
                        record_id, Transaction_ID, 'OUT' as dir, Receiver_Account, Amount, Timestamp, Payment_Mode, Narration, IP_Address, Device_Type, validation_status
                    FROM transactions WHERE Sender_Account = ? AND dataset_id = ?
                    ORDER BY Timestamp ASC LIMIT 500
                    """,
                    [acc, dataset_id, acc, dataset_id],
                ).fetchall()

                from app.schemas.account import AccountTransactionItem
                cand_tx_items = [
                    AccountTransactionItem(
                        record_id=r[0],
                        Transaction_ID=r[1],
                        direction=r[2],
                        counterparty_account=r[3],
                        amount=float(r[4]),
                        timestamp=r[5] if isinstance(r[5], datetime) else datetime.fromisoformat(str(r[5])),
                        payment_mode=r[6],
                        narration=r[7],
                        ip_address=r[8],
                        device_type=r[9],
                        validation_status=r[10],
                    )
                    for r in cand_tx_rows
                ]

                fan_in = self.detection_engine.detect_fan_in(cand_tx_items)
                fan_out = self.detection_engine.detect_fan_out(cand_tx_items)
                pt = self.detection_engine.detect_rapid_pass_through(cand_tx_items)
                sm = self.detection_engine.detect_smurfing(cand_tx_items)
                term = self.detection_engine.detect_terminal_indicators(cand_tx_items)
                layers = self.detection_engine.classify_candidate_layers(fan_in, fan_out, pt, sm, term)
                layer_roles = [layer.role for layer in layers]

                hops_seen = sorted({tx.hop_level for tx in conn_txs})
                hops_str = ", ".join(str(h) for h in hops_seen)
                victims_sorted = sorted(victims)

                rationale = (
                    f"Candidate shared infrastructure: Account {acc} receives or channels funds originating "
                    f"from {len(victims_sorted)} distinct victim accounts ({', '.join(victims_sorted)}) "
                    f"at hop distance(s) [{hops_str}], with total flowing volume of ₹{total_amt:,.2f}."
                )

                candidates.append(
                    SharedInfrastructureCandidate(
                        candidate_account_id=acc,
                        connected_victim_accounts=victims_sorted,
                        victim_count=len(victims_sorted),
                        shared_device_types=sorted(cand_devices),
                        shared_ip_addresses=sorted(cand_ips),
                        connecting_transactions=conn_txs,
                        total_flowing_amount=total_amt,
                        candidate_layer_roles=layer_roles,
                        linkage_rationale=rationale,
                    )
                )

        # Sort candidates descending by victim count, then total flowing amount
        candidates.sort(key=lambda x: (x.victim_count, x.total_flowing_amount), reverse=True)

        # Convert set to sorted list for response
        dev_corr = {k: sorted(v) for k, v in device_to_accounts.items() if len(v) > 1}
        ip_corr = {k: sorted(v) for k, v in ip_to_accounts.items() if len(v) > 1}

        log_event(
            "CROSS_VICTIM_ANALYSIS_COMPLETED",
            dataset_id=dataset_id,
            victims_analyzed=len(clean_victims),
            candidates_found=len(candidates),
        )

        return CrossVictimAnalysisResponse(
            dataset_id=dataset_id,
            analyzed_victims=clean_victims,
            shared_infrastructure_candidates=candidates,
            shared_device_correlations=dev_corr,
            shared_ip_correlations=ip_corr,
            candidate_linkage_disclaimer=(
                "Candidate linkage terminology: These correlations identify shared infrastructure candidate "
                "indicators for forensic hypothesis testing. They do not constitute conclusive proof of a "
                "coordinated criminal syndicate."
            ),
        )
