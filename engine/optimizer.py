"""
optimizer.py
------------
Monte Carlo simulation engine for capital allocation.

ALGORITHM:
  1. For each strategy, run 10,000 simulations of Nifty price paths
  2. Each path: daily returns drawn from Normal(0, IV/√252) for DTE days
  3. Compute P&L at expiry for each path
  4. Extract P10/P50/P90 and Probability of Profit
  5. Given capital input, compute optimal lot allocation

WHY MONTE CARLO OVER BLACK-SCHOLES:
  Black-Scholes assumes constant volatility and log-normal returns.
  Monte Carlo lets us model path-dependent behaviour, non-normal tails,
  and realistic intraday behaviour. For 21-day expiry strategies,
  both give similar results, but MC is more intuitive to explain.
"""

import numpy as np
import math
from dataclasses import dataclass
from engine.strategies import Strategy


# ── Result types ─────────────────────────────────────────────────────────────

@dataclass
class SimulationResult:
    strategy_name: str
    capital: float
    lots: int
    margin_used: float
    buffer_kept: float          # 30% of capital kept as buffer

    p10: float                  # Worst case (10th percentile)
    p50: float                  # Most likely (median)
    p90: float                  # Best case (90th percentile)

    prob_of_profit: float       # fraction of simulations profitable
    expected_value: float       # mean P&L across all simulations
    max_possible_loss: float    # theoretical worst case

    # For histogram
    all_pnls: list[float] = None

    @property
    def return_pct_p50(self) -> float:
        return (self.p50 / self.capital * 100) if self.capital else 0

    @property
    def risk_reward(self) -> str:
        if self.expected_value > 0 and self.max_possible_loss > 0:
            r = self.expected_value / self.max_possible_loss
            return f"1 : {r:.1f}"
        return "N/A"


@dataclass
class AllocationResult:
    capital: float
    risk_pct: float             # max acceptable loss as % of capital
    max_acceptable_loss: float
    deployable: float           # 70% of capital
    buffer: float               # 30% kept aside

    recommended: str            # name of recommended strategy
    recommended_reason: str

    simulations: dict[str, SimulationResult]
    blend: dict                 # blended portfolio allocation


# ── Core simulation ──────────────────────────────────────────────────────────

