"""Tamper-evident audit log with HMAC-SHA256 hash chaining.

CRITICAL ARCHITECTURE CONSTRAINTS:
- Append-only at the application level: NEVER issue UPDATE or DELETE against audit_log.
- Thread-safe via process-level re-entrant lock (app must run with a single uvicorn worker).
- Fail-fast at startup if AUDIT_KEY is missing.
- Genesis entry prev_hash is 64 zeros ('0' * 64).
"""

from __future__ import annotations

import decimal
import hashlib
import hmac
import json
import os
import threading
from datetime import datetime
from typing import Any

import duckdb

from app.config.settings import settings

GENESIS_PREV_HASH = "0" * 64
_audit_lock = threading.Lock()


class CanonicalJSONEncoder(json.JSONEncoder):
    """Deterministic JSON encoder preserving precision and order."""

    def default(self, o: Any) -> Any:
        if isinstance(o, (datetime,)):
            return o.isoformat()
        if isinstance(o, decimal.Decimal):
            return str(o)
        if hasattr(o, "__dict__"):
            return o.__dict__
        return super().default(o)


def canonical(obj: Any) -> str:
    """Format object as deterministic, canonical JSON string.

    Rules:
    - Keys sorted alphabetically.
    - Compact separators (",", ":") with no arbitrary whitespace.
    - ensure_ascii=False (supports Unicode strings without escaping).
    - Decimals formatted as string to prevent IEEE 754 float drift.
    """
    return json.dumps(
        obj,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        cls=CanonicalJSONEncoder,
    )


def get_audit_key() -> str:
    """Retrieve AUDIT_KEY from environment or settings. Fails fast if missing."""
    key = os.environ.get("AUDIT_KEY") or settings.AUDIT_KEY
    if not key or not str(key).strip():
        raise RuntimeError(
            "AUDIT_KEY environment variable is missing. "
            "Tamper-evident audit logging requires a non-empty cryptographic secret key."
        )
    return str(key).strip()


def compute_entry_hash(
    seq: int,
    ts: str,
    actor: str,
    action: str,
    entity_type: str,
    entity_id: str,
    details_str: str,
    prev_hash: str,
    audit_key: str,
) -> str:
    """Calculate HMAC-SHA256 entry hash over canonical tuple."""
    # Ensure details string itself is canonical
    try:
        parsed = json.loads(details_str)
        canon_details = canonical(parsed)
    except Exception:
        canon_details = details_str

    payload = f"{seq}|{ts}|{actor}|{action}|{entity_type}|{entity_id}|{canon_details}|{prev_hash}"
    return hmac.new(
        audit_key.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


class AuditService:
    """Manages append-only HMAC-SHA256 chained audit logs in DuckDB."""

    def __init__(self, conn: duckdb.DuckDBPyConnection):
        self.conn = conn

    def get_latest_entry_hash(self) -> str:
        """Fetch the most recent entry_hash from the audit log, or return genesis hash."""
        row = self.conn.execute(
            "SELECT entry_hash FROM audit_log ORDER BY seq DESC LIMIT 1"
        ).fetchone()
        return row[0] if row and row[0] else GENESIS_PREV_HASH

    def append_event(
        self,
        action: str,
        entity_type: str,
        entity_id: str,
        details: dict[str, Any] | None = None,
        actor: str = "system",
        ts: datetime | None = None,
    ) -> dict[str, Any]:
        """Atomically append a new event to the audit log chain under process lock."""
        if isinstance(details, str) and isinstance(actor, dict):
            actor, details = details, actor
        details = details or {}
        audit_key = get_audit_key()
        event_ts = ts or datetime.utcnow()
        ts_str = event_ts.strftime("%Y-%m-%d %H:%M:%S.%f")
        canon_details = canonical(details)

        with _audit_lock:
            # 1. Fetch current max sequence and previous hash
            row = self.conn.execute(
                "SELECT COALESCE(MAX(seq), 0), (SELECT entry_hash FROM audit_log ORDER BY seq DESC LIMIT 1) FROM audit_log"
            ).fetchone()
            max_seq = int(row[0]) if row and row[0] is not None else 0
            prev_hash = row[1] if row and row[1] else GENESIS_PREV_HASH

            next_seq = max_seq + 1

            # 2. Compute HMAC-SHA256 entry hash
            entry_hash = compute_entry_hash(
                seq=next_seq,
                ts=ts_str,
                actor=actor,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                details_str=canon_details,
                prev_hash=prev_hash,
                audit_key=audit_key,
            )

            # 3. Append to DuckDB (NEVER update or delete)
            escaped_details = canon_details.replace("'", "''")
            self.conn.execute(
                f"""
                INSERT INTO audit_log (seq, ts, actor, action, entity_type, entity_id, details, prev_hash, entry_hash)
                VALUES (
                    {next_seq},
                    TIMESTAMP '{ts_str}',
                    '{actor.replace("'", "''")}',
                    '{action.replace("'", "''")}',
                    '{entity_type.replace("'", "''")}',
                    '{entity_id.replace("'", "''")}',
                    '{escaped_details}',
                    '{prev_hash}',
                    '{entry_hash}'
                )
                """
            )

            return {
                "seq": next_seq,
                "ts": ts_str,
                "actor": actor,
                "action": action,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "details": details,
                "prev_hash": prev_hash,
                "entry_hash": entry_hash,
            }

    def verify_audit_chain(self) -> dict[str, Any]:
        """Verify the cryptographic integrity of the entire audit log chain.

        Returns:
            { "ok": True, "last_hash": str, "total_events": int }
            or
            { "ok": False, "broken_at_seq": int, "reason": str, "expected_hash": str, "actual_hash": str }
        """
        audit_key = get_audit_key()
        rows = self.conn.execute(
            """
            SELECT seq, strftime(ts, '%Y-%m-%d %H:%M:%S.%f'), actor, action, entity_type, entity_id, details, prev_hash, entry_hash
            FROM audit_log
            ORDER BY seq ASC
            """
        ).fetchall()

        if not rows:
            return {
                "ok": True,
                "last_hash": GENESIS_PREV_HASH,
                "total_events": 0,
                "status": "EMPTY",
                "message": "Audit chain is empty and initialized with genesis state.",
            }

        expected_prev_hash = GENESIS_PREV_HASH

        for row in rows:
            seq = int(row[0])
            ts_str = str(row[1])
            actor = str(row[2])
            action = str(row[3])
            entity_type = str(row[4])
            entity_id = str(row[5])
            details_str = str(row[6])
            prev_hash = str(row[7])
            entry_hash = str(row[8])

            # 1. Verify prev_hash linkage
            if not hmac.compare_digest(prev_hash, expected_prev_hash):
                reason = f"Hash linkage broken at sequence #{seq}: prev_hash does not match preceding entry_hash."
                return {
                    "ok": False,
                    "broken_at_seq": seq,
                    "reason": reason,
                    "message": reason,
                    "expected_prev_hash": expected_prev_hash,
                    "actual_prev_hash": prev_hash,
                }

            # 2. Recompute entry HMAC-SHA256
            recomputed = compute_entry_hash(
                seq=seq,
                ts=ts_str,
                actor=actor,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                details_str=details_str,
                prev_hash=prev_hash,
                audit_key=audit_key,
            )

            if not hmac.compare_digest(recomputed, entry_hash):
                reason = f"Cryptographic integrity failed at sequence #{seq}: payload contents modified."
                return {
                    "ok": False,
                    "broken_at_seq": seq,
                    "reason": reason,
                    "message": reason,
                    "expected_entry_hash": recomputed,
                    "actual_entry_hash": entry_hash,
                }

            expected_prev_hash = entry_hash

        return {
            "ok": True,
            "last_hash": expected_prev_hash,
            "total_events": len(rows),
            "status": "INTACT",
            "message": f"Audit chain verified intact across {len(rows)} event(s).",
        }

    def get_events(
        self,
        entity_id: str | None = None,
        action: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> dict[str, Any]:
        """Fetch paginated audit log events with optional filters."""
        clauses = []
        if entity_id:
            safe_entity_id = entity_id.replace("'", "''")
            clauses.append(f"entity_id = '{safe_entity_id}'")
        if action:
            safe_action = action.replace("'", "''")
            clauses.append(f"action = '{safe_action}'")

        where_sql = f"WHERE {' AND '.join(clauses)}" if clauses else ""

        total_count = self.conn.execute(
            f"SELECT COUNT(*) FROM audit_log {where_sql}"
        ).fetchone()[0]

        rows = self.conn.execute(
            f"""
            SELECT seq, strftime(ts, '%Y-%m-%d %H:%M:%S.%f'), actor, action, entity_type, entity_id, details, prev_hash, entry_hash
            FROM audit_log
            {where_sql}
            ORDER BY seq DESC
            LIMIT {limit} OFFSET {offset}
            """
        ).fetchall()

        events = []
        for r in rows:
            try:
                det = json.loads(r[6])
            except Exception:
                det = r[6]
            events.append({
                "seq": r[0],
                "ts": r[1],
                "actor": r[2],
                "action": r[3],
                "entity_type": r[4],
                "entity_id": r[5],
                "details": det,
                "prev_hash": r[7],
                "entry_hash": r[8],
            })

        return {
            "total": total_count,
            "limit": limit,
            "offset": offset,
            "events": events,
        }
