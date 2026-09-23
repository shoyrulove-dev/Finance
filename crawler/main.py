from __future__ import annotations

import asyncio
import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from dotenv import load_dotenv
from pymongo import MongoClient, UpdateOne

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("finance-crawler")

ASSETS = [
    ("bitcoin", "BTC"), ("ethereum", "ETH"), ("tether", "USDT"),
    ("binancecoin", "BNB"), ("solana", "SOL"), ("usd-coin", "USDC"),
    ("xrp", "XRP"), ("dogecoin", "DOGE"), ("cardano", "ADA"), ("avalanche-2", "AVAX"),
]
INITIAL_ASSET_LIMIT = 100
HISTORICAL_CRYPTO_LIMIT = 20
STOCKS = [("AAPL", "Apple"), ("MSFT", "Microsoft"), ("NVDA", "NVIDIA"), ("AMZN", "Amazon"), ("GOOGL", "Alphabet"), ("META", "Meta Platforms"), ("TSLA", "Tesla"), ("BRK.B", "Berkshire Hathaway"), ("JPM", "JPMorgan Chase"), ("V", "Visa"), ("WMT", "Walmart"), ("LLY", "Eli Lilly"), ("AVGO", "Broadcom"), ("ORCL", "Oracle"), ("NFLX", "Netflix")]


def now() -> datetime:
    return datetime.now(timezone.utc)


async def get_json(client: httpx.AsyncClient, url: str, params: dict[str, Any], headers: dict[str, str] | None = None) -> Any:
    for attempt in range(4):
        response = await client.get(url, params=params, headers=headers)
        if response.status_code in (429, 500, 502, 503, 504):
            delay = min(16, 2**attempt)
            log.warning("%s from %s; retrying in %ss", response.status_code, url, delay)
            await asyncio.sleep(delay)
            continue
        response.raise_for_status()
        return response.json()
    response.raise_for_status()
    return None


async def fetch_coingecko(client: httpx.AsyncClient) -> list[dict[str, Any]]:
    data = await get_json(client, "https://api.coingecko.com/api/v3/coins/markets", {
        "vs_currency": "usd", "order": "market_cap_desc",
        "per_page": INITIAL_ASSET_LIMIT, "page": 1, "sparkline": "false",
    })
    return [{
        "provider": "coingecko", "providerId": item["id"], "slug": item["id"],
        "symbol": item["symbol"].upper(), "name": item["name"], "type": "crypto", "active": True,
        "price": item.get("current_price"), "change24h": item.get("price_change_percentage_24h"),
        "marketCap": item.get("market_cap"), "volume24h": item.get("total_volume"),
        "image": item.get("image"), "fetchedAt": now(),
    } for item in data]


async def enrich_crypto_history(client: httpx.AsyncClient, rows: list[dict[str, Any]]) -> None:
    """Backfill daily history for leading assets once per day without exhausting public API limits."""
    if now().hour != 3:
        return
    for row in rows[:HISTORICAL_CRYPTO_LIMIT]:
        try:
            data = await get_json(client, f"https://api.coingecko.com/api/v3/coins/{row['providerId']}/market_chart", {"vs_currency": "usd", "days": "90", "interval": "daily"})
            row["history"] = [{"price": point[1], "timestamp": datetime.fromtimestamp(point[0] / 1000, timezone.utc)} for point in data.get("prices", []) if point[1] is not None]
            log.info("Backfilled %s daily points for %s", len(row["history"]), row["symbol"])
        except Exception as error:
            log.warning("History unavailable for %s: %s", row["providerId"], error)
        await asyncio.sleep(4)


async def fetch_coinmarketcap(client: httpx.AsyncClient) -> list[dict[str, Any]]:
    key = os.getenv("COINMARKETCAP_API_KEY")
    if not key:
        return []
    data = await get_json(client, "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest", {
        "symbol": ",".join(asset[1] for asset in ASSETS), "convert": "USD",
    }, {"X-CMC_PRO_API_KEY": key})
    result = []
    for symbol, item in data.get("data", {}).items():
        quote = item.get("quote", {}).get("USD", {})
        result.append({"provider": "coinmarketcap", "providerId": str(item["id"]), "slug": item["slug"],
                       "symbol": symbol, "name": item["name"], "type": "crypto", "active": True,
                       "price": quote.get("price"), "change24h": quote.get("percent_change_24h"),
                       "marketCap": quote.get("market_cap"), "volume24h": quote.get("volume_24h"), "fetchedAt": now()})
    return result


