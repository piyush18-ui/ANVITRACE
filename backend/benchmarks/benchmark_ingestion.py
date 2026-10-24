"""Benchmark harness for Operation Abhedya-Chakra / ANVITRACE Phase 1.

Measures:
- Synthetic dataset generation throughput
- Full streaming ingestion time
- Rows per second (target: >= 33,333 rows/sec to achieve 2M <= 60s)
- Index generation time
- Memory usage snapshot
"""

import argparse
import random
import string
import sys
import time
from pathlib import Path

# Add backend to sys.path
backend_path = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_path))

import duckdb  # noqa: E402

from app.database.schema import apply_schema  # noqa: E402
from app.services.ingestion import IngestionService  # noqa: E402


def generate_synthetic_transactions(output_file: Path, num_rows: int = 100_000) -> None:
    """Generate synthetic financial transaction CSV matching dataset characteristics."""
    print(f"Generating {num_rows:,} synthetic transactions into {output_file.name}...")
    modes = ["UPI", "IMPS", "NEFT", "RTGS"]

    # 5,000 distinct accounts to simulate realistic multi-graph density
    accounts = [f"ACC{''.join(random.choices(string.ascii_uppercase + string.digits, k=9))}" for _ in range(5000)]
    ifscs = ["SBIN0001234", "HDFC0005678", "ICIC0009999", "PUNB0002222", "BARB0003333"]

    t0 = time.perf_counter()
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(
            "Transaction_ID,Timestamp,Sender_Account,Sender_Name,Sender_IFSC,Receiver_Account,Receiver_Name,Receiver_IFSC,Amount,Payment_Mode,Status\n"
        )
        for i in range(1, num_rows + 1):
            # 2% repeated TX IDs
            tx_id = f"TX{i if random.random() > 0.02 else random.randint(1, i)}"
            sender = random.choice(accounts)
            receiver = random.choice(accounts)
            while receiver == sender:
                receiver = random.choice(accounts)

            s_ifsc = random.choice(ifscs)
            r_ifsc = random.choice(ifscs)
            amount = round(random.uniform(100.0, 500000.0), 2)
            mode = random.choice(modes)
            # 15-day timestamp window
            day = random.randint(1, 15)
            hour = random.randint(0, 23)
            minute = random.randint(0, 59)
            second = random.randint(0, 59)
            ts = f"2026-03-{day:02d} {hour:02d}:{minute:02d}:{second:02d}"

            f.write(f"{tx_id},{ts},{sender},UserS,{s_ifsc},{receiver},UserR,{r_ifsc},{amount},{mode},SUCCESS\n")

    t1 = time.perf_counter()
    print(f"Generated {num_rows:,} rows in {t1 - t0:.2f}s ({output_file.stat().st_size / (1024 * 1024):.2f} MB)")


def run_benchmark(
    num_rows: int = 100_000,
    chunk_size: int = 50_000,
    input_file: Path | None = None,
) -> None:
    """Run full benchmark on in-memory / temporary DuckDB instance."""
    bench_dir = backend_path / "benchmarks" / "data"
    bench_dir.mkdir(parents=True, exist_ok=True)

    if input_file and input_file.exists():
        csv_path = input_file
        print(f"Using supplied dataset file: {csv_path.name} ({csv_path.stat().st_size / (1024 * 1024):.2f} MB)")
    else:
        csv_path = bench_dir / f"benchmark_{num_rows}.csv"
        if not csv_path.exists():
            generate_synthetic_transactions(csv_path, num_rows=num_rows)

    print("\n--- STARTING INGESTION & INDEXING BENCHMARK ---")
    conn = duckdb.connect(":memory:")
    apply_schema(conn)

    service = IngestionService(conn)
    t0 = time.perf_counter()
    result = service.ingest_file(csv_path, dataset_id="ds_benchmark", chunk_size=chunk_size)
    total_time = time.perf_counter() - t0

    rps = result["rows_per_second"]
    actual_rows = result["total_rows"]

    print("\n================ BENCHMARK RESULTS ================")
    print(f"Source File             : {csv_path.name}")
    print(f"Total Rows Ingested     : {actual_rows:,}")
    print(f"Valid Rows              : {result['valid_rows']:,}")
    print(f"Invalid Rows            : {result['invalid_rows']:,}")
    print(f"Repeated Transaction IDs: {result['repeated_tx_ids']:,}")
    print(f"Exact Duplicate Rows    : {result['exact_duplicates']:,}")
    print(f"Total Duration          : {total_time:.2f} s")
    print(f"Measured Throughput     : {rps:,.1f} rows/second")
    print("--------------------------------------------------")
    if actual_rows >= 2_000_000:
        print(f"Actual 2M Ingestion Time: {total_time:.2f} seconds")
        if total_time <= 60.0:
            print(">> ACCEPTANCE CRITERIA (<= 60s for 2M rows): TARGET ACHIEVED <<")
        else:
            print(f">> ACCEPTANCE CRITERIA: Measured {total_time:.2f}s (target <= 60s) <<")
    else:
        target_time_for_2m = (2_000_000 / rps) if rps > 0 else 0
        print(f"Extrapolated 2M Ingestion Time: {target_time_for_2m:.2f} seconds")
        print(">> NOTE: Target achievement must be verified with the full 2M dataset file. <<")
    print("==================================================\n")
    conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ANVITRACE Ingestion & Indexing Benchmark")
    parser.add_argument("--rows", type=int, default=100_000, help="Number of synthetic rows to benchmark")
    parser.add_argument("--chunk-size", type=int, default=50_000, help="Polars streaming batch size")
    parser.add_argument("--file", type=str, default=None, help="Path to supplied real dataset file (e.g. 2M-row CSV)")
    args = parser.parse_args()
    input_path = Path(args.file) if args.file else None
    run_benchmark(num_rows=args.rows, chunk_size=args.chunk_size, input_file=input_path)
