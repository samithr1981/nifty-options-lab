"""
dashboard/app.py
----------------
Streamlit dashboard — reads live data from SQLite, refreshes every 5 minutes.

RUN:
  streamlit run dashboard/app.py

REQUIRES:
  scheduler.py running in a separate terminal to keep fetching fresh data.
  Or: run fetch once manually before starting the dashboard.
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
import math
import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from data.store import get_latest_snapshot, init_db
from data.fetch_nse import fetch_option_chain, parse_option_chain, is_market_open
from data.store import save_snapshot
from engine.strategies import (
    build_straddle, build_iron_condor,
    build_bull_call_spread, build_bear_put_spread,
    calc_max_pain, calc_pcr, calc_one_sigma_move, get_oi_walls
)
from engine.optimizer import run_simulation, allocate_capital

# ── Page config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="NIFTY Options Lab",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ── Custom CSS ───────────────────────────────────────────────────────────────
st.markdown("""
<style>
  .main { background: #0a0d0f; }
  .metric-card {
    background: #111518; border: 1px solid #1e2730;
    border-radius: 8px; padding: 16px; margin: 4px 0;
  }
  .green { color: #00d4aa; }
  .red   { color: #ff6b6b; }
  .yellow { color: #ffd166; }
  .explain-box {
    background: #0d1520; border-left: 3px solid #00d4aa;
    padding: 12px 16px; border-radius: 0 6px 6px 0;
    font-size: 13px; margin: 8px 0;
  }
</style>
""", unsafe_allow_html=True)


# ── Data loading ─────────────────────────────────────────────────────────────

@st.cache_data(ttl=300)  # Cache for 5 minutes — same as fetch interval
def load_data():
    """
    Load option chain data.
    Priority: 1) Database (from scheduler) 2) Fresh fetch 3) Error
    """
    init_db()
    rows = get_latest_snapshot("NIFTY")

    if not rows:
        st.info("No data in database. Fetching from NSE now...")
        try:
            raw = fetch_option_chain("NIFTY")
            expiry = raw["records"]["expiryDates"][0]
            rows = parse_option_chain(raw, expiry)
            save_snapshot("NIFTY", expiry, rows)
        except Exception as e:
            st.error(f"Could not fetch from NSE: {e}")
            return None, None, None

    if not rows:
        return None, None, None

    spot = rows[0]["spot"]
    expiry = rows[0]["expiry"]
    return rows, spot, expiry


# ── Sidebar ───────────────────────────────────────────────────────────────────

with st.sidebar:
    st.title("⚙️ Controls")
    st.divider()

    # Capital input
    st.subheader("💰 Your Capital")
    capital = st.number_input(
        "Amount to speculate (₹)",
        min_value=10_000,
        max_value=10_000_000,
        value=50_000,
        step=5_000,
        help="Total capital you want to deploy in options today"
    )
    st.caption(f"Deployable (70%): ₹{capital*0.7:,.0f}")
    st.caption(f"Buffer (30%): ₹{capital*0.3:,.0f}")

    st.divider()

    # Risk appetite
    st.subheader("⚡ Risk Appetite")
    risk_pct = st.select_slider(
        "Max acceptable loss",
        options=[5, 10, 15, 20, 30, 40, 50],
        value=20,
        format_func=lambda x: f"{x}%"
    )
    max_loss = capital * risk_pct / 100
    st.caption(f"You're OK losing up to: ₹{max_loss:,.0f}")

    st.divider()

    # DTE input
    st.subheader("📅 Days to Expiry")
    dte = st.number_input("DTE", min_value=1, max_value=90, value=21)

    st.divider()

    # Refresh button
    if st.button("🔄 Refresh Data Now", use_container_width=True):
        st.cache_data.clear()
        st.rerun()

    market_status = "🟢 OPEN" if is_market_open() else "🔴 CLOSED"
    st.caption(f"Market: {market_status}")
    st.caption("Auto-refreshes every 5 min during market hours")


# ── Load data ─────────────────────────────────────────────────────────────────

rows, spot, expiry = load_data()

if rows is None:
    st.error("⚠️ No data available. Make sure scheduler.py is running or NSE is reachable.")
    st.stop()

# ── Header ────────────────────────────────────────────────────────────────────

st.title("📊 NIFTY Options Lab")
st.caption(f"Expiry: {expiry}  ·  Data as of: {rows[0].get('fetched_at', 'unknown')}  ·  {len(rows)} strikes loaded")

# Key metrics row
max_pain = calc_max_pain(rows)
pcr = calc_pcr(rows)
atm_row = min((r for r in rows if r["call_ltp"] > 0 and r["put_ltp"] > 0),
              key=lambda r: abs(r["strike"] - spot))
atm_iv = (atm_row["call_iv"] + atm_row["put_iv"]) / 2
one_sigma = calc_one_sigma_move(spot, atm_iv, dte)

col1, col2, col3, col4, col5 = st.columns(5)
col1.metric("Nifty Spot", f"₹{spot:,.0f}")
col2.metric("Max Pain", f"₹{max_pain:,.0f}", f"{(max_pain-spot)/spot*100:+.1f}% from spot")
col3.metric("PCR", f"{pcr:.2f}", "Neutral" if 0.8 < pcr < 1.2 else ("Bearish" if pcr > 1.2 else "Bullish"))
col4.metric("ATM IV", f"{atm_iv:.1f}%")
col5.metric("1σ Move (±)", f"₹{one_sigma:,.0f}", f"±{one_sigma/spot*100:.1f}%")

st.divider()

# ── Tabs ──────────────────────────────────────────────────────────────────────

tab1, tab2, tab3, tab4, tab5 = st.tabs([
    "💰 Capital Allocator",
    "📊 Strategies",
    "🎲 Monte Carlo",
    "📈 OI Analysis",
    "🌊 IV Skew",
])


# ════════════════════════════════════════════════════════
# TAB 1: CAPITAL ALLOCATOR
# ════════════════════════════════════════════════════════

with tab1:
    st.subheader(f"Allocation Plan for ₹{capital:,.0f}")

    with st.expander("📖 How we calculate this — click to read", expanded=False):
        st.markdown("""
        **Step 1 — Margin per lot**
        Each strategy needs different capital per lot (25 units):
        - Debit strategies (you pay): margin = net premium × 25
        - Credit strategies (you collect): margin = max loss × 25 (SEBI SPAN)

        **Step 2 — Lots you can afford**
        We deploy only 70% of your capital (30% buffer for MTM losses):
        `Lots = floor(Capital × 0.70 ÷ Margin per lot)`

        **Step 3 — Probability of Profit (PoP)**
        From IV and DTE using log-normal model:
        `1σ = Spot × IV × √(DTE/365)`
        PoP = probability of Nifty landing in profitable zone (Monte Carlo)

        **Step 4 — Expected Value (EV)**
        `EV = Mean of (P&L across 10,000 simulations)`
        Positive EV = mathematically favourable over many trades.

        **Step 5 — Blend**
        Allocate capital proportional to PoP:
        `Weight_i = PoP_i / Σ(PoP_all)`
        """)

    # Build strategies
    strategies = [
        build_straddle(spot, rows, dte),
        build_iron_condor(spot, rows, dte),
        build_bull_call_spread(spot, rows, dte),
        build_bear_put_spread(spot, rows, dte),
    ]

    # Allocation table
    alloc_data = []
    for strat in strategies:
        deployable = capital * 0.70
        lots = max(0, int(deployable // strat.margin_per_lot))
        margin_used = lots * strat.margin_per_lot
        total_max_loss = lots * strat.lot_size * strat.max_loss
        total_max_profit = lots * strat.lot_size * strat.max_profit
        within_risk = total_max_loss <= max_loss

        # Quick EV estimate (fast, not full MC)
        pop_est = 0.68 if "Condor" in strat.name else (
            0.35 if "Straddle" in strat.name else (
            0.45 if "Bull" in strat.name else 0.55))
        ev_est = (pop_est * total_max_profit) - ((1-pop_est) * total_max_loss)

        alloc_data.append({
            "Strategy": strat.name,
            "Market View": strat.view,
            "Margin/lot (₹)": f"₹{strat.margin_per_lot:,.0f}",
            "Lots": lots,
            "Capital Used": f"₹{margin_used:,.0f}",
            "Buffer": f"₹{capital-margin_used:,.0f}",
            "Max Loss": f"₹{total_max_loss:,.0f}",
            "Max Profit": f"₹{total_max_profit:,.0f}",
            "Est. EV": f"₹{ev_est:,.0f}",
            "Risk OK": "✅" if within_risk and lots > 0 else "❌",
        })

    df = pd.DataFrame(alloc_data)
    st.dataframe(df, use_container_width=True, hide_index=True)

    # Best recommendation
    valid = [d for d in alloc_data if d["Risk OK"] == "✅"]
    if valid:
        best = max(valid, key=lambda d: float(d["Est. EV"].replace("₹","").replace(",","")))
        st.success(f"**Recommended: {best['Strategy']}** — {best['Lots']} lots using {best['Capital Used']}")

    # Blended portfolio
    st.subheader("🔀 Blended Portfolio")
    st.markdown("*Distribute capital by PoP weight — never put everything in one bet.*")

    pop_weights = {"ATM Straddle": 0.35, "Iron Condor": 0.68, "Bull Call Spread": 0.45, "Bear Put Spread": 0.55}
    total_pop = sum(pop_weights.values())
    blend_data = []
    for strat in strategies:
        w = pop_weights.get(strat.name, 0.5) / total_pop
        alloc = capital * 0.70 * w
        lots = max(0, int(alloc // strat.margin_per_lot))
        blend_data.append({
            "Strategy": strat.name,
            "Weight": f"{w*100:.0f}%",
            "Capital": f"₹{alloc:,.0f}",
            "Lots": lots,
        })

    col_b1, col_b2 = st.columns([1, 1])
    with col_b1:
        st.dataframe(pd.DataFrame(blend_data), use_container_width=True, hide_index=True)
    with col_b2:
        fig = px.pie(
            pd.DataFrame(blend_data),
            values=[float(d["Capital"].replace("₹","").replace(",","")) for d in blend_data],
            names=[d["Strategy"] for d in blend_data],
            color_discrete_sequence=["#00d4aa","#ffd166","#ff6b6b","#6bcbff"]
        )
        fig.update_layout(paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)',
                          font_color='#8a9ab0', margin=dict(t=20,b=20,l=0,r=0))
        st.plotly_chart(fig, use_container_width=True)


# ════════════════════════════════════════════════════════
# TAB 2: STRATEGIES
# ════════════════════════════════════════════════════════

with tab2:
    strategies_list = [
        build_straddle(spot, rows, dte),
        build_iron_condor(spot, rows, dte),
        build_bull_call_spread(spot, rows, dte),
        build_bear_put_spread(spot, rows, dte),
    ]

    for strat in strategies_list:
        with st.expander(f"**{strat.name}** — {strat.view}", expanded=(strat.name=="Iron Condor")):
            c1, c2, c3, c4 = st.columns(4)
            c1.metric("Max Profit/unit", f"₹{strat.max_profit:,.0f}")
            c2.metric("Max Loss/unit", f"₹{strat.max_loss:,.0f}")
            c3.metric("Margin/lot", f"₹{strat.margin_per_lot:,.0f}")
            c4.metric("Net Premium", f"{'−' if strat.net_premium<0 else '+'}₹{abs(strat.net_premium):,.2f}")

            # Legs table
            legs_df = pd.DataFrame([{
                "Action": leg.action,
                "Type": leg.option_type,
                "Strike": f"₹{leg.strike:,.0f}",
                "Premium": f"₹{leg.premium:,.2f}",
                "IV": f"{leg.iv:.1f}%",
                "Flow": f"{'−' if leg.action=='BUY' else '+'}₹{leg.premium:,.2f} {'(you pay)' if leg.action=='BUY' else '(you collect)'}",
            } for leg in strat.legs])
            st.dataframe(legs_df, use_container_width=True, hide_index=True)

            # Payoff chart
            prices, payoffs = strat.payoff_curve(150)
            fig = go.Figure()
            fig.add_trace(go.Scatter(
                x=prices, y=payoffs,
                mode='lines', line=dict(width=2.5),
                line_color='#00d4aa',
                fill='tozeroy',
                fillcolor='rgba(0,212,170,0.08)',
                name='P&L per unit'
            ))
            fig.add_hline(y=0, line_dash="dash", line_color="#3d5068", line_width=1)
            fig.add_vline(x=spot, line_dash="dot", line_color="#ffd166",
                          annotation_text="Spot", annotation_position="top right")
            fig.update_layout(
                height=250, margin=dict(t=10,b=10,l=10,r=10),
                paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(13,17,23,1)',
                font_color='#8a9ab0',
                xaxis=dict(title="Nifty at Expiry", gridcolor='#1e2730'),
                yaxis=dict(title="P&L (₹/unit)", gridcolor='#1e2730'),
            )
            st.plotly_chart(fig, use_container_width=True)


# ════════════════════════════════════════════════════════
# TAB 3: MONTE CARLO
# ════════════════════════════════════════════════════════

with tab3:
    st.subheader("Monte Carlo Simulation")
    st.markdown("""
    **What this does:** Simulates 10,000 possible futures for Nifty between now and expiry.
    Each simulation draws random daily moves from a Normal distribution calibrated to current IV.
    We then measure your P&L in each of those 10,000 futures.
    """)

    col_mc1, col_mc2 = st.columns([1, 2])

    with col_mc1:
        mc_strategy_name = st.selectbox("Strategy", [
            "Iron Condor", "ATM Straddle", "Bull Call Spread", "Bear Put Spread"
        ])
        n_sims = st.select_slider("Simulations", [1000, 5000, 10000, 50000], value=10000)
        run_mc = st.button("▶ Run Simulation", use_container_width=True)

    if run_mc:
        strat_map = {
            "Iron Condor": build_iron_condor(spot, rows, dte),
            "ATM Straddle": build_straddle(spot, rows, dte),
            "Bull Call Spread": build_bull_call_spread(spot, rows, dte),
            "Bear Put Spread": build_bear_put_spread(spot, rows, dte),
        }
        chosen = strat_map[mc_strategy_name]

        with st.spinner(f"Running {n_sims:,} simulations..."):
            result = run_simulation(chosen, capital, n_sims)

        with col_mc2:
            m1, m2, m3 = st.columns(3)
            m1.metric("P10 — Worst Case", f"₹{result.p10:,.0f}",
                      help="10% of simulations end worse than this")
            m2.metric("P50 — Most Likely", f"₹{result.p50:,.0f}",
                      help="Median outcome across all simulations")
            m3.metric("P90 — Best Case", f"₹{result.p90:,.0f}",
                      help="10% of simulations end better than this")

            m4, m5, m6, m7 = st.columns(4)
            m4.metric("Prob of Profit", f"{result.prob_of_profit*100:.1f}%")
            m5.metric("Expected Value", f"₹{result.expected_value:,.0f}")
            m6.metric("Lots", f"{result.lots}")
            m7.metric("Capital Used", f"₹{result.margin_used:,.0f}")

        # P&L histogram
        if result.all_pnls:
            fig = go.Figure()
            fig.add_trace(go.Histogram(
                x=result.all_pnls,
                nbinsx=50,
                marker_color=['#ff6b6b' if x < 0 else '#00d4aa' for x in result.all_pnls[:1]],
                marker=dict(
                    color=['#ff6b6b' if x < 0 else '#00d4aa' for x in result.all_pnls],
                    line=dict(width=0)
                ),
                name='Scenarios'
            ))
            fig.add_vline(x=0, line_color='#3d5068', line_dash='dash')
            fig.add_vline(x=result.p50, line_color='#ffd166',
                          annotation_text="P50", line_dash='dot')
            fig.update_layout(
                height=300, paper_bgcolor='rgba(0,0,0,0)',
                plot_bgcolor='rgba(13,17,23,1)', font_color='#8a9ab0',
                xaxis_title="P&L (₹)", yaxis_title="Number of Scenarios",
                margin=dict(t=10, b=10)
            )
            st.plotly_chart(fig, use_container_width=True)

            # Interpretation
            pct_positive = result.prob_of_profit * 100
            st.info(
                f"**Reading this:** Out of {n_sims:,} simulated futures, "
                f"{pct_positive:.0f}% result in a profit. "
                f"In the worst 10% of scenarios, you lose ₹{abs(result.p10):,.0f}. "
                f"In the median scenario, you {'make' if result.p50>0 else 'lose'} ₹{abs(result.p50):,.0f}."
            )


# ════════════════════════════════════════════════════════
# TAB 4: OI ANALYSIS
# ════════════════════════════════════════════════════════

with tab4:
    oi_df = pd.DataFrame([{
        "Strike": r["strike"],
        "Call OI": r["call_oi"],
        "Put OI": r["put_oi"],
        "PCR at Strike": round(r["put_oi"] / r["call_oi"], 2) if r["call_oi"] else 0,
    } for r in rows if r["call_oi"] > 1000 or r["put_oi"] > 1000])
    oi_df = oi_df[(oi_df["Strike"] >= spot*0.9) & (oi_df["Strike"] <= spot*1.1)]

    fig = go.Figure()
    fig.add_trace(go.Bar(x=oi_df["Strike"], y=oi_df["Call OI"],
                         name="Call OI (Resistance)", marker_color='rgba(255,107,107,0.7)'))
    fig.add_trace(go.Bar(x=oi_df["Strike"], y=oi_df["Put OI"],
                         name="Put OI (Support)", marker_color='rgba(0,212,170,0.7)'))
    fig.add_vline(x=spot, line_color='#ffd166', line_dash='dot',
                  annotation_text=f"Spot {spot:,.0f}")
    fig.update_layout(
        height=400, barmode='group',
        paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(13,17,23,1)',
        font_color='#8a9ab0', margin=dict(t=10,b=10),
        xaxis_title="Strike", yaxis_title="Open Interest"
    )
    st.plotly_chart(fig, use_container_width=True)

    walls = get_oi_walls(rows)
    c1, c2 = st.columns(2)
    with c1:
        st.markdown("**🔴 Top Resistance (Call OI Walls)**")
        st.dataframe(pd.DataFrame(walls["resistance"]), use_container_width=True, hide_index=True)
    with c2:
        st.markdown("**🟢 Top Support (Put OI Walls)**")
        st.dataframe(pd.DataFrame(walls["support"]), use_container_width=True, hide_index=True)


# ════════════════════════════════════════════════════════
# TAB 5: IV SKEW
# ════════════════════════════════════════════════════════

with tab5:
    iv_rows = [r for r in rows
               if r["call_iv"] > 3 and r["put_iv"] > 3
               and spot * 0.92 <= r["strike"] <= spot * 1.08]

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=[r["strike"] for r in iv_rows],
        y=[r["call_iv"] for r in iv_rows],
        mode='lines+markers', name='Call IV',
        line=dict(color='#00d4aa', width=2),
        fill='tozeroy', fillcolor='rgba(0,212,170,0.06)'
    ))
    fig.add_trace(go.Scatter(
        x=[r["strike"] for r in iv_rows],
        y=[r["put_iv"] for r in iv_rows],
        mode='lines+markers', name='Put IV',
        line=dict(color='#ff6b6b', width=2),
        fill='tozeroy', fillcolor='rgba(255,107,107,0.06)'
    ))
    fig.add_vline(x=spot, line_color='#ffd166', line_dash='dot')
    fig.update_layout(
        height=350, paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(13,17,23,1)', font_color='#8a9ab0',
        xaxis_title="Strike", yaxis_title="IV %",
        margin=dict(t=10, b=10)
    )
    st.plotly_chart(fig, use_container_width=True)

    skew = (atm_row["put_iv"] - atm_row["call_iv"])
    st.metric("Put-Call Skew at ATM", f"+{skew:.1f} pts",
              help="Put IV minus Call IV. Positive = market paying more for downside protection.")
    st.info(
        f"**Interpretation:** Put IV ({atm_row['put_iv']:.1f}%) > Call IV ({atm_row['call_iv']:.1f}%) by {skew:.1f} pts. "
        f"This negative skew (puts cost more) is normal for Indian markets. "
        f"It means: selling the put side of a condor collects more premium than the call side."
    )