async def fetch_binance(client: httpx.AsyncClient) -> list[dict[str, Any]]:
    data = await get_json(client, os.getenv("BINANCE_BASE_URL", "https://api.binance.com") + "/api/v3/ticker/24hr", {})
    symbols = {symbol for _, symbol in ASSETS}
    return [{"provider": "binance", "providerId": item["symbol"], "symbol": item["symbol"].removesuffix("USDT"),
             "price": float(item["lastPrice"]), "change24h": float(item["priceChangePercent"]),
             "volume24h": float(item["quoteVolume"]), "fetchedAt": now()}
            for item in data if item["symbol"].endswith("USDT") and item["symbol"][:-4] in symbols]


async def fetch_coingecko_category(client: httpx.AsyncClient, category: str) -> list[dict[str, Any]]:
    data = await get_json(client, "https://api.coingecko.com/api/v3/coins/markets", {
        "vs_currency": "usd", "category": category, "order": "market_cap_desc",
        "per_page": 50, "page": 1, "sparkline": "false",
    })
    return [{
        "providerId": item.get("id"), "slug": item.get("id"), "symbol": str(item.get("symbol", "")).upper(),
        "name": item.get("name"), "price": item.get("current_price"),
        "change24h": item.get("price_change_percentage_24h"), "marketCap": item.get("market_cap"),
        "volume24h": item.get("total_volume"), "image": item.get("image"),
    } for item in data]


async def fetch_polymarket(client: httpx.AsyncClient) -> list[dict[str, Any]]:
    data = await get_json(client, "https://gamma-api.polymarket.com/markets", {
        "active": "true", "closed": "false", "limit": 50, "order": "volume24hr", "ascending": "false",
    })
    rows = []
    for item in data:
        try:
            outcomes = json.loads(item.get("outcomes") or "[]")
            prices = [float(value) for value in json.loads(item.get("outcomePrices") or "[]")]
        except (TypeError, ValueError, json.JSONDecodeError):
            outcomes, prices = [], []
        rows.append({
            "providerId": item.get("conditionId") or item.get("id"), "slug": item.get("slug"),
            "question": item.get("question"), "outcomes": outcomes, "prices": prices,
            "volume24h": float(item.get("volume24hr") or 0), "liquidity": float(item.get("liquidity") or 0),
            "endDate": item.get("endDate"), "url": f"https://polymarket.com/event/{item.get('slug')}",
        })
    return rows


async def fetch_polygon_stocks(client: httpx.AsyncClient) -> list[dict[str, Any]]:
    key = os.getenv("MASSIVE_API_KEY") or os.getenv("POLYGON_API_KEY")
    if not key:
        return []
    rows = []
    date_to = now().date()
    date_from = date_to - timedelta(days=40)
    for symbol, name in STOCKS:
        data = await get_json(client, f"https://api.massive.com/v2/aggs/ticker/{symbol}/range/1/day/{date_from}/{date_to}", {"adjusted": "true", "sort": "asc", "limit": 40, "apiKey": key})
        bars = data.get("results") or []
        result = bars[-1] if bars else {}
        if result.get("c") is not None:
            previous = bars[-2].get("c") if len(bars) > 1 else None
            change = ((result["c"] - previous) / previous * 100) if previous else None
            history = [{"price": bar.get("c"), "volume24h": bar.get("v"), "timestamp": datetime.fromtimestamp(bar["t"] / 1000, timezone.utc)} for bar in bars if bar.get("c") is not None]
            profile: dict[str, Any] = {}
            detail: dict[str, Any] = {}
            try:
                detail = await get_json(client, f"https://api.massive.com/v3/reference/tickers/{symbol}", {"apiKey": key})
                detail = detail.get("results") or {}
                branding = detail.get("branding") or {}
                profile = {"description": detail.get("description"), "marketCap": detail.get("market_cap"), "industry": detail.get("sic_description"), "primaryExchange": detail.get("primary_exchange"), "website": detail.get("homepage_url"), "logo": branding.get("logo_url")}
            except Exception as error:
                log.warning("Massive profile unavailable for %s: %s", symbol, error)
            rows.append({"provider": "polygon", "providerId": symbol, "slug": symbol.lower().replace(".", "-"), "symbol": symbol, "name": detail.get("name", name), "type": "stock", "active": True, "price": result["c"], "change24h": change, "marketCap": profile.get("marketCap"), "volume24h": result.get("v"), "fetchedAt": now(), "history": history, "profile": profile})
        await asyncio.sleep(12)
    return rows


