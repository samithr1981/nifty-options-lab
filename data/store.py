"""
store.py
--------
Persists option chain snapshots to SQLite.

WHY SQLITE:
  No server needed. Single file. Works on any machine.
  Every 5-minute snapshot is stored with timestamp.
  This lets you build IV history, track OI buildup, spot unusual activity.

DATABASE SCHEMA:
  snapshots table: one row per fetch (metadata)
  option_rows table: one row per strike per snapshot
"""

import sqlite3
import json
import logging
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).parent.parent / "data" / "options.db"


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row  # allows dict-like access
    return conn


def init_db():
    """Create tables if they don't exist."""
    conn = get_connection()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS snapshots (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol      TEXT NOT NULL,
            expiry      TEXT NOT NULL,
            spot        REAL NOT NULL,
            fetched_at  TEXT NOT NULL,
            row_count   INTEGER
        );

        CREATE TABLE IF NOT EXISTS option_rows (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            snapshot_id INTEGER NOT NULL REFERENCES snapshots(id),
            strike      REAL NOT NULL,
            expiry      TEXT NOT NULL,
            call_oi     REAL, call_chg_oi REAL, call_volume REAL,
            call_iv     REAL, call_ltp    REAL,
            put_oi      REAL, put_chg_oi  REAL, put_volume  REAL,
            put_iv      REAL, put_ltp     REAL,
            spot        REAL,
            fetched_at  TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_rows_snapshot ON option_rows(snapshot_id);
        CREATE INDEX IF NOT EXISTS idx_rows_strike   ON option_rows(strike);
        CREATE INDEX IF NOT EXISTS idx_snap_fetched  ON snapshots(fetched_at);
    """)
    conn.commit()
    conn.close()
    logger.info(f"Database initialised at {DB_PATH}")


def save_snapshot(symbol: str, expiry: str, rows: list[dict]) -> int:
    """
    Save a full option chain snapshot.
    Returns the snapshot_id.
    """
    if not rows:
        logger.warning("No rows to save.")
        return -1

    spot = rows[0]["spot"]
    fetched_at = rows[0]["fetched_at"]

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "INSERT INTO snapshots (symbol, expiry, spot, fetched_at, row_count) VALUES (?,?,?,?,?)",
        (symbol, expiry, spot, fetched_at, len(rows))
    )
    snapshot_id = cur.lastrowid

    cur.executemany("""
        INSERT INTO option_rows
          (snapshot_id, strike, expiry,
           call_oi, call_chg_oi, call_volume, call_iv, call_ltp,
           put_oi,  put_chg_oi,  put_volume,  put_iv,  put_ltp,
           spot, fetched_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, [(
        snapshot_id, r["strike"], r["expiry"],
        r["call_oi"], r["call_chg_oi"], r["call_volume"], r["call_iv"], r["call_ltp"],
        r["put_oi"],  r["put_chg_oi"],  r["put_volume"],  r["put_iv"],  r["put_ltp"],
        r["spot"], r["fetched_at"]
    ) for r in rows])

    conn.commit()
    conn.close()
    logger.info(f"Saved snapshot #{snapshot_id}: {len(rows)} rows at {fetched_at}")
    return snapshot_id


def get_latest_snapshot(symbol: str = "NIFTY") -> list[dict]:
    """Return the most recently fetched option chain rows."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT r.* FROM option_rows r
        JOIN snapshots s ON r.snapshot_id = s.id
        WHERE s.symbol = ?
        ORDER BY s.fetched_at DESC, r.strike ASC
        LIMIT 500
    """, (symbol,))
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


def get_oi_history(symbol: str, strike: float, n_snapshots: int = 50) -> list[dict]:
    """
    Get OI history for a specific strike across last N snapshots.
    Useful for detecting OI buildup or unwinding.
    """
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT s.fetched_at, r.call_oi, r.put_oi, r.call_iv, r.put_iv, r.spot
        FROM option_rows r
        JOIN snapshots s ON r.snapshot_id = s.id
        WHERE s.symbol = ? AND r.strike = ?
        ORDER BY s.fetched_at DESC
        LIMIT ?
    """, (symbol, strike, n_snapshots))
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows
