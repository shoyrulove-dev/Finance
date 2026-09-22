# Finance market crawler

The crawler normalizes market data from CoinGecko, CoinMarketCap and Binance before writing it to MongoDB. It is intentionally separate from the Next.js app and should run on a VPS, workstation or scheduled worker.

## Run

```bash
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
copy .env.example .env
python main.py
```

The first run uses CoinGecko's public endpoint and seeds the initial crypto assets. CoinMarketCap is optional and only used when `COINMARKETCAP_API_KEY` is configured.
