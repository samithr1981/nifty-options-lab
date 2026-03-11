"""
fetch_nse.py
------------
Fetches live NIFTY option chain from NSE India.

HOW NSE WORKS:
  NSE does NOT have a public API. But its website loads option chain data
  via an internal JSON endpoint. To access it, you must:
  1. First hit the NSE homepage → this sets cookies (nsit, nseappid, etc.)
  2. Then hit the actual data endpoint with those cookies + correct headers
  Without step 1, you get a 401/403. This is by design — NSE blocks bots.

  CRITICAL: The homepage hit MUST use document-type headers (no XHR headers).
  The API hit MUST use XHR-type headers with the correct Referer.
  Mixing these up causes immediate 403 from Akamai CDN.

RATE LIMITING:
  NSE blocks IPs that hammer them. We wait 5 seconds between calls.
  During market hours (9:15–15:30 IST) we poll every 5 minutes.

FALLBACK:
  If requests keeps getting 403'd (TLS fingerprinting), install curl_cffi:
    pip install curl_cffi
  The code will auto-detect and use it.
"""

import json
import logging
import random
import time
from datetime import datetime

import pytz

logger = logging.getLogger(__name__)

# ── Try curl_cffi first (spoofs Chrome TLS fingerprint), else fall back ────
try:
    from curl_cffi import requests
    _SESSION_KWARGS = {"impersonate": "chrome120"}
    logger.info("Using curl_cffi (Chrome TLS fingerprint spoofing)")
except ImportError:
    import requests
    _SESSION_KWARGS = {}
    logger.info("Using standard requests (install curl_cffi for better success rate)")

# ── Phase 1: document-type headers for homepage hit ────────────────────────
_HEADERS_DOCUMENT = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;"
        "q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
    ),
    "Accept-Language": "en-IN,en-GB;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Cache-Control": "max-age=0",
}

# ── Phase 2: XHR-type headers for the option-chain page warm-up ────────────
_HEADERS_NAV = {
    **_HEADERS_DOCUMENT,
    "Referer": "https://www.nseindia.com/",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?0",  # no user gesture for internal nav
}

# ── Phase 3: API fetch headers ─────────────────────────────────────────────
_HEADERS_API = {
    "User-Agent": _HEADERS_DOCUMENT["User-Agent"],
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-IN,en-GB;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://www.nseindia.com/option-chain",
    "X-Requested-With": "XMLHttpRequest",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "Connection": "keep-alive",
}

NSE_HOME = "https://www.nseindia.com"
NSE_OPTION_CHAIN_PAGE = "https://www.nseindia.com/option-chain"
NSE_OPTION_CHAIN_URL = "https://www.nseindia.com/api/option-chain-indices?symbol={symbol}"


def _create_session() -> requests.Session:
    """
    Create a warmed-up session with NSE cookies via 3-phase handshake:
      1. Homepage  → document headers  → sets nsit / nseappid cookies
      2. Option-chain page → nav headers → primes Referer for API
      3. Session returned; caller does API hit with _HEADERS_API

    Why 3 phases:
      Akamai checks that the Referer on the API call matches a page
      the session actually visited. Skipping phase 2 causes 403 on
      the API hit even if phase 1 succeeded.
    """
    session = requests.Session(**_SESSION_KWARGS)

    # ── Phase 1: homepage ──────────────────────────────────────────────────
    logger.info("Phase 1: hitting NSE homepage to establish session cookies...")
    session.headers.update(_HEADERS_DOCUMENT)
    try:
        resp = session.get(NSE_HOME, timeout=15)
        resp.raise_for_status()
        logger.info(f"Homepage OK. Cookies set: {list(session.cookies.keys())}")
    except requests.RequestException as e:
        logger.error(f"Failed to establish NSE session: {e}")
        raise

    time.sleep(random.uniform(1.5, 2.5))  # human-like pause

    # ── Phase 2: option-chain page warm-up ────────────────────────────────
    logger.info("Phase 2: warming up option-chain page...")
    session.headers.update(_HEADERS_NAV)
    try:
        resp = session.get(NSE_OPTION_CHAIN_PAGE, timeout=15)
        resp.raise_for_status()
        logger.info("Option-chain page loaded OK")
    except requests.RequestException as e:
        # Non-fatal — proceed anyway, may still work
        logger.warning(f"Option-chain page warm-up failed (non-fatal): {e}")

    time.sleep(random.uniform(1.0, 2.0))

    return session


