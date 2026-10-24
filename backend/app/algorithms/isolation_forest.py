"""Isolation Forest Anomaly Detection Engine for ANVITRACE.

Applies unsupervised machine learning to transaction and account topologies
to identify multidimensional statistical outliers (e.g. rapid pass-through,
fan-in/fan-out structuring, burst velocity) without data leakage.

Provides feature-level explainability for every flagged candidate.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

import duckdb
import numpy as np
from sklearn.ensemble import IsolationForest

FEATURE_NAMES = [
    "in_amount",
    "out_amount",
    "in_tx_count",
    "out_tx_count",
    "distinct_senders",
    "distinct_receivers",
    "pass_through_ratio",
    "retention_ratio",
    "fan_in_ratio",
    "fan_out_ratio",
    "avg_in_amount",
    "avg_out_amount",
]

FEATURE_LABELS = {
    "in_amount": "Total Inflow Volume",
    "out_amount": "Total Outflow Volume",
    "in_tx_count": "Inbound Transaction Count",
    "out_tx_count": "Outbound Transaction Count",
    "distinct_senders": "Distinct Remitter Counterparties",
    "distinct_receivers": "Distinct Beneficiary Counterparties",
    "pass_through_ratio": "Rapid Pass-Through Index (Outflow/Inflow)",
    "retention_ratio": "Fund Retention Discrepancy",
    "fan_in_ratio": "Fan-in Concentration (Senders/Tx)",
    "fan_out_ratio": "Fan-out Dispersion (Receivers/Tx)",
    "avg_in_amount": "Average Inbound Transfer Size",
    "avg_out_amount": "Average Outbound Transfer Size",
}


@dataclass
class AnomalyExplanation:
    feature_name: str
    feature_label: str
    value: float
    population_median: float
    deviation_factor: float
    direction: str  # "HIGHER" or "LOWER"
    explanation: str


@dataclass
class AccountAnomalyResult:
    account_id: str
    dataset_id: str
    anomaly_score: float  # 0 to 100 (higher = more anomalous)
    is_anomaly: bool
    raw_score: float
    explanations: list[AnomalyExplanation] = field(default_factory=list)
    combined_priority_score: float = 0.0
    model_version: str = "IsolationForest-v1.0"
    methodology: str = (
        "Combined Priority = (0.60 * Rule_Risk_Index) + (0.40 * ML_Anomaly_Score). "
        "ML Anomaly flags statistical outliers and does not prove fraud."
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "account_id": self.account_id,
            "dataset_id": self.dataset_id,
            "anomaly_score": round(self.anomaly_score, 1),
            "is_anomaly": self.is_anomaly,
            "raw_score": round(self.raw_score, 4),
            "explanations": [
                {
                    "feature_name": exp.feature_name,
                    "feature_label": exp.feature_label,
                    "value": round(exp.value, 2),
                    "population_median": round(exp.population_median, 2),
                    "deviation_factor": round(exp.deviation_factor, 2),
                    "direction": exp.direction,
                    "explanation": exp.explanation,
                }
                for exp in self.explanations
            ],
            "combined_priority_score": round(self.combined_priority_score, 1),
            "model_version": self.model_version,
            "disclaimer": (
                "Isolation Forest anomaly detection highlights topological and statistical deviations. "
                "It represents an investigative lead and does not constitute confirmation of illicit activity."
            ),
        }


class IsolationForestEngine:
    """Trains and executes Isolation Forest models on account feature matrices."""

    def __init__(
        self,
        n_estimators: int = 100,
        contamination: float | str = 0.05,
        random_state: int = 42,
    ):
        self.n_estimators = n_estimators
        self.contamination = contamination
        self.random_state = random_state

    def _extract_feature_matrix(
        self, conn: duckdb.DuckDBPyConnection, dataset_id: str
    ) -> tuple[list[str], np.ndarray]:
        """Extract multi-dimensional topological features for all accounts in dataset."""
        query = f"""
        SELECT
            account_id,
            CAST(in_amount AS DOUBLE) AS in_amount,
            CAST(out_amount AS DOUBLE) AS out_amount,
            CAST(in_tx_count AS DOUBLE) AS in_tx_count,
            CAST(out_tx_count AS DOUBLE) AS out_tx_count,
            CAST(distinct_senders AS DOUBLE) AS distinct_senders,
            CAST(distinct_receivers AS DOUBLE) AS distinct_receivers,
            CASE
                WHEN in_amount > 0 THEN LEAST(1.0, out_amount / in_amount)
                ELSE 0.0
            END AS pass_through_ratio,
            CASE
                WHEN (in_amount + out_amount) > 0 THEN ABS(in_amount - out_amount) / (in_amount + out_amount)
                ELSE 0.0
            END AS retention_ratio,
            CASE
                WHEN in_tx_count > 0 THEN distinct_senders / in_tx_count
                ELSE 0.0
            END AS fan_in_ratio,
            CASE
                WHEN out_tx_count > 0 THEN distinct_receivers / out_tx_count
                ELSE 0.0
            END AS fan_out_ratio,
            CASE
                WHEN in_tx_count > 0 THEN in_amount / in_tx_count
                ELSE 0.0
            END AS avg_in_amount,
            CASE
                WHEN out_tx_count > 0 THEN out_amount / out_tx_count
                ELSE 0.0
            END AS avg_out_amount
        FROM account_features
        WHERE dataset_id = '{dataset_id}'
        ORDER BY account_id
        """
        rows = conn.execute(query).fetchall()
        if not rows:
            return [], np.empty((0, len(FEATURE_NAMES)))

        account_ids = [r[0] for r in rows]
        matrix = np.array([[float(val) if val is not None else 0.0 for val in r[1:]] for r in rows])
        # Replace NaNs or Infs if any
        matrix = np.nan_to_num(matrix, nan=0.0, posinf=0.0, neginf=0.0)
        return account_ids, matrix

    def score_dataset(
        self,
        conn: duckdb.DuckDBPyConnection,
        dataset_id: str,
        rule_risk_scores: dict[str, float] | None = None,
    ) -> dict[str, AccountAnomalyResult]:
        """Train Isolation Forest and score every account in the dataset."""
        account_ids, X = self._extract_feature_matrix(conn, dataset_id)
        if len(account_ids) == 0:
            return {}

        n_samples = len(account_ids)
        rule_scores = rule_risk_scores or {}

        # Handle small datasets gracefully
        if n_samples < 4:
            results: dict[str, AccountAnomalyResult] = {}
            for acc in account_ids:
                r_score = rule_scores.get(acc, 0.0)
                results[acc] = AccountAnomalyResult(
                    account_id=acc,
                    dataset_id=dataset_id,
                    anomaly_score=float(r_score),
                    is_anomaly=r_score >= 60.0,
                    raw_score=0.0,
                    explanations=[
                        AnomalyExplanation(
                            feature_name="sample_size",
                            feature_label="Sample Size Notice",
                            value=float(n_samples),
                            population_median=float(n_samples),
                            deviation_factor=1.0,
                            direction="NEUTRAL",
                            explanation=f"Dataset has only {n_samples} accounts; statistical baseline derived from rule heuristics.",
                        )
                    ],
                    combined_priority_score=float(r_score),
                )
            return results

        # Fit Isolation Forest
        contam = self.contamination if isinstance(self.contamination, str) else min(0.30, max(0.01, self.contamination))
        clf = IsolationForest(
            n_estimators=self.n_estimators,
            contamination=contam,
            random_state=self.random_state,
        )
        clf.fit(X)

        # decision_function: lower values = more abnormal
        raw_scores = clf.decision_function(X)  # usually between -0.5 and +0.5
        preds = clf.predict(X)  # -1 = anomaly, 1 = normal

        # Normalize scores to 0-100 scale where 100 = most anomalous
        min_raw = np.min(raw_scores)
        max_raw = np.max(raw_scores)
        score_range = max_raw - min_raw if max_raw != min_raw else 1.0

        # Invert so lower raw_score becomes higher anomaly_score (0 to 100)
        normalized_scores = ((max_raw - raw_scores) / score_range) * 100.0

        # Precompute population medians and interquartile ranges (IQR) for explainability
        medians = np.median(X, axis=0)
        q75 = np.percentile(X, 75, axis=0)
        q25 = np.percentile(X, 25, axis=0)
        iqr = np.maximum(q75 - q25, 1e-4)

        results: dict[str, AccountAnomalyResult] = {}

        for i, acc in enumerate(account_ids):
            norm_score = float(normalized_scores[i])
            is_anomaly = bool(preds[i] == -1 or norm_score >= 65.0)
            account_features = X[i]

            # Generate explainability for features deviating significantly from population
            explanations: list[AnomalyExplanation] = []
            deviations = []
            for j, f_name in enumerate(FEATURE_NAMES):
                val = account_features[j]
                med = medians[j]
                # Measure how many IQRs away from median
                dev = (val - med) / iqr[j]
                deviations.append((abs(dev), dev, j, f_name, val, med))

            # Sort by highest absolute deviation
            deviations.sort(key=lambda x: x[0], reverse=True)

            # Take top 3 most significant deviations
            for abs_dev, dev, j, f_name, val, med in deviations[:3]:
                if abs_dev >= 1.2:  # Only report noteworthy deviations
                    direction = "HIGHER" if dev > 0 else "LOWER"
                    label = FEATURE_LABELS.get(f_name, f_name)
                    factor = (val / max(med, 1e-3)) if med > 0 else (val if val > 0 else 1.0)
                    exp_text = (
                        f"{label} of {val:,.2f} is significantly {direction.lower()} than the dataset median of {med:,.2f} "
                        f"({factor:.1f}x baseline deviation)."
                    )
                    explanations.append(
                        AnomalyExplanation(
                            feature_name=f_name,
                            feature_label=label,
                            value=val,
                            population_median=med,
                            deviation_factor=factor,
                            direction=direction,
                            explanation=exp_text,
                        )
                    )

            # Combined Priority Score: (0.60 * rule_score) + (0.40 * ml_score)
            rule_score = rule_scores.get(acc, 0.0)
            combined_priority = (0.60 * rule_score) + (0.40 * norm_score)

            results[acc] = AccountAnomalyResult(
                account_id=acc,
                dataset_id=dataset_id,
                anomaly_score=norm_score,
                is_anomaly=is_anomaly,
                raw_score=float(raw_scores[i]),
                explanations=explanations,
                combined_priority_score=combined_priority,
            )

        return results

    def score_account(
        self,
        conn: duckdb.DuckDBPyConnection,
        account_id: str,
        dataset_id: str,
        rule_risk_score: float = 0.0,
    ) -> AccountAnomalyResult | None:
        """Score a specific account in the context of the dataset."""
        all_results = self.score_dataset(conn, dataset_id, {account_id: rule_risk_score})
        return all_results.get(account_id)
