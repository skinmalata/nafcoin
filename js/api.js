// Cache system to minimize API rate limiting
const Cache = {
    get(key) {
        try {
            const item = localStorage.getItem('cg_cache_' + key);
            if (!item) return null;
            const { data, timestamp, ttl } = JSON.parse(item);
            if (Date.now() - timestamp > ttl) {
                localStorage.removeItem('cg_cache_' + key);
                return null;
            }
            return data;
        } catch (e) { return null; }
    },
    set(key, data, ttl = 120000) {
        try {
            localStorage.setItem('cg_cache_' + key, JSON.stringify({
                data,
                timestamp: Date.now(),
                ttl
            }));
        } catch (e) {
            // If localStorage is full, clear oldest entries
            this.clearOldest();
            this.set(key, data, ttl);
        }
    },
    clearOldest() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('cg_cache_')) {
                try {
                    const item = JSON.parse(localStorage.getItem(key));
                    keys.push({ key, timestamp: item.timestamp });
                } catch (e) {}
            }
        }
        keys.sort((a, b) => a.timestamp - b.timestamp);
        for (let i = 0; i < Math.min(5, keys.length); i++) {
            localStorage.removeItem(keys[i].key);
        }
    },
    invalidate(key) {
        localStorage.removeItem('cg_cache_' + key);
    }
};

const API = {
    coingecko: {
        base: 'https://api.coingecko.com/api/v3',
        retryCount: 0,
        maxRetries: 3,
        async getPrices(ids = null, perPage = 50) {
            const cacheKey = ids ? 'prices_' + ids.join('-') : 'top_' + perPage;
            const cached = Cache.get(cacheKey);
            if (cached) return cached;

            let url = `${this.base}/coins/markets?vs_currency=usd&sparkline=true&price_change_percentage=24h%2C7d%2C30d&per_page=100&page=1`;
            if (ids && ids.length > 0) {
                url = `${this.base}/coins/markets?vs_currency=usd&ids=${ids.join(',')}&sparkline=true&price_change_percentage=24h%2C7d%2C30d`;
            } else {
                url += `&order=market_cap_desc&per_page=${perPage}&page=1`;
            }

            try {
                const res = await fetch(url);
                if (!res.ok) throw new Error('CoinGecko API error');
                const data = await res.json();
                Cache.set(cacheKey, data, 120000); // 2 min cache
                this.retryCount = 0;
                return data;
            } catch (e) {
                this.retryCount++;
                if (this.retryCount <= this.maxRetries) {
                    const delay = Math.min(1000 * Math.pow(2, this.retryCount), 8000);
                    await new Promise(r => setTimeout(r, delay));
                    return this.getPrices(ids, perPage);
                }
                throw e;
            }
        }
    },
    binance: {
        base: 'https://api.binance.com/api/v3',
        async getPrices() {
            const cacheKey = 'binance_ticker';
            const cached = Cache.get(cacheKey);
            if (cached) return cached;

            const res = await fetch(`${this.base}/ticker/24hr`);
            if (!res.ok) throw new Error('Binance API error');
            const data = await res.json();
            const filtered = data.filter(d => d.symbol.endsWith('USDT')).slice(0, 20);
            Cache.set(cacheKey, filtered, 60000); // 1 min cache
            return filtered;
        }
    },
    defillama: {
        base: 'https://api.llama.fi',
        async getProtocols() {
            const cacheKey = 'defi_protocols';
            const cached = Cache.get(cacheKey);
            if (cached) return cached;

            const res = await fetch(`${this.base}/protocols`);
            if (!res.ok) throw new Error('DeFiLlama API error');
            const data = await res.json();
            Cache.set(cacheKey, data, 300000); // 5 min cache
            return data;
        }
    },
    exchange_tickers: {
        async getTickers(coinId = 'bitcoin') {
            const cacheKey = 'tickers_' + coinId;
            const cached = Cache.get(cacheKey);
            if (cached) return cached;

            const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/tickers?include_exchange_logo=false&page=1`);
            if (!res.ok) throw new Error(`CoinGecko tickers error: ${res.status}`);
            const data = await res.json();
            const tickers = (data.tickers || []).filter(t => 
                !t.is_anomaly && 
                !t.is_stale && 
                t.converted_last?.usd && 
                parseFloat(t.converted_last.usd) > 0 &&
                parseFloat(t.volume || 0) > 1000
            );
            Cache.set(cacheKey, tickers, 45000); // 45 sec cache
            return tickers;
        }
    },
    rapidapi_arbitrage: {
        base: 'https://crypto-arbitrage3.p.rapidapi.com',
        async getArbitrage(coin = 'btc', exchange = '') {
            const apiKey = localStorage.getItem('rapidapi-key');
            if (!apiKey) throw new Error('Live arbitrage data is not configured');

            const cacheKey = 'arbitrage_' + coin + '_' + exchange;
            const cached = Cache.get(cacheKey);
            if (cached) return cached;

            let url = `${this.base}/crypto-arbitrage?coin=${coin}`;
            if (exchange) url += `&exchange=${exchange}`;
            
            const res = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-RapidAPI-Key': apiKey,
                    'X-RapidAPI-Host': 'crypto-arbitrage3.p.rapidapi.com',
                    'Content-Type': 'application/json'
                }
            });
            if (!res.ok) throw new Error(`RapidAPI error: ${res.status}`);
            const data = await res.json();
            Cache.set(cacheKey, data, 30000); // 30 sec cache
            return data;
        }
    },
    coingecko_global: {
        base: 'https://api.coingecko.com/api/v3',
        async getGlobalData() {
            const cacheKey = 'global_data';
            const cached = Cache.get(cacheKey);
            if (cached) return cached;

            const res = await fetch(`${this.base}/global`);
            if (!res.ok) throw new Error('CoinGecko Global API error');
            const data = await res.json();
            Cache.set(cacheKey, data, 120000); // 2 min cache
            return data;
        },
        async getTopCoins(limit = 5) {
            const cacheKey = 'top_coins_' + limit;
            const cached = Cache.get(cacheKey);
            if (cached) return cached;

            const res = await fetch(`${this.base}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage=24h`);
            if (!res.ok) throw new Error('CoinGecko API error');
            const data = await res.json();
            Cache.set(cacheKey, data, 120000); // 2 min cache
            return data;
        }
    }
};
