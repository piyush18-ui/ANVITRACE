"""Account repository for analytical lookups and timeline reconstruction."""

from datetime import datetime
from typing import Any

import duckdb

from app.schemas.account import (
    AccountSummaryResponse,
    AccountTransactionItem,
    AccountTransactionsResponse,
)


class AccountRepository:
    """Provides high-performance account-centric queries using DuckDB and indexed features."""

    def __init__(self, conn: duckdb.DuckDBPyConnection):
        self.conn = conn

    def get_account_profile(self, account_id: str, dataset_id: str) -> AccountSummaryResponse | None:
        """Fetch precomputed account features and summary profile."""
        clean_acc = account_id.strip()
        result = self.conn.execute(
            """
            SELECT
                account_id,
                dataset_id,
                in_tx_count,
                out_tx_count,
                in_amount,
                out_amount,
                distinct_senders,
                distinct_receivers,
                first_tx_timestamp,
                last_tx_timestamp
            FROM account_features
            WHERE account_id = ? AND dataset_id = ?
            """,
            [clean_acc, dataset_id],
        ).fetchone()

        if not result:
            # Fallback: check if account exists in transactions
            tx_check = self.conn.execute(
                """
                SELECT 1 FROM transactions
                WHERE (Sender_Account = ? OR Receiver_Account = ?) AND dataset_id = ?
                LIMIT 1
                """,
                [clean_acc, clean_acc, dataset_id],
            ).fetchone()
            if not tx_check:
                return None
            return AccountSummaryResponse(
                account_id=clean_acc,
                dataset_id=dataset_id,
                in_tx_count=0,
                out_tx_count=0,
                in_amount=0.0,
                out_amount=0.0,
                net_flow=0.0,
                distinct_senders=0,
                distinct_receivers=0,
            )

        in_amt = float(result[4] or 0.0)
        out_amt = float(result[5] or 0.0)
        net_flow = round(in_amt - out_amt, 2)

        return AccountSummaryResponse(
            account_id=result[0],
            dataset_id=result[1],
            in_tx_count=result[2],
            out_tx_count=result[3],
            in_amount=in_amt,
            out_amount=out_amt,
            net_flow=net_flow,
            observed_net_flow=net_flow,
            distinct_senders=result[6],
            distinct_receivers=result[7],
            first_tx_timestamp=result[8],
            last_tx_timestamp=result[9],
        )

    def get_account_transactions(
        self,
        account_id: str,
        dataset_id: str,
        limit: int = 1000,
        direction_filter: str | None = None,
    ) -> AccountTransactionsResponse:
        """Reconstruct chronological transaction timeline for an account."""
        clean_acc = account_id.strip()

        # Build union query for IN and OUT transactions
        query = """
            SELECT
                record_id,
                Transaction_ID,
                direction,
                counterparty_account,
                amount,
                timestamp,
                payment_mode,
                narration,
                ip_address,
                device_type,
                validation_status
            FROM (
                SELECT
                    record_id,
                    Transaction_ID,
                    'OUT' as direction,
                    Receiver_Account as counterparty_account,
                    CAST(Amount AS DOUBLE) as amount,
                    Timestamp as timestamp,
                    Payment_Mode as payment_mode,
                    Narration as narration,
                    IP_Address as ip_address,
                    Device_Type as device_type,
                    validation_status
                FROM transactions
                WHERE Sender_Account = ? AND dataset_id = ?
                UNION ALL
                SELECT
                    record_id,
                    Transaction_ID,
                    'IN' as direction,
                    Sender_Account as counterparty_account,
                    CAST(Amount AS DOUBLE) as amount,
                    Timestamp as timestamp,
                    Payment_Mode as payment_mode,
                    Narration as narration,
                    IP_Address as ip_address,
                    Device_Type as device_type,
                    validation_status
                FROM transactions
                WHERE Receiver_Account = ? AND dataset_id = ?
            )
        """
        params: list[Any] = [clean_acc, dataset_id, clean_acc, dataset_id]

        if direction_filter in ("IN", "OUT"):
            query += " WHERE direction = ?"
            params.append(direction_filter)

        query += " ORDER BY timestamp ASC, record_id ASC LIMIT ?"
        params.append(limit)

        rows = self.conn.execute(query, params).fetchall()

        items = [
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
            for r in rows
        ]

        return AccountTransactionsResponse(
            account_id=clean_acc,
            dataset_id=dataset_id,
            total_transactions=len(items),
            transactions=items,
        )

    def get_all_account_transactions(
        self,
        account_id: str,
        dataset_id: str,
    ) -> list[AccountTransactionItem]:
        """Reconstruct full chronological transaction timeline for an account without truncation."""
        res = self.get_account_transactions(
            account_id=account_id,
            dataset_id=dataset_id,
            limit=50000,
        )
        return res.transactions

    def get_positive_net_flow_accounts(
        self,
        dataset_id: str,
        min_net_flow: float = 0.01,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        """Retrieve accounts with positive observed net flow strictly within the dataset scope,
        ranked by behavioral fraud and mule indicators (fan-in, fan-out, pass-through velocity).
        """
        query = """
            SELECT
                account_id,
                in_amount,
                out_amount,
                (in_amount - out_amount) AS observed_net_flow,
                first_tx_timestamp,
                last_tx_timestamp
            FROM account_features
            WHERE dataset_id = ? AND in_amount > 0 AND (in_amount - out_amount) >= ?
            ORDER BY
                (
                    CASE WHEN distinct_senders >= 3 THEN 30.0 WHEN distinct_senders >= 2 THEN 15.0 ELSE 0.0 END
                    + CASE WHEN distinct_receivers >= 3 THEN 30.0 WHEN distinct_receivers >= 2 THEN 15.0 ELSE 0.0 END
                    + CASE WHEN in_tx_count > 0 AND out_tx_count > 0 THEN 25.0 ELSE 0.0 END
                    + CASE WHEN (in_amount - out_amount) >= ? THEN 15.0 ELSE 0.0 END
                ) DESC,
                (in_amount + out_amount) DESC
            LIMIT ?
        """
        rows = self.conn.execute(query, [dataset_id, min_net_flow, min_net_flow, limit]).fetchall()
        return [
            {
                "account_id": r[0],
                "in_amount": float(r[1]),
                "out_amount": float(r[2]),
                "observed_net_flow": float(r[3]),
                "first_tx_timestamp": r[4],
                "last_tx_timestamp": r[5],
            }
            for r in rows
        ]

