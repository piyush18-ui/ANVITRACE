"""Deterministic temporal graph traversal algorithm bounded strictly to 4 hops.

Rules enforced:
1. max_depth = 4 (strictly rejected/not traversed beyond hop 4).
2. Temporal continuity: outgoing transactions at hop n must occur chronologically
   at or after the incoming transaction timestamp (t_out >= t_in).
3. Optional time_window_hours bound.
4. Path-aware cycle detection: cyclic branches are bounded and marked without
   globally discarding valid occurrences of accounts in alternative paths.
5. Index-accelerated: utilizes Parquet adjacency index or DuckDB index lookups.
"""

from collections import deque
from datetime import datetime, timedelta
from typing import Any

import duckdb

from app.indexes.manager import ForensicIndexManager


class PathState:
    """Represents the forensic path state during graph expansion."""

    __slots__ = (
        "current_account",
        "hop",
        "incoming_timestamp",
        "parent_record_id",
        "path_accounts",
        "path_record_ids",
    )

    def __init__(
        self,
        current_account: str,
        hop: int,
        parent_record_id: str | None,
        incoming_timestamp: datetime,
        path_accounts: tuple[str, ...],
        path_record_ids: tuple[str, ...],
    ):
        self.current_account = current_account
        self.hop = hop
        self.parent_record_id = parent_record_id
        self.incoming_timestamp = incoming_timestamp
        self.path_accounts = path_accounts
        self.path_record_ids = path_record_ids


