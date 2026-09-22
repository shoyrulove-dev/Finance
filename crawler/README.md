# Finance market crawler

The crawler normalizes market data from CoinGecko, CoinMarketCap and Binance before writing it to MongoDB. It is intentionally separate from the Next.js app and should run on a VPS, workstation or scheduled worker.

## Run

```bash
py -3.12 -m venv .venv
.venv\\Scripts\\activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
copy .env.example .env
python main.py
```

On Windows, use Python 3.12 for this crawler. Python 3.14 may currently have pip/package compatibility issues with some dependencies.

The first run uses CoinGecko's public endpoint and seeds the top 50 crypto assets by market cap. CoinMarketCap is optional and only used as a fallback when `COINMARKETCAP_API_KEY` is configured.
