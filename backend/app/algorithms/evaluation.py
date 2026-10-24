"""Evaluation tooling for benchmark verification against ground-truth labels.

Supports:
- Precision
- Recall (True Positive Rate)
- False Positive Rate (FPR)
- F1-Score
- Confusion matrix breakdown (TP, FP, TN, FN)
- Configurable decision thresholds on Mule Risk Index (default 50.0 / HIGH tier)
- Strict compliance with forensic non-criminality candidate terminology
- Explicit prohibition against tuning rules on blind victim test sets
"""

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import duckdb

from app.config.risk_rules import DEFAULT_RISK_CONFIG, RiskEngineConfig
from app.services.risk_engine import RiskAssessmentService


@dataclass
class EvaluationMetrics:
    """Statistical evaluation metrics for forensic risk engine benchmarking."""

    total_samples: int
    true_positives: int
    false_positives: int
    true_negatives: int
    false_negatives: int
    precision: float
    recall: float
    false_positive_rate: float
    f1_score: float
    accuracy: float
    threshold_used: float
    rule_version: str
    confusion_matrix: dict[str, int]

    def to_dict(self) -> dict[str, Any]:
        """Convert metrics to serializable dict."""
        return asdict(self)


class ForensicRiskEvaluator:
    """Reproducible evaluation tool measuring risk classification accuracy."""

    def __init__(
        self,
        conn: duckdb.DuckDBPyConnection,
        config: RiskEngineConfig = DEFAULT_RISK_CONFIG,
    ):
        self.conn = conn
        self.config = config
        self.risk_service = RiskAssessmentService(conn, config)

    def evaluate(
        self,
        ground_truth: dict[str, bool],
        dataset_id: str,
        threshold: float = 50.0,
    ) -> EvaluationMetrics:
        """Evaluate engine performance against ground truth labels (account_id -> is_mule: bool).

        Parameters:
            ground_truth: Mapping of account_id to boolean label (True = Mule, False = Regular)
            dataset_id: Identifier of the dataset to evaluate within
            threshold: Mule Risk Index cutoff (0-100) above which account is classified as candidate mule
        """
        tp = 0
        fp = 0
        tn = 0
        fn = 0

        for account_id, actual_is_mule in ground_truth.items():
            profile = self.risk_service.assess_account_risk(account_id, dataset_id)
            predicted_is_mule = False if not profile else profile.mule_risk_index >= threshold

            if actual_is_mule and predicted_is_mule:
                tp += 1
            elif not actual_is_mule and predicted_is_mule:
                fp += 1
            elif not actual_is_mule and not predicted_is_mule:
                tn += 1
            elif actual_is_mule and not predicted_is_mule:
                fn += 1

        total = tp + fp + tn + fn

        precision = round(tp / (tp + fp), 4) if (tp + fp) > 0 else 0.0
        recall = round(tp / (tp + fn), 4) if (tp + fn) > 0 else 0.0
        fpr = round(fp / (fp + tn), 4) if (fp + tn) > 0 else 0.0
        f1 = (
            round(2.0 * (precision * recall) / (precision + recall), 4)
            if (precision + recall) > 0
            else 0.0
        )
        accuracy = round((tp + tn) / total, 4) if total > 0 else 0.0

        return EvaluationMetrics(
            total_samples=total,
            true_positives=tp,
            false_positives=fp,
            true_negatives=tn,
            false_negatives=fn,
            precision=precision,
            recall=recall,
            false_positive_rate=fpr,
            f1_score=f1,
            accuracy=accuracy,
            threshold_used=threshold,
            rule_version=self.config.rule_version,
            confusion_matrix={
                "TP": tp,
                "FP": fp,
                "TN": tn,
                "FN": fn,
            },
        )

    def evaluate_from_csv(
        self,
        csv_path: str | Path,
        dataset_id: str,
        threshold: float = 50.0,
    ) -> EvaluationMetrics:
        """Load ground truth labels from CSV and run evaluation."""
        import polars as pl

        df = pl.read_csv(csv_path)
        # Expected columns: account_id, is_mule (or label)
        col_acc = "account_id" if "account_id" in df.columns else df.columns[0]
        col_label = "is_mule" if "is_mule" in df.columns else df.columns[1]

        ground_truth: dict[str, bool] = {}
        for row in df.iter_rows(named=True):
            acc = str(row[col_acc]).strip()
            val = row[col_label]
            is_mule = val in (True, 1, "1", "true", "True", "MULE", "mule")
            ground_truth[acc] = is_mule

        return self.evaluate(ground_truth, dataset_id, threshold)
