"""
scheduler.py
------------
Runs the full pipeline on a schedule during market hours.

RUN THIS ONCE:
  python scheduler.py

WHAT IT DOES EVERY 5 MINUTES (9:15 AM – 3:30 PM IST):
  1. Fetch live option chain from NSE
  2. Parse and clean the data
  3. Save snapshot to SQLite database
  4. Log a summary

The Streamlit dashboard reads from SQLite and auto-refreshes.
"""

import time
import logging
from datetime import datetime
import pytz

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("scheduler.log"),
    ]
)
logger = logging.getLogger("scheduler")

from data.fetch_nse import fetch_option_chain, parse_option_chain, is_market_open
from data.store import init_db, save_snapshot

POLL_INTERVAL_SECONDS = 300   # 5 minutes
SYMBOL = "NIFTY"
IST = pytz.timezone("Asia/Kolkata")


def run_once():
    """Fetch → Parse → Store one snapshot."""
    try:
        logger.info("=" * 50)
        logger.info(f"Starting fetch for {SYMBOL}")

        raw = fetch_option_chain(SYMBOL)
        expiry = raw["records"]["expiryDates"][0]   # nearest expiry
        rows = parse_option_chain(raw, expiry)

        if not rows:
            logger.warning("No rows parsed. Skipping save.")
            return

        snapshot_id = save_snapshot(SYMBOL, expiry, rows)
        spot = rows[0]["spot"]

        logger.info(
            f"✅ Snapshot #{snapshot_id} saved | "
            f"Spot: ₹{spot:,.2f} | "
            f"Expiry: {expiry} | "
            f"Rows: {len(rows)}"
        )

    except Exception as e:
        logger.error(f"❌ Fetch failed: {e}", exc_info=True)


def main():
    logger.info("🚀 NIFTY Options Lab Scheduler starting...")
    init_db()

    while True:
        now = datetime.now(IST)

        if is_market_open():
            logger.info(f"Market OPEN at {now.strftime('%H:%M:%S IST')}")
            run_once()
            logger.info(f"Sleeping {POLL_INTERVAL_SECONDS}s until next fetch...")
            time.sleep(POLL_INTERVAL_SECONDS)
        else:
            # Check again in 60 seconds when market is closed
            if now.hour < 9 or (now.hour == 9 and now.minute < 15):
                wait_msg = "Market not open yet"
            elif now.hour >= 15 and now.minute >= 30:
                wait_msg = "Market closed for today"
            else:
                wait_msg = "Weekend — market closed"

            logger.info(f"💤 {wait_msg}. Checking again in 60s.")
            time.sleep(60)


if __name__ == "__main__":
    main()
