"""Centralized, explainable rule and weight configuration for Phase 3 Mule Detection & Risk Engine.

As required by the Engineering Specification:
- Contains rule version, configurable thresholds, feature weights, and normalization logic.
- Avoids burying thresholds across the codebase.
- Freezable before evaluation and blind testing.
"""

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class RiskEngineConfig:
    """Configurable weights, thresholds, and versioning for Mule Risk Index (0-100)."""

    rule_version: str = "1.0.0"

    # --- Thresholds ---
    # Rapid Pass-Through: Official criterion & graduated thresholds
    # Official requirement: >= 90% dispersed within 3-15 minute window
    rapid_pass_through_official_ratio: float = 0.90
    rapid_pass_through_min_minutes: float = 0.0  # Lower bound for evaluation
    rapid_pass_through_max_minutes: float = 15.0  # Configured 3-15m window upper bound
    rapid_pass_through_window_minutes: float = 15.0  # Max evaluation window
    rapid_pass_through_min_ratio: float = 0.70  # Baseline ratio for signal emergence

    # Graduated severity ratio thresholds
    pass_through_strong_ratio: float = 0.90    # >= 90% -> STRONG
    pass_through_moderate_ratio: float = 0.80  # 80-89.99% -> MODERATE
    pass_through_weak_ratio: float = 0.70      # 70-79.99% -> WEAK
    # < 70% -> LOW/NO SIGNAL

    # Fan-In (Layer 1 Collector Indicator)
    fan_in_min_senders: int = 3

    # Fan-Out (Layer 2 Distributor Indicator)
    fan_out_min_receivers: int = 3

    # Smurfing / Splitting: incoming dispersed to >= N smaller transactions
    smurfing_min_splits: int = 3
    smurfing_max_window_minutes: float = 60.0
    smurfing_min_ratio: float = 0.60  # Aggregate dispersed ratio for smurfing

    # Terminal Candidate: High retention with minimal or zero downstream dispersion
    terminal_min_retention_ratio: float = 0.80  # Retains >= 80% of inflow
    terminal_payment_modes: tuple[str, ...] = ("ATM", "WALLET_LOAD", "P2P_CRYPTO", "CASH_OUT")

    # Dataset-Specific Signals
    high_risk_devices: tuple[str, ...] = ("Linux_Script", "Web_Emulator")
    high_risk_ip_prefixes: tuple[str, ...] = ("185.", "194.")
    baseline_ip_prefixes: tuple[str, ...] = ("103.",)
    high_risk_narrations: tuple[str, ...] = ("TASK_EARNING", "P2P_CRYPTO", "WALLET_LOAD")
    baseline_narrations: tuple[str, ...] = (
        "SALARY",
        "ELECTRICITY",
        "GROCERY",
        "MOBILE_RECHARGE",
        "UTILITY",
        "RENT",
    )

    # --- Feature Weights (Sum = 100.0) ---
    weight_rapid_pass_through: float = 20.0
    weight_fan_in: float = 15.0
    weight_fan_out: float = 15.0
    weight_smurfing: float = 15.0
    weight_cycle: float = 10.0
    weight_device_anomaly: float = 10.0
    weight_ip_anomaly: float = 5.0
    weight_narration_pattern: float = 10.0

    # --- Confidence Dampening ---
    # Confidence multiplier when normal baseline narratives or clean devices are dominant
    baseline_mitigation_factor: float = 0.85

    def get_thresholds_dict(self) -> dict[str, Any]:
        """Return all active thresholds for audit and report inclusion."""
        return {
            "rapid_pass_through_window_minutes": self.rapid_pass_through_max_minutes,
            "rapid_pass_through_min_minutes": self.rapid_pass_through_min_minutes,
            "rapid_pass_through_max_minutes": self.rapid_pass_through_max_minutes,
            "rapid_pass_through_official_ratio": self.rapid_pass_through_official_ratio,
            "pass_through_strong_ratio": self.pass_through_strong_ratio,
            "pass_through_moderate_ratio": self.pass_through_moderate_ratio,
            "pass_through_weak_ratio": self.pass_through_weak_ratio,
            "rapid_pass_through_min_ratio": self.rapid_pass_through_min_ratio,
            "fan_in_min_senders": self.fan_in_min_senders,
            "fan_out_min_receivers": self.fan_out_min_receivers,
            "smurfing_min_splits": self.smurfing_min_splits,
            "smurfing_max_window_minutes": self.smurfing_max_window_minutes,
            "smurfing_min_ratio": self.smurfing_min_ratio,
            "terminal_min_retention_ratio": self.terminal_min_retention_ratio,
            "terminal_payment_modes": list(self.terminal_payment_modes),
            "high_risk_devices": list(self.high_risk_devices),
            "high_risk_ip_prefixes": list(self.high_risk_ip_prefixes),
            "high_risk_narrations": list(self.high_risk_narrations),
            "baseline_narrations": list(self.baseline_narrations),
        }

    def get_weights_dict(self) -> dict[str, float]:
        """Return feature weights for audit and explainability."""
        return {
            "rapid_pass_through": self.weight_rapid_pass_through,
            "fan_in": self.weight_fan_in,
            "fan_out": self.weight_fan_out,
            "smurfing": self.weight_smurfing,
            "cycle": self.weight_cycle,
            "device_anomaly": self.weight_device_anomaly,
            "ip_anomaly": self.weight_ip_anomaly,
            "narration_pattern": self.weight_narration_pattern,
        }


# Default singleton instance (can be overridden per investigation if needed)
DEFAULT_RISK_CONFIG = RiskEngineConfig()
