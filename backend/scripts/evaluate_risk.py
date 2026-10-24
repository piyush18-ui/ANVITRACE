"""CLI utility for running reproducible evaluation against labeled mule/regular ground truth datasets."""

import argparse
import json
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.algorithms.evaluation import ForensicRiskEvaluator  # noqa: E402
from app.config.risk_rules import DEFAULT_RISK_CONFIG  # noqa: E402
from app.database.duckdb import get_connection  # noqa: E402


def main():
    parser = argparse.ArgumentParser(
        description="Evaluate ANVITRACE Mule Risk Engine against ground-truth labels."
    )
    parser.add_argument(
        "--dataset-id",
        required=True,
        help="Dataset identifier in DuckDB to evaluate against",
    )
    parser.add_argument(
        "--ground-truth-csv",
        required=True,
        help="Path to CSV containing (account_id, is_mule)",
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=50.0,
        help="Mule Risk Index cutoff threshold (default: 50.0)",
    )
    parser.add_argument(
        "--output-json",
        default=None,
        help="Optional path to write evaluation results as JSON",
    )

    args = parser.parse_args()

    conn = get_connection()
    evaluator = ForensicRiskEvaluator(conn=conn, config=DEFAULT_RISK_CONFIG)

    print("--- Running Forensic Evaluation ---")
    print(f"Dataset ID: {args.dataset_id}")
    print(f"Ground Truth File: {args.ground_truth_csv}")
    print(f"Decision Threshold: {args.threshold} (Rule Version: {DEFAULT_RISK_CONFIG.rule_version})")

    metrics = evaluator.evaluate_from_csv(
        csv_path=args.ground_truth_csv,
        dataset_id=args.dataset_id,
        threshold=args.threshold,
    )

    results_dict = metrics.to_dict()
    print("\n--- Evaluation Results ---")
    print(f"Total Samples: {metrics.total_samples}")
    print(f"Confusion Matrix: TP={metrics.true_positives}, FP={metrics.false_positives}, TN={metrics.true_negatives}, FN={metrics.false_negatives}")
    print(f"Precision: {metrics.precision:.4f}")
    print(f"Recall: {metrics.recall:.4f}")
    print(f"False Positive Rate (FPR): {metrics.false_positive_rate:.4f}")
    print(f"F1-Score: {metrics.f1_score:.4f}")
    print(f"Accuracy: {metrics.accuracy:.4f}")

    if args.output_json:
        out_path = Path(args.output_json)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(results_dict, indent=2), encoding="utf-8")
        print(f"\nSaved metrics to {out_path}")


if __name__ == "__main__":
    main()