def run_simulation(
    strategy: Strategy,
    capital: float,
    n_simulations: int = 10_000,
    deploy_fraction: float = 0.70,
    random_seed: int = 42,
) -> SimulationResult:
    """
    Run Monte Carlo simulation for a single strategy.

    HOW IT WORKS:
      Step 1: Compute deployable capital = capital × deploy_fraction
      Step 2: Compute lots = floor(deployable / margin_per_lot)
      Step 3: For each simulation:
              - Generate DTE daily returns from Normal(0, daily_vol)
              - Compound to get final Nifty price
              - Calculate P&L per unit × lots × lot_size
      Step 4: Sort P&Ls, extract percentiles

    Args:
        strategy: Strategy object with payoff() method
        capital: total capital in ₹
        n_simulations: number of Monte Carlo paths
        deploy_fraction: fraction of capital to deploy (default 70%)
        random_seed: for reproducibility

    Returns:
        SimulationResult with full P&L distribution
    """
    np.random.seed(random_seed)

    # ── Step 1 & 2: Lot sizing ────────────────────────────────────────────
    deployable = capital * deploy_fraction
    buffer = capital * (1 - deploy_fraction)
    lots = max(0, int(deployable // strategy.margin_per_lot))
    margin_used = lots * strategy.margin_per_lot

    if lots == 0:
        return SimulationResult(
            strategy_name=strategy.name,
            capital=capital, lots=0,
            margin_used=0, buffer_kept=capital,
            p10=0, p50=0, p90=0,
            prob_of_profit=0, expected_value=0,
            max_possible_loss=0,
            all_pnls=[0] * n_simulations
        )

    # ── Step 3: Generate price paths ──────────────────────────────────────
    # Get ATM IV from strategy legs
    ivs = [leg.iv for leg in strategy.legs if leg.iv > 0]
    atm_iv = (sum(ivs) / len(ivs) / 100) if ivs else 0.20

    # Daily volatility: annual IV → daily
    # Annual IV assumes 252 trading days
    daily_vol = atm_iv / math.sqrt(252)

    # Generate all paths at once (faster than loop)
    # Shape: (n_simulations, dte)
    daily_returns = np.random.normal(
        loc=0,                # No drift assumption (conservative)
        scale=daily_vol,
        size=(n_simulations, strategy.dte)
    )

    # Compound returns to get final price
    # log-normal compounding: price_T = spot × exp(Σ log_returns)
    # But for small returns, (1+r1)(1+r2)...(1+rT) ≈ exp(Σri)
    final_prices = strategy.spot * np.prod(1 + daily_returns, axis=1)

    # ── Step 4: Calculate P&L for each path ───────────────────────────────
    unit_pnls = np.array([strategy.payoff(p) for p in final_prices])
    total_pnls = unit_pnls * strategy.lot_size * lots

    # ── Step 5: Statistics ────────────────────────────────────────────────
    sorted_pnls = np.sort(total_pnls)

    return SimulationResult(
        strategy_name=strategy.name,
        capital=capital,
        lots=lots,
        margin_used=round(margin_used, 0),
        buffer_kept=round(buffer, 0),
        p10=round(float(np.percentile(total_pnls, 10)), 0),
        p50=round(float(np.percentile(total_pnls, 50)), 0),
        p90=round(float(np.percentile(total_pnls, 90)), 0),
        prob_of_profit=round(float(np.mean(total_pnls > 0)), 4),
        expected_value=round(float(np.mean(total_pnls)), 0),
        max_possible_loss=round(float(-sorted_pnls[0]), 0),
        all_pnls=total_pnls.tolist()
    )


def allocate_capital(
    strategies: list[Strategy],
    capital: float,
    risk_pct: float = 0.20,
    n_simulations: int = 10_000,
) -> AllocationResult:
    """
    Given a capital amount and risk tolerance, compute:
    1. How many lots of each strategy you can run
    2. Which single strategy is best
    3. A blended portfolio allocation

    BLEND LOGIC:
      Weight each strategy by its PoP score.
      Strategies with higher PoP get more capital.
      Formula: weight_i = PoP_i / Σ(PoP_j)
      Capital_i = deployable × weight_i

    Args:
        strategies: list of Strategy objects
        capital: total ₹ to allocate
        risk_pct: max acceptable loss as fraction (e.g. 0.20 = 20%)
        n_simulations: MC paths per strategy

    Returns:
        AllocationResult with full breakdown
    """
    max_acceptable_loss = capital * risk_pct
    deployable = capital * 0.70

    # Run simulation for each strategy
    sims = {}
    for strat in strategies:
        result = run_simulation(strat, capital, n_simulations)
        sims[strat.name] = result

    # Find best strategy: highest EV within risk constraint
    valid = [
        s for s in sims.values()
        if s.lots > 0 and s.max_possible_loss <= max_acceptable_loss
    ]
    if valid:
        best = max(valid, key=lambda s: s.expected_value)
        reason = (
            f"Highest expected value (₹{best.expected_value:,.0f}) "
            f"with {best.prob_of_profit*100:.0f}% probability of profit "
            f"and max loss ₹{best.max_possible_loss:,.0f} within your "
            f"₹{max_acceptable_loss:,.0f} risk limit."
        )
    else:
        best = max(sims.values(), key=lambda s: s.lots) if sims else None
        reason = "No strategy fits within risk limit. Showing most capital-efficient option."

    # Build blended portfolio
    total_pop = sum(s.prob_of_profit for s in sims.values() if s.lots > 0)
    blend = {}
    for name, sim in sims.items():
        if sim.lots == 0 or total_pop == 0:
            continue
        weight = sim.prob_of_profit / total_pop
        alloc_capital = deployable * weight
        strat_obj = next(s for s in strategies if s.name == name)
        blend_lots = max(0, int(alloc_capital // strat_obj.margin_per_lot))
        blend[name] = {
            "weight_pct": round(weight * 100, 1),
            "capital_allocated": round(alloc_capital, 0),
            "lots": blend_lots,
            "pop": round(sim.prob_of_profit * 100, 1),
        }

    return AllocationResult(
        capital=capital,
        risk_pct=risk_pct,
        max_acceptable_loss=round(max_acceptable_loss, 0),
        deployable=round(deployable, 0),
        buffer=round(capital * 0.30, 0),
        recommended=best.strategy_name if best else "None",
        recommended_reason=reason,
        simulations=sims,
        blend=blend
    )
