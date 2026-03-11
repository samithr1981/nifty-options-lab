# NIFTY Options Lab 📊

A fully autonomous pipeline to fetch live NIFTY option chain data from NSE, compute multi-strategy P&L, run Monte Carlo simulations, and allocate capital optimally.

Built as an open-source companion to [MF Wealth Lab](https://mf-wealth-lab.streamlit.app/).

---

## What it does

1. **Fetches** live option chain from NSE every 5 minutes during market hours
2. **Stores** snapshots in SQLite for historical analysis
3. **Computes** four strategies (Straddle, Iron Condor, Bull Call Spread, Bear Put Spread)
4. **Simulates** 10,000 Monte Carlo paths per strategy
5. **Allocates** your capital optimally by PoP-weighted blending
6. **Visualises** OI walls, IV skew, payoff curves in a Streamlit dashboard

---

## Quickstart

```bash
# 1. Clone
git clone https://github.com/yourusername/nifty-options-lab
cd nifty-options-lab

# 2. Install
pip install -r requirements.txt

# 3. Start the data fetcher (Terminal 1)
python scheduler.py

# 4. Start the dashboard (Terminal 2)
streamlit run dashboard/app.py
```

Open `http://localhost:8501` — enter your capital, select strategy, run Monte Carlo.

---

## How NSE fetching works

NSE does not have a public API. The option chain is loaded by the browser via an internal endpoint:

```
https://www.nseindia.com/api/option-chain-indices?symbol=NIFTY
```

This endpoint requires valid session cookies. Without them, it returns 401.

**Our approach:**
1. Create a `requests.Session()`
2. Hit `https://www.nseindia.com` first → this sets `nsit`, `nseappid` cookies
3. Then hit the data endpoint with those cookies + correct browser headers
4. Parse the JSON response

This is how every retail algo tool in India works. NSE tolerates it but rate-limits aggressively — we poll every 5 minutes.

---

## Project structure

```
nifty-options-lab/
├── data/
│   ├── fetch_nse.py       # NSE session + option chain parser
│   ├── store.py           # SQLite persistence
│   └── options.db         # Created automatically on first run
├── engine/
│   ├── strategies.py      # Strategy builders + payoff math
│   └── optimizer.py       # Monte Carlo + capital allocator
├── dashboard/
│   └── app.py             # Streamlit UI
├── scheduler.py           # 5-minute poller (run in background)
├── requirements.txt
└── README.md
```

---

## Formulas used

### 1-sigma move
```
σ_move = Spot × IV × √(DTE/365)
```
At IV=23.4%, DTE=21: `24100 × 0.234 × √(21/365) = ±1,355 pts`

### Probability of Profit (PoP)
Log-normal model:
```
σ_T = IV × √(DTE/365)
final_price ~ LogNormal(log(spot) - 0.5×σ_T², σ_T)
PoP = fraction of 10,000 simulations where payoff > 0
```

### Expected Value
```
EV = mean(payoff across all simulations) × lot_size × lots
```

### Max Pain
```
For each candidate strike S:
  pain(S) = Σ call_OI[i] × max(0, strike[i]-S)
          + Σ put_OI[i]  × max(0, S-strike[i])
Max Pain = S that minimises pain(S)
```

### Capital allocation
```
Deployable = Capital × 0.70   (30% kept as buffer)
Lots = floor(Deployable / Margin_per_lot)
Weight_i = PoP_i / Σ(PoP_all)   (for blended portfolio)
```

---

## Disclaimer

This tool is for educational purposes only. Options trading involves substantial risk of loss. Nothing here constitutes financial advice. Past simulated performance does not guarantee future results.

---

## License

MIT — use freely, contribute back.