def write_to_mongodb(rows: list[dict[str, Any]]) -> None:
    uri = os.getenv("MONGODB_URI")
    if not uri:
        raise RuntimeError("MONGODB_URI is required")
    client = MongoClient(uri)
    db = client[os.getenv("MONGODB_DB", "finance")]
    timestamp = now()
    asset_ops, price_ops, history_ops = [], [], []
    for row in rows:
        asset_id = f"{row['provider']}:{row['providerId']}"
        asset_ops.append(UpdateOne({"provider": row["provider"], "providerId": row["providerId"]}, {"$set": {
            "slug": row.get("slug", row["providerId"]), "symbol": row.get("symbol"), "name": row.get("name", row.get("symbol")),
            "type": row.get("type", "crypto"), "active": True, "profile": row.get("profile", {}), "updatedAt": timestamp,
        }}, upsert=True))
        price = {"assetId": asset_id, "provider": row["provider"], "price": row.get("price"),
                 "change24h": row.get("change24h"), "marketCap": row.get("marketCap"),
                 "volume24h": row.get("volume24h"), "currency": "USD", "updatedAt": timestamp}
        price_ops.append(UpdateOne({"assetId": asset_id}, {"$set": price}, upsert=True))
        snapshots = row.get("history") or [{"price": price["price"], "volume24h": price["volume24h"], "timestamp": timestamp}]
        for snapshot in snapshots:
            history = price | {"price": snapshot.get("price"), "volume24h": snapshot.get("volume24h"), "timestamp": snapshot["timestamp"]}
            history_ops.append(UpdateOne({"assetId": asset_id, "timestamp": history["timestamp"]}, {"$set": history}, upsert=True))
    if asset_ops:
        db.assets.bulk_write(asset_ops, ordered=False)
        db.latest_prices.bulk_write(price_ops, ordered=False)
        db.price_history.bulk_write(history_ops, ordered=False)
    db.sync_runs.insert_one({"provider": "market-crawler", "status": "success", "count": len(rows), "startedAt": timestamp, "finishedAt": now()})
    client.close()


def write_market_brief() -> tuple[bool, dict[str, Any]]:
    """Store one daily snapshot so useful market briefs have stable archive URLs."""
    uri = os.getenv("MONGODB_URI")
    if not uri:
        raise RuntimeError("MONGODB_URI is required")
    client = MongoClient(uri)
    db = client[os.getenv("MONGODB_DB", "finance")]
    assets = list(db.assets.find({"active": True}, {"provider": 1, "providerId": 1, "slug": 1, "symbol": 1, "name": 1, "type": 1}))
    asset_map = {f"{asset.get('provider')}:{asset.get('providerId')}": asset for asset in assets}
    prices = list(db.latest_prices.find({"change24h": {"$ne": None}}))

    def leaders(asset_type: str) -> list[dict[str, Any]]:
        candidates = []
        for price in prices:
            asset = asset_map.get(price.get("assetId"))
            if not asset or asset.get("type") != asset_type:
                continue
            candidates.append({
                "slug": asset.get("slug"), "symbol": asset.get("symbol"), "name": asset.get("name"),
                "price": price.get("price"), "change24h": price.get("change24h"),
                "marketCap": price.get("marketCap"), "volume24h": price.get("volume24h"),
            })
        return sorted(candidates, key=lambda item: item.get("change24h") or 0, reverse=True)[:5]

    timestamp = now()
    date_key = timestamp.date().isoformat()
    brief = {
        "date": date_key, "crypto": leaders("crypto"), "stocks": leaders("stock"), "updatedAt": timestamp,
    }
    result = db.market_briefs.update_one({"date": date_key}, {"$set": brief}, upsert=True)
    log.info("Stored market brief for %s", date_key)
    client.close()
    return result.upserted_id is not None, brief