def _get_valid_session(max_attempts: int = 5) -> requests.Session:
    """
    Keep trying to build a session until we see real NSE cookies (nsit / nseappid).
    Akamai sometimes issues challenge cookies first; we retry until it resolves.

    Real NSE cookies to look for: nsit, nseappid
    Akamai-only cookies (not sufficient): AKA_A2, _abck, ak_bmsc, bm_sz
    """
    NSE_SESSION_COOKIES = {"nsit", "nseappid"}

    for attempt in range(1, max_attempts + 1):
        try:
            session = _create_session()
            got = set(session.cookies.keys())
            missing = NSE_SESSION_COOKIES - got
            if not missing:
                logger.info(f"Valid NSE session established. Cookies: {list(got)}")
                return session
            else:
                logger.warning(
                    f"Session attempt {attempt}: missing NSE cookies {missing}. "
                    f"Got only: {list(got)} — likely still in Akamai challenge phase."
                )
        except requests.RequestException as e:
            logger.warning(f"Session attempt {attempt} failed: {e}")

        if attempt < max_attempts:
            backoff = 8 * attempt + random.uniform(2, 5)
            logger.info(f"Waiting {backoff:.1f}s before retry...")
            time.sleep(backoff)

    raise RuntimeError(
        f"Could not establish valid NSE session after {max_attempts} attempts. "
        "NSE cookies (nsit, nseappid) never appeared — IP may be range-blocked by Akamai. "
        "Install curl_cffi (`pip install curl_cffi`) or try from a different network."
    )


def fetch_option_chain(symbol: str = "NIFTY", api_retries: int = 3) -> dict:
    """
    Fetch live option chain for a given symbol from NSE.

    Strategy:
      - Build ONE valid session (retrying until nsit/nseappid cookies appear)
      - Then retry only the API call on transient failures (not the whole session)

    Args:
        symbol:      "NIFTY", "BANKNIFTY", "FINNIFTY", etc.
        api_retries: retries for the API call after session is established

    Returns:
        dict with keys:
          - records.data: list of option chain rows
          - records.underlyingValue: current spot price
          - records.expiryDates: list of available expiry dates
          - _fetched_at: IST timestamp string

    Raises:
        RuntimeError if a valid session can't be established
        requests.RequestException on network failure after all retries
        ValueError if response format unexpected
    """
    url = NSE_OPTION_CHAIN_URL.format(symbol=symbol)

    # Build a session with real NSE cookies — retry until we get them
    session = _get_valid_session()
    session.headers.update(_HEADERS_API)

    last_exc = None
    for attempt in range(1, api_retries + 1):
        try:
            logger.info(f"Fetching option chain for {symbol} (attempt {attempt}/{api_retries})...")
            resp = session.get(url, timeout=15)
            resp.raise_for_status()

            data = resp.json()

            # Empty list [] = Akamai bot challenge response
            if isinstance(data, list):
                raise ValueError(
                    f"NSE returned a list instead of dict — Akamai challenge not yet resolved. "
                    f"Response: {str(data)[:200]}"
                )

            if "records" not in data:
                raise ValueError(f"Unexpected NSE response format: {list(data.keys())}")

            logger.info(
                f"Fetched {len(data['records'].get('data', []))} rows. "
                f"Spot: {data['records'].get('underlyingValue')}"
            )
            data["_fetched_at"] = datetime.now(pytz.timezone("Asia/Kolkata")).isoformat()
            return data

        except (requests.RequestException, ValueError) as e:
            last_exc = e
            if attempt < api_retries:
                backoff = 5 * attempt + random.uniform(1, 3)
                logger.warning(f"API attempt {attempt} failed: {e}. Retrying in {backoff:.1f}s...")
                time.sleep(backoff)
            else:
                logger.error(f"All {api_retries} API attempts failed.")

    raise last_exc


