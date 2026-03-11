"""
strategies.py
-------------
Computes all option strategies from live option chain data.

FORMULAS USED:
  1. Probability of Profit  — Black-Scholes normal distribution
  2. Expected Value         — EV = (PoP × MaxProfit) - ((1-PoP) × MaxLoss)
  3. 1σ Move                — Spot × IV × √(DTE/365)
  4. Max Pain               — Strike minimising total option buyer pain
  5. PCR                    — Put OI ÷ Call OI
"""

import math
import numpy as np
from scipy.stats import norm
from dataclasses import dataclass, field
from typing import Optional


LOT_SIZE = 25        # Nifty lot size
RISK_FREE = 0.065    # RBI repo rate proxy


# ── Data classes ────────────────────────────────────────────────────────────

@dataclass
class OptionLeg:
    action: str          # "BUY" or "SELL"
    option_type: str     # "Call" or "Put"
    strike: float
    premium: float
    iv: float = 0.0

    @property
    def sign(self) -> int:
        return 1 if self.action == "BUY" else -1

    @property
    def net_flow(self) -> float:
        """Negative = cash outflow (buy), Positive = cash inflow (sell)"""
        return -self.sign * self.premium


@dataclass
class Strategy:
    name: str
    view: str            # plain English market view
    legs: list[OptionLeg]
    spot: float
    dte: int             # days to expiry
    lot_size: int = LOT_SIZE

    # Computed at init
    net_premium: float = field(init=False)
    margin_per_lot: float = field(init=False)

    def __post_init__(self):
        self.net_premium = sum(leg.net_flow for leg in self.legs)
        self.margin_per_lot = self._calc_margin()

    def _calc_margin(self) -> float:
        """
        Approximate margin per lot.
        For debit strategies (net outflow): margin = net cost × lot_size
        For credit strategies (net inflow): margin = max_loss × lot_size
        SEBI SPAN margin is more complex but this is a conservative estimate.
        """
        if self.net_premium < 0:
            # Debit: you pay upfront
            return abs(self.net_premium) * self.lot_size
        else:
            # Credit: exchange holds max_loss as margin
            return self.max_loss * self.lot_size

    def payoff(self, expiry_price: float) -> float:
        """
        Calculate P&L per unit at expiry for a given Nifty price.
        Intrinsic value formula:
          Call intrinsic = max(0, price - strike)
          Put  intrinsic = max(0, strike - price)
        """
        pnl = self.net_premium  # start with premium collected/paid
        for leg in self.legs:
            if leg.option_type == "Call":
                intrinsic = max(0, expiry_price - leg.strike)
            else:
                intrinsic = max(0, leg.strike - expiry_price)
            pnl += leg.sign * intrinsic
        return pnl

    @property
    def max_profit(self) -> float:
        prices = np.linspace(self.spot * 0.5, self.spot * 1.5, 500)
        return max(self.payoff(p) for p in prices)

    @property
    def max_loss(self) -> float:
        prices = np.linspace(self.spot * 0.5, self.spot * 1.5, 500)
        return abs(min(self.payoff(p) for p in prices))

    def prob_of_profit(self) -> float:
        """
        Probability that this strategy is profitable at expiry.
        Uses lognormal model: final price ~ LogNormal(log(spot), σ√T)
        where σ = ATM IV (annualised).

        FORMULA:
          σ_T = IV × √(DTE/365)
          For each price point, check if payoff > 0
          Integrate over lognormal distribution
        """
        iv = np.mean([leg.iv for leg in self.legs if leg.iv > 0]) or 0.20
        sigma_T = iv * math.sqrt(self.dte / 365)

        # Monte Carlo with 50,000 paths for accuracy
        np.random.seed(42)
        log_returns = np.random.normal(
            -0.5 * sigma_T**2,   # drift correction for log-normal
            sigma_T,
            50_000
        )
        final_prices = self.spot * np.exp(log_returns)
        payoffs = np.array([self.payoff(p) for p in final_prices])
        return float(np.mean(payoffs > 0))

    def expected_value(self) -> float:
        """
        EV = (PoP × E[profit | profitable]) - ((1-PoP) × E[loss | losing])
        Computed directly from Monte Carlo distribution.
        """
        iv = np.mean([leg.iv for leg in self.legs if leg.iv > 0]) or 0.20
        sigma_T = iv * math.sqrt(self.dte / 365)
        np.random.seed(42)
        log_returns = np.random.normal(-0.5*sigma_T**2, sigma_T, 50_000)
        final_prices = self.spot * np.exp(log_returns)
        payoffs = np.array([self.payoff(p) for p in final_prices])
        return float(np.mean(payoffs))

    def payoff_curve(self, n_points: int = 100) -> tuple[list, list]:
        """Returns (prices, payoffs) for plotting."""
        prices = np.linspace(self.spot * 0.82, self.spot * 1.18, n_points)
        payoffs = [self.payoff(p) for p in prices]
        return prices.tolist(), payoffs