class TemporalTraversalEngine:
    """Executes deterministic bounded BFS graph traversal from a starting transaction."""

    def __init__(
        self,
        conn: duckdb.DuckDBPyConnection,
        index_manager: ForensicIndexManager,
        dataset_id: str,
    ):
        self.conn = conn
        self.index_manager = index_manager
        self.dataset_id = dataset_id

    def traverse_four_hops(
        self,
        victim_account: str,
        initial_tx_id: str | None = None,
        max_hops: int = 4,
        time_window_hours: float | None = None,
        min_amount: float | None = None,
    ) -> tuple[dict[str, Any] | None, list[dict[str, Any]]]:
        """Execute bounded 4-hop temporal graph traversal.

        Returns (victim_transaction_dict, ordered_traversal_edges).
        """
        # Hard cap: never expand beyond depth 4
        effective_max_hops = min(max_hops, 4)

        # 1. Identify starting victim transaction
        victim_tx = self._get_initial_transaction(victim_account, initial_tx_id)
        if not victim_tx:
            return None, []

        start_ts = victim_tx["timestamp"]
        cutoff_ts = start_ts + timedelta(hours=time_window_hours) if time_window_hours else None

        queue: deque[PathState] = deque()
        traversal_edges: list[dict[str, Any]] = []
        visited_edges_by_hop: set[tuple[int, str]] = set()

        # Hop 1 seed: from victim account to beneficiary account(s)
        if initial_tx_id or victim_tx["Sender_Account"] != victim_account:
            seed_txs = [victim_tx] if victim_tx["Sender_Account"] == victim_account else []
        else:
            outgoing_candidates = self._fetch_outgoing_candidates(victim_account)
            seed_txs = [
                c for c in outgoing_candidates
                if c["timestamp"] >= start_ts and (not cutoff_ts or c["timestamp"] <= cutoff_ts)
                and (not min_amount or c["amount"] >= min_amount)
            ]
            if not seed_txs and victim_tx["Sender_Account"] == victim_account:
                seed_txs = [victim_tx]

        for tx in seed_txs:
            to_acc = tx.get("to_account") or tx.get("Receiver_Account")
            amt = float(tx.get("amount", tx.get("Amount", 0.0)))
            ts = tx.get("timestamp")
            rec_id = tx.get("record_id")
            tx_id = tx.get("Transaction_ID")
            pm = tx.get("payment_mode", tx.get("Payment_Mode", "TRANSFER"))

            hop1_edge = {
                "hop": 1,
                "record_id": rec_id,
                "Transaction_ID": tx_id,
                "from_account": victim_account,
                "to_account": to_acc,
                "amount": amt,
                "timestamp": ts,
                "payment_mode": pm,
                "is_cycle": False,
                "parent_record_id": None,
                "provenance": {"source_row": tx.get("source_row"), "dataset_id": self.dataset_id},
            }
            traversal_edges.append(hop1_edge)
            visited_edges_by_hop.add((1, rec_id))

            # Enqueue destination for hop 2 expansion if depth allows
            if effective_max_hops >= 2:
                queue.append(
                    PathState(
                        current_account=to_acc,
                        hop=2,
                        parent_record_id=rec_id,
                        incoming_timestamp=ts,
                        path_accounts=(victim_account, to_acc),
                        path_record_ids=(rec_id,),
                    )
                )

        # Cache outgoing lookups per account for performance
        outgoing_cache: dict[str, list[dict[str, Any]]] = {}

        # 2. BFS Traversal
        while queue:
            state = queue.popleft()

            # Enforce strict maximum depth: NEVER expand beyond effective_max_hops
            if state.hop > effective_max_hops:
                continue

            current_acc = state.current_account
            if current_acc not in outgoing_cache:
                outgoing_cache[current_acc] = self._fetch_outgoing_candidates(current_acc)

            candidates = outgoing_cache[current_acc]

            for candidate in candidates:
                cand_ts = candidate["timestamp"]
                cand_rec_id = candidate["record_id"]
                cand_to = candidate["to_account"]
                cand_amt = float(candidate["amount"])

                # Convergence check: do not duplicate identical physical transaction in output for the same hop
                if (state.hop, cand_rec_id) in visited_edges_by_hop:
                    continue

                # Rule 1: Temporal filter (must be >= incoming timestamp)
                if cand_ts < state.incoming_timestamp:
                    continue

                # Rule 2: Time window filter
                if cutoff_ts and cand_ts > cutoff_ts:
                    continue

                # Rule 3: Minimum amount filter
                if min_amount and cand_amt < min_amount:
                    continue

                # Rule 4: Cycle detection along the current path
                is_cycle = cand_to in state.path_accounts

                edge_dict = {
                    "hop": state.hop,
                    "record_id": cand_rec_id,
                    "Transaction_ID": candidate["Transaction_ID"],
                    "from_account": current_acc,
                    "to_account": cand_to,
                    "amount": cand_amt,
                    "timestamp": cand_ts,
                    "payment_mode": candidate["payment_mode"],
                    "is_cycle": is_cycle,
                    "parent_record_id": state.parent_record_id,
                    "provenance": {"dataset_id": self.dataset_id},
                }
                traversal_edges.append(edge_dict)
                visited_edges_by_hop.add((state.hop, cand_rec_id))

                # Do not expand further from cycles or if already at max depth
                if not is_cycle and state.hop < effective_max_hops:
                    queue.append(
                        PathState(
                            current_account=cand_to,
                            hop=state.hop + 1,
                            parent_record_id=cand_rec_id,
                            incoming_timestamp=cand_ts,
                            path_accounts=(*state.path_accounts, cand_to),
                            path_record_ids=(*state.path_record_ids, cand_rec_id),
                        )
                    )

        return victim_tx, traversal_edges

    def _get_initial_transaction(
        self,
        victim_account: str,
        initial_tx_id: str | None = None,
    ) -> dict[str, Any] | None:
        """Find victim transaction in DuckDB."""
        if initial_tx_id:
            row = self.conn.execute(
                """
                SELECT record_id, Transaction_ID, Sender_Account, Receiver_Account,
                       Amount, Timestamp, Payment_Mode, source_row
                FROM transactions
                WHERE (Transaction_ID = ? OR record_id = ?) AND dataset_id = ?
                ORDER BY Timestamp ASC LIMIT 1
                """,
                [initial_tx_id, initial_tx_id, self.dataset_id],
            ).fetchone()
        else:
            row = self.conn.execute(
                """
                SELECT record_id, Transaction_ID, Sender_Account, Receiver_Account,
                       Amount, Timestamp, Payment_Mode, source_row
                FROM transactions
                WHERE Sender_Account = ? AND dataset_id = ?
                ORDER BY Timestamp ASC LIMIT 1
                """,
                [victim_account, self.dataset_id],
            ).fetchone()

        if not row:
            row = self.conn.execute(
                """
                SELECT record_id, Transaction_ID, Sender_Account, Receiver_Account,
                       Amount, Timestamp, Payment_Mode, source_row
                FROM transactions
                WHERE Receiver_Account = ? AND dataset_id = ?
                ORDER BY Timestamp ASC LIMIT 1
                """,
                [victim_account, self.dataset_id],
            ).fetchone()

        if not row:
            return None

        ts = row[5] if isinstance(row[5], datetime) else datetime.fromisoformat(str(row[5]))
        return {
            "record_id": row[0],
            "Transaction_ID": row[1],
            "Sender_Account": row[2],
            "Receiver_Account": row[3],
            "Amount": float(row[4]),
            "timestamp": ts,
            "Payment_Mode": row[6],
            "source_row": row[7],
        }

    def get_incoming_transactions(self, account_id: str) -> list[dict[str, Any]]:
        """Fetch all incoming transactions where funds were transferred to this account."""
        rows = self.conn.execute(
            """
            SELECT record_id, Transaction_ID, Sender_Account, Receiver_Account,
                   CAST(Amount AS DOUBLE), Timestamp, Payment_Mode, source_row
            FROM transactions
            WHERE Receiver_Account = ? AND dataset_id = ?
            ORDER BY Timestamp ASC
            """,
            [account_id, self.dataset_id],
        ).fetchall()
        inflows = []
        for r in rows:
            ts = r[5] if isinstance(r[5], datetime) else datetime.fromisoformat(str(r[5]))
            inflows.append(
                {
                    "record_id": r[0],
                    "Transaction_ID": r[1],
                    "from_account": r[2],
                    "to_account": r[3],
                    "amount": float(r[4]),
                    "timestamp": ts,
                    "payment_mode": r[6],
                    "source_row": r[7],
                    "direction": "upstream",
                    "hop": 1,
                    "is_cycle": False,
                    "parent_record_id": None,
                    "provenance": {"source_row": r[7], "dataset_id": self.dataset_id},
                }
            )
        return inflows

    def _fetch_outgoing_candidates(self, account_id: str) -> list[dict[str, Any]]:
        """Fetch outgoing candidate edges using indexed Parquet scan or DuckDB fallback."""
        # 1. Try Parquet index
        edges_df = self.index_manager.get_outgoing_edges(account_id)
        if not edges_df.is_empty():
            candidates: list[dict[str, Any]] = []
            for r in edges_df.iter_rows(named=True):
                ts = r["Timestamp"]
                if not isinstance(ts, datetime):
                    ts = datetime.fromisoformat(str(ts))
                candidates.append(
                    {
                        "record_id": r["record_id"],
                        "Transaction_ID": r["Transaction_ID"],
                        "to_account": r["counterparty_account"],
                        "amount": float(r["Amount"]),
                        "timestamp": ts,
                        "payment_mode": r["Payment_Mode"],
                    }
                )
            return candidates

        # 2. DuckDB fallback (using idx_tx_sender_acc)
        rows = self.conn.execute(
            """
            SELECT record_id, Transaction_ID, Receiver_Account, CAST(Amount AS DOUBLE),
                   Timestamp, Payment_Mode
            FROM transactions
            WHERE Sender_Account = ? AND dataset_id = ?
            ORDER BY Timestamp ASC
            """,
            [account_id, self.dataset_id],
        ).fetchall()

        candidates = []
        for r in rows:
            ts = r[4] if isinstance(r[4], datetime) else datetime.fromisoformat(str(r[4]))
            candidates.append(
                {
                    "record_id": r[0],
                    "Transaction_ID": r[1],
                    "to_account": r[2],
                    "amount": float(r[3]),
                    "timestamp": ts,
                    "payment_mode": r[5],
                }
            )
        return candidates
