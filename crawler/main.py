from __future__ import annotations

import asyncio
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
INITIAL_ASSET_LIMIT = 50
STOCKS = [("AAPL", "Apple"), ("MSFT", "Microsoft"), ("NVDA", "NVIDIA"), ("AMZN", "Amazon"), ("GOOGL", "Alphabet"), ("META", "Meta Platforms"), ("TSLA", "Tesla"), ("BRK.B", "Berkshire Hathaway"), ("JPM", "JPMorgan Chase"), ("V", "Visa")]


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
            rows.append({"provider": "polygon", "providerId": symbol, "slug": symbol.lower().replace(".", "-"), "symbol": symbol, "name": name, "type": "stock", "active": True, "price": result["c"], "change24h": change, "volume24h": result.get("v"), "fetchedAt": now(), "history": history})
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
            "type": row.get("type", "crypto"), "active": True, "updatedAt": timestamp,
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
        write_to_mongodb(rows)
        log.info("Stored %s normalized asset records", len(rows))
        stocks = await fetch_polygon_stocks(client)
        if stocks:
            write_to_mongodb(stocks)
            log.info("Stored %s stock records", len(stocks))


if __name__ == "__main__":
    asyncio.run(main())