# ── Strategy builders ────────────────────────────────────────────────────────

def build_straddle(spot: float, rows: list[dict], dte: int) -> Strategy:
    """
    ATM Straddle: Buy ATM Call + Buy ATM Put
    View: Expect big move, direction unknown
    """
    atm = _get_atm_row(rows, spot)
    return Strategy(
        name="ATM Straddle",
        view="Volatile — big move expected, direction unknown",
        legs=[
            OptionLeg("BUY", "Call", atm["strike"], atm["call_ltp"], atm["call_iv"]),
            OptionLeg("BUY", "Put",  atm["strike"], atm["put_ltp"],  atm["put_iv"]),
        ],
        spot=spot, dte=dte
    )


def build_iron_condor(spot: float, rows: list[dict], dte: int,
                      wing_width: int = 500) -> Strategy:
    """
    Iron Condor: Sell OTM Call + Buy further OTM Call + Sell OTM Put + Buy further OTM Put
    View: Market stays in a range

    WING SELECTION:
      Upper strikes: spot + 1σ (sell call), spot + 1σ + wing_width (buy call)
      Lower strikes: spot - 1σ (sell put),  spot - 1σ - wing_width (buy put)
      1σ = spot × ATM_IV × √(DTE/365)
    """
    atm = _get_atm_row(rows, spot)
    iv = (atm["call_iv"] + atm["put_iv"]) / 2 / 100
    one_sigma = spot * iv * math.sqrt(dte / 365)

    sc_strike = _nearest_strike(rows, spot + one_sigma * 0.75)
    bc_strike = _nearest_strike(rows, sc_strike + wing_width)
    sp_strike = _nearest_strike(rows, spot - one_sigma * 0.75)
    bp_strike = _nearest_strike(rows, sp_strike - wing_width)

    sc = _get_row(rows, sc_strike)
    bc = _get_row(rows, bc_strike)
    sp = _get_row(rows, sp_strike)
    bp = _get_row(rows, bp_strike)

    return Strategy(
        name="Iron Condor",
        view="Neutral — market stays in range",
        legs=[
            OptionLeg("SELL", "Call", sc_strike, sc["call_ltp"], sc["call_iv"]),
            OptionLeg("BUY",  "Call", bc_strike, bc["call_ltp"], bc["call_iv"]),
            OptionLeg("SELL", "Put",  sp_strike, sp["put_ltp"],  sp["put_iv"]),
            OptionLeg("BUY",  "Put",  bp_strike, bp["put_ltp"],  bp["put_iv"]),
        ],
        spot=spot, dte=dte
    )


def build_bull_call_spread(spot: float, rows: list[dict], dte: int,
                            width: int = 500) -> Strategy:
    """Bull Call Spread: Buy ATM Call + Sell OTM Call"""
    buy_strike = _nearest_strike(rows, spot)
    sell_strike = _nearest_strike(rows, spot + width)
    buy_row  = _get_row(rows, buy_strike)
    sell_row = _get_row(rows, sell_strike)
    return Strategy(
        name="Bull Call Spread",
        view="Bullish — expect moderate rise",
        legs=[
            OptionLeg("BUY",  "Call", buy_strike,  buy_row["call_ltp"],  buy_row["call_iv"]),
            OptionLeg("SELL", "Call", sell_strike, sell_row["call_ltp"], sell_row["call_iv"]),
        ],
        spot=spot, dte=dte
    )


