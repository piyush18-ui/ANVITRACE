"""Deterministic amount lineage attribution engine.

Distinguishes between raw graph reachability and conservative financial attribution.
Handles:
- One-to-many splits (e.g. ₹10,000 splits into ₹6,000 and ₹4,000)
- Many-to-one convergences (aggregates attributable inflows without duplicating)
- Double-count prevention across converging paths
- Lineage classification: 'traced', 'attributed', 'estimated', 'unresolved'
"""

from typing import Any

from app.schemas.graph import MoneyTrailEdge


class AmountLineageEngine:
    """Calculates path-aware attributable amounts and assigns evidence-linked lineage statuses."""

    @staticmethod
    def calculate_lineage(
        victim_amount: float,
        traversal_edges: list[dict[str, Any]],
    ) -> list[MoneyTrailEdge]:
        """Process chronological traversal edges to assign conservative attributable amounts.

        Algorithm:
        1. Maintain an `available_funds` map: account -> float (attributable funds residing in account).
        2. Set victim_account available funds = victim_amount.
        3. For each edge (from_account -> to_account, raw_amount, hop):
           - Inflow attributable available at from_account: avail = available_funds.get(from_account, 0.0)
           - Outgoing raw amount: raw = raw_amount
           - If avail <= 0:
               attributable = 0.0, status = 'unresolved'
           - If raw <= avail:
               attributable = raw
               status = 'traced' if hop == 1 else 'attributed'
               available_funds[from_account] -= raw
               available_funds[to_account] = available_funds.get(to_account, 0.0) + raw
           - If raw > avail:
               attributable = round(avail, 2)
               status = 'attributed' if attributable > 0 else 'unresolved'
               available_funds[from_account] = 0.0
               available_funds[to_account] = available_funds.get(to_account, 0.0) + attributable
        4. Wrap in MoneyTrailEdge dataclass with cycle and provenance indicators.
        """
        if not traversal_edges or victim_amount <= 0:
            return []

        # Find initial sender from first hop
        first_edge = traversal_edges[0]
        victim_account = first_edge["from_account"]

        available_funds: dict[str, float] = {victim_account: float(victim_amount)}
        lineage_edges: list[MoneyTrailEdge] = []

        # Track total funds attributed to prevent any possibility of exceeding original victim amount
        for edge_dict in traversal_edges:
            from_acc = edge_dict["from_account"]
            to_acc = edge_dict["to_account"]
            raw_amt = float(edge_dict["amount"])
            hop = edge_dict["hop"]
            is_cycle = edge_dict.get("is_cycle", False)

            avail = available_funds.get(from_acc, 0.0)

            if is_cycle:
                # In a cycle, funds cannot be repeatedly attributed downstream
                attributable = 0.0
                status = "unresolved"
            elif avail <= 0.001:
                # No attributable victim funds available at this hop
                attributable = 0.0
                status = "unresolved"
            elif raw_amt <= avail:
                # Full raw amount is covered by available victim funds
                attributable = raw_amt
                status = "traced" if hop == 1 else "attributed"
                available_funds[from_acc] = round(avail - raw_amt, 2)
                available_funds[to_acc] = round(available_funds.get(to_acc, 0.0) + raw_amt, 2)
            else:
                # Partial attribution: transaction is larger than remaining victim funds
                attributable = round(avail, 2)
                status = "attributed"
                available_funds[from_acc] = 0.0
                available_funds[to_acc] = round(available_funds.get(to_acc, 0.0) + attributable, 2)

            lineage_edges.append(
                MoneyTrailEdge(
                    hop=hop,
                    record_id=edge_dict["record_id"],
                    Transaction_ID=edge_dict["Transaction_ID"],
                    from_account=from_acc,
                    to_account=to_acc,
                    amount=raw_amt,
                    timestamp=edge_dict["timestamp"],
                    payment_mode=edge_dict["payment_mode"],
                    attributable_amount=attributable,
                    lineage_status=status,
                    is_cycle=is_cycle,
                    parent_record_id=edge_dict.get("parent_record_id"),
                    provenance=edge_dict.get("provenance", {}),
                )
            )

        return lineage_edges