def parse_option_chain(raw: dict, expiry: str = None) -> list[dict]:
    """
    Parse raw NSE response into a clean list of option rows.

    Args:
        raw:    raw dict from fetch_option_chain()
        expiry: filter to specific expiry date string e.g. "30-Mar-2026"
                If None, uses nearest expiry.

    Returns:
        List of dicts, each with:
          strike, expiry,
          call_oi, call_chg_oi, call_volume, call_iv, call_ltp, call_bid, call_ask,
          put_oi,  put_chg_oi,  put_volume,  put_iv,  put_ltp,  put_bid,  put_ask,
          spot, fetched_at
    """
    records = raw.get("records", {})
    spot = records.get("underlyingValue", 0)
    all_expiries = records.get("expiryDates", [])
    fetched_at = raw.get("_fetched_at", "")

    if expiry is None and all_expiries:
        expiry = all_expiries[0]
        logger.info(f"Using nearest expiry: {expiry}")

    rows = []
    for item in records.get("data", []):
        if expiry and item.get("expiryDate") != expiry:
            continue

        strike = item.get("strikePrice", 0)
        ce = item.get("CE", {})
        pe = item.get("PE", {})

        rows.append({
            "strike": strike,
            "expiry": item.get("expiryDate", ""),
            # CALL fields
            "call_oi": ce.get("openInterest", 0),
            "call_chg_oi": ce.get("changeinOpenInterest", 0),
            "call_volume": ce.get("totalTradedVolume", 0),
            "call_iv": ce.get("impliedVolatility", 0),
            "call_ltp": ce.get("lastPrice", 0),
            "call_bid": ce.get("bidprice", 0),
            "call_ask": ce.get("askPrice", 0),
            # PUT fields
            "put_oi": pe.get("openInterest", 0),
            "put_chg_oi": pe.get("changeinOpenInterest", 0),
            "put_volume": pe.get("totalTradedVolume", 0),
            "put_iv": pe.get("impliedVolatility", 0),
            "put_ltp": pe.get("lastPrice", 0),
            "put_bid": pe.get("bidprice", 0),
            "put_ask": pe.get("askPrice", 0),
            # Meta
            "spot": spot,
            "fetched_at": fetched_at,
        })

    logger.info(f"Parsed {len(rows)} rows for expiry {expiry}")
    return rows


def is_market_open() -> bool:
    """
    Returns True if NSE market is currently open.
    Market hours: Mon–Fri, 9:15 AM – 3:30 PM IST
    """
    ist = pytz.timezone("Asia/Kolkata")
    now = datetime.now(ist)

    if now.weekday() >= 5:  # Saturday=5, Sunday=6
        return False

    market_open = now.replace(hour=9, minute=15, second=0, microsecond=0)
    market_close = now.replace(hour=15, minute=30, second=0, microsecond=0)
    return market_open <= now <= market_close


# ── Quick test when run directly ───────────────────────────────────────────
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    if not is_market_open():
        print("⚠️  Market is currently closed. NSE may return stale data.")
        print("   Market hours: Mon–Fri 9:15 AM – 3:30 PM IST")

    print("\nFetching NIFTY option chain...")
    raw = fetch_option_chain("NIFTY")
    rows = parse_option_chain(raw)

    print(f"\n✅ Fetched {len(rows)} rows")
    print(f"   Spot: ₹{rows[0]['spot']:,.2f}" if rows else "No rows")
    print(f"   Expiries: {raw['records']['expiryDates'][:3]}")
    if rows:
        print(f"\nSample row (ATM area):")
        spot = rows[0]["spot"]
        atm = min(rows, key=lambda r: abs(r["strike"] - spot))
        for k, v in atm.items():
            print(f"  {k}: {v}")