def build_bear_put_spread(spot: float, rows: list[dict], dte: int,
                           width: int = 500) -> Strategy:
    """Bear Put Spread: Buy ATM Put + Sell OTM Put"""
    buy_strike  = _nearest_strike(rows, spot)
    sell_strike = _nearest_strike(rows, spot - width)
    buy_row  = _get_row(rows, buy_strike)
    sell_row = _get_row(rows, sell_strike)
    return Strategy(
        name="Bear Put Spread",
        view="Bearish — expect moderate fall",
        legs=[
            OptionLeg("BUY",  "Put", buy_strike,  buy_row["put_ltp"],  buy_row["put_iv"]),
            OptionLeg("SELL", "Put", sell_strike, sell_row["put_ltp"], sell_row["put_iv"]),
        ],
        spot=spot, dte=dte
    )


# ── Market signals ──────────────────────────────────────────────────────────

def calc_max_pain(rows: list[dict]) -> float:
    """
    Max Pain: the expiry price at which option buyers lose the most.
    = strike minimising sum of (call_oi × max(0, strike-S)) + (put_oi × max(0, S-strike))
    """
    strikes = [r["strike"] for r in rows]
    call_ois = [r["call_oi"] for r in rows]
    put_ois  = [r["put_oi"]  for r in rows]

    min_pain, max_pain_strike = float("inf"), strikes[0]
    for s in strikes:
        pain = (
            sum(call_ois[i] * max(0, strikes[i] - s) for i in range(len(strikes))) +
            sum(put_ois[i]  * max(0, s - strikes[i]) for i in range(len(strikes)))
        )
        if pain < min_pain:
            min_pain = pain
            max_pain_strike = s

    return max_pain_strike


def calc_pcr(rows: list[dict]) -> float:
    """Put-Call Ratio = Total Put OI / Total Call OI"""
    total_call = sum(r["call_oi"] for r in rows)
    total_put  = sum(r["put_oi"]  for r in rows)
    return round(total_put / total_call, 3) if total_call else 0


def calc_one_sigma_move(spot: float, iv: float, dte: int) -> float:
    """
    Expected 1-standard-deviation move over DTE days.
    iv is in % (e.g. 23.4), not decimal.
    Formula: spot × (IV/100) × √(DTE/365)
    """
    return spot * (iv / 100) * math.sqrt(dte / 365)


def get_oi_walls(rows: list[dict], top_n: int = 5) -> dict:
    """Returns top N call OI (resistance) and put OI (support) strikes."""
    sorted_by_call = sorted(rows, key=lambda r: r["call_oi"], reverse=True)
    sorted_by_put  = sorted(rows, key=lambda r: r["put_oi"],  reverse=True)
    return {
        "resistance": [{"strike": r["strike"], "oi": r["call_oi"]} for r in sorted_by_call[:top_n]],
        "support":    [{"strike": r["strike"], "oi": r["put_oi"]}  for r in sorted_by_put[:top_n]],
    }


# ── Helpers ─────────────────────────────────────────────────────────────────

def _get_atm_row(rows: list[dict], spot: float) -> dict:
    return min(
        (r for r in rows if r["call_ltp"] > 0 and r["put_ltp"] > 0),
        key=lambda r: abs(r["strike"] - spot)
    )

def _nearest_strike(rows: list[dict], target: float) -> float:
    strikes = [r["strike"] for r in rows]
    return min(strikes, key=lambda s: abs(s - target))

def _get_row(rows: list[dict], strike: float) -> dict:
    for r in rows:
        if r["strike"] == strike:
            return r
    return rows[0]