async def send_market_brief_telegram(client: httpx.AsyncClient, brief: dict[str, Any]) -> None:
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        return
    crypto = brief.get("crypto") or []
    stocks = brief.get("stocks") or []

    def line(item: dict[str, Any]) -> str:
        move = float(item.get("change24h") or 0)
        return f"{item.get('symbol', '—')}: {move:+.2f}%"

    sections = [f"Bliss Finance Market Brief — {brief['date']}"]
    if crypto:
        sections.append("Crypto leaders\n" + "\n".join(line(item) for item in crypto[:3]))
    if stocks:
        sections.append("Stock leaders\n" + "\n".join(line(item) for item in stocks[:3]))
    sections.append(f"Read the full brief: https://finance.blissbiovn.com/market-brief/{brief['date']}")
    response = await client.post(
        f"https://api.telegram.org/bot{token}/sendMessage",
        data={"chat_id": chat_id, "text": "\n\n".join(sections), "disable_web_page_preview": "true"},
    )
    response.raise_for_status()
    log.info("Sent daily market brief to Telegram")


def write_discovery_data(rwa: list[dict[str, Any]], tokenized: list[dict[str, Any]], predictions: list[dict[str, Any]]) -> None:
    uri = os.getenv("MONGODB_URI")
    if not uri:
        raise RuntimeError("MONGODB_URI is required")
    client = MongoClient(uri)
    db = client[os.getenv("MONGODB_DB", "finance")]
    timestamp = now()
    for category, rows in (("rwa", rwa), ("tokenized-stock", tokenized)):
        db.category_markets.update_many({"category": category}, {"$set": {"active": False}})
        if rows:
            db.category_markets.bulk_write([UpdateOne({"category": category, "providerId": row["providerId"]}, {"$set": row | {"category": category, "active": True, "updatedAt": timestamp}}, upsert=True) for row in rows], ordered=False)
    db.prediction_markets.update_many({}, {"$set": {"active": False}})
    if predictions:
        db.prediction_markets.bulk_write([UpdateOne({"providerId": row["providerId"]}, {"$set": row | {"active": True, "updatedAt": timestamp}}, upsert=True) for row in predictions], ordered=False)
    log.info("Stored discovery data: %s RWA, %s tokenized stocks, %s prediction markets", len(rwa), len(tokenized), len(predictions))
    client.close()


async def refresh_discovery_data() -> None:
    async with httpx.AsyncClient(timeout=30, headers={"User-Agent": "BlissFinanceCrawler/0.1"}) as client:
        rwa = await fetch_coingecko_category(client, "real-world-assets-rwa")
        await asyncio.sleep(4)
        tokenized = await fetch_coingecko_category(client, "tokenized-stock")
        await asyncio.sleep(4)
        predictions = await fetch_polymarket(client)
        write_discovery_data(rwa, tokenized, predictions)


async def main() -> None:
    async with httpx.AsyncClient(timeout=20, headers={"User-Agent": "BlissFinanceCrawler/0.1"}) as client:
        rows: list[dict[str, Any]] = []
        try:
            rows = await fetch_coingecko(client)
            log.info("CoinGecko returned %s assets", len(rows))
        except Exception as error:
            log.warning("CoinGecko failed: %s", error)
            rows = await fetch_coinmarketcap(client)
        if not rows:
            rows = await fetch_coinmarketcap(client)
        if not rows:
            raise RuntimeError("No aggregated market data provider returned data")
        await enrich_crypto_history(client, rows)
        write_to_mongodb(rows)
        log.info("Stored %s normalized asset records", len(rows))
        stocks = await fetch_polygon_stocks(client)
        if stocks:
            write_to_mongodb(stocks)
            log.info("Stored %s stock records", len(stocks))
        is_new_brief, brief = write_market_brief()
        if is_new_brief:
            try:
                await send_market_brief_telegram(client, brief)
            except Exception as error:
                log.warning("Daily Telegram brief failed: %s", error)
        if now().hour % 6 == 4:
            rwa = await fetch_coingecko_category(client, "real-world-assets-rwa")
            await asyncio.sleep(4)
            tokenized = await fetch_coingecko_category(client, "tokenized-stock")
            await asyncio.sleep(4)
            predictions = await fetch_polymarket(client)
            write_discovery_data(rwa, tokenized, predictions)


if __name__ == "__main__":
    asyncio.run(main())
