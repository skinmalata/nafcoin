let arbInterval;
let arbCountdown;
let cachedOpportunities = [];
let arbActiveCoin = 'all';

const COIN_MAP = {
    'btc': { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
    'eth': { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
    'sol': { id: 'solana', symbol: 'SOL', name: 'Solana' },
    'bnb': { id: 'binancecoin', symbol: 'BNB', name: 'BNB' },
    'xrp': { id: 'ripple', symbol: 'XRP', name: 'XRP' },
    'doge': { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
    'ada': { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
    'avax': { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche' },
    'link': { id: 'chainlink', symbol: 'LINK', name: 'Chainlink' },
    'dot': { id: 'polkadot', symbol: 'DOT', name: 'Polkadot' }
};

function debounceArb(fn, wait) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); };
}

function startArbCountdown() {
    const el = document.getElementById('arb-countdown');
    if (!el) return;
    let sec = 60;
    if (arbCountdown) clearInterval(arbCountdown);
    el.textContent = '60s';
    arbCountdown = setInterval(() => {
        sec--;
        el.textContent = sec + 's';
        if (sec <= 0) sec = 60;
    }, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('scan-arbitrage')?.addEventListener('click', () => scanArbitrage());

    document.getElementById('arbitrage-search')?.addEventListener('input', debounceArb((e) => {
        filterArbitrage(e.target.value);
    }, 250));

    document.getElementById('arbitrage-sort')?.addEventListener('change', () => {
        sortAndRender(cachedOpportunities);
    });

    document.getElementById('arbitrage-fee')?.addEventListener('input', () => {
        sortAndRender(cachedOpportunities);
    });

    document.getElementById('arbitrage-min-profit')?.addEventListener('change', () => {
        sortAndRender(cachedOpportunities);
    });

    document.getElementById('arbitrage-amount')?.addEventListener('input', () => {
        sortAndRender(cachedOpportunities);
    });

    document.getElementById('arbitrage-coin')?.addEventListener('change', () => {
        arbActiveCoin = document.getElementById('arbitrage-coin').value;
        scanArbitrage();
    });

    document.getElementById('arb-auto-refresh')?.addEventListener('change', (e) => {
        if (e.target.checked) {
            if (arbInterval) clearInterval(arbInterval);
            arbInterval = setInterval(scanArbitrage, 60000);
            startArbCountdown();
        } else {
            if (arbInterval) clearInterval(arbInterval);
            if (arbCountdown) clearInterval(arbCountdown);
            const el = document.getElementById('arb-countdown');
            if (el) el.textContent = 'OFF';
        }
    });

    scanArbitrage();
});

async function scanArbitrage() {
    const list = document.getElementById('tool-content');
    const coinSelect = document.getElementById('arbitrage-coin');
    const selectedCoin = coinSelect ? coinSelect.value : 'all';
    const timestampEl = document.getElementById('arb-timestamp');

    arbActiveCoin = selectedCoin;
    list.innerHTML = '<div class="loading" style="grid-column:1/-1;text-align:center;padding:3rem;"><div class="loading-spinner"></div><p style="font-weight:600;">Scanning live order books across major exchanges...</p></div>';

    try {
        let opps = [];

        // 1. Try RapidAPI if a user key is provided in localStorage
        const rapidKey = localStorage.getItem('rapidapi-key');
        if (rapidKey) {
            try {
                if (selectedCoin === 'all') {
                    const coinKeys = Object.keys(COIN_MAP).slice(0, 5);
                    const res = await Promise.allSettled(coinKeys.map(c => API.rapidapi_arbitrage.getArbitrage(c)));
                    res.forEach(r => {
                        if (r.status === 'fulfilled' && Array.isArray(r.value)) opps.push(...parseRapidOpportunities(r.value));
                    });
                } else {
                    const data = await API.rapidapi_arbitrage.getArbitrage(selectedCoin);
                    if (Array.isArray(data)) opps = parseRapidOpportunities(data);
                }
            } catch (rapidErr) {
                console.warn('RapidAPI error, falling back to live public exchange tickers:', rapidErr);
            }
        }

        // 2. If no opportunities from RapidAPI, scan live multi-exchange tickers
        if (!opps || opps.length === 0) {
            const coinsToScan = (selectedCoin === 'all')
                ? ['btc', 'eth', 'sol', 'bnb', 'xrp', 'avax']
                : [selectedCoin];

            const tickerResults = await Promise.allSettled(
                coinsToScan.map(async (cKey) => {
                    const meta = COIN_MAP[cKey] || { id: 'bitcoin', symbol: cKey.toUpperCase(), name: cKey.toUpperCase() };
                    const tickers = await API.exchange_tickers.getTickers(meta.id);
                    return { meta, tickers };
                })
            );

            tickerResults.forEach(r => {
                if (r.status === 'fulfilled' && r.value.tickers) {
                    opps.push(...extractOpportunitiesFromTickers(r.value.meta, r.value.tickers));
                }
            });
        }

        cachedOpportunities = opps;

        if (!cachedOpportunities || cachedOpportunities.length === 0) {
            list.innerHTML = `
                <div class="empty-state" style="grid-column:1/-1;text-align:center;padding:3rem;background:var(--bg-card);border-radius:16px;border:1px solid rgba(255,255,255,0.1);">
                    <p style="font-size:2rem;margin-bottom:1rem;">⚡</p>
                    <p style="font-size:1.125rem;font-weight:600;margin-bottom:0.5rem;">No profitable arbitrage spreads detected</p>
                    <p style="color:var(--text-secondary);">Currently, price spreads across major exchanges are tight. Try selecting another coin or lowering your minimum profit filter.</p>
                </div>
            `;
            if (timestampEl) timestampEl.textContent = 'Last scan: ' + new Date().toLocaleTimeString();
            return;
        }

        sortAndRender(cachedOpportunities);
        if (timestampEl) timestampEl.textContent = 'Last updated: ' + new Date().toLocaleTimeString();
        startArbCountdown();

        const autoRefresh = document.getElementById('arb-auto-refresh');
        if (arbInterval) clearInterval(arbInterval);
        if (!autoRefresh || autoRefresh.checked) {
            arbInterval = setInterval(scanArbitrage, 60000);
        }

    } catch (err) {
        console.error('Arbitrage scan error:', err);
        cachedOpportunities = [];
        list.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;text-align:center;padding:3rem;background:var(--bg-card);border-radius:16px;border:1px solid rgba(255,255,255,0.1);">
                <p style="font-size:2rem;margin-bottom:1rem;">⚠️</p>
                <p style="font-size:1.125rem;font-weight:600;margin-bottom:0.5rem;">Market Feeds Temporarily Unavailable</p>
                <p style="color:var(--text-secondary);margin-bottom:1rem;">${err.message || 'Unable to scan exchange tickers.'}</p>
                <button class="btn btn-primary" onclick="scanArbitrage()">Retry Scan</button>
            </div>
        `;
        if (timestampEl) timestampEl.textContent = 'Scan paused';
    }
}

function extractOpportunitiesFromTickers(meta, tickers) {
    if (!tickers || tickers.length < 2) return [];

    // Select the highest volume USD/USDT ticker per exchange
    const exchangeMap = new Map();
    tickers.forEach(t => {
        const exName = t.market?.name;
        if (!exName) return;
        const target = (t.target || '').toUpperCase();
        if (!['USDT', 'USD', 'USDC'].includes(target)) return;

        const price = parseFloat(t.converted_last?.usd) || 0;
        const vol = parseFloat(t.volume || 0) * price;
        if (price <= 0 || vol < 5000) return;

        const existing = exchangeMap.get(exName);
        if (!existing || existing.vol < vol) {
            exchangeMap.set(exName, {
                exchange: exName,
                price,
                vol,
                tradeUrl: t.trade_url || exchangeUrl(exName, meta.symbol),
                trustScore: t.trust_score || 'green',
                bidAskSpread: parseFloat(t.bid_ask_spread_percentage) || 0
            });
        }
    });

    const exchangeList = Array.from(exchangeMap.values()).sort((a, b) => a.price - b.price);
    if (exchangeList.length < 2) return [];

    const opps = [];
    const minExchange = exchangeList[0];

    // Compare cheapest exchange against other exchanges
    for (let i = 1; i < exchangeList.length; i++) {
        const higher = exchangeList[i];
        const spread = higher.price - minExchange.price;
        const grossPercent = (spread / minExchange.price) * 100;

        // Realistic threshold: filter out micro-fluctuations or extreme 50%+ stale errors
        if (grossPercent >= 0.05 && grossPercent <= 15.0) {
            opps.push({
                coin: meta.name,
                symbol: `${meta.symbol}/USDT`,
                buyExchange: minExchange.exchange,
                buyPrice: minExchange.price,
                buyUrl: minExchange.tradeUrl,
                sellExchange: higher.exchange,
                sellPrice: higher.price,
                sellUrl: higher.tradeUrl,
                spread,
                profitPercent: grossPercent,
                volume: Math.min(minExchange.vol, higher.vol)
            });
        }
    }

    return opps;
}

function parseRapidOpportunities(data) {
    return data.map(opp => {
        const buyPrice = parseFloat(opp.buy_price) || 0;
        const sellPrice = parseFloat(opp.sell_price) || 0;
        const profitPct = parseFloat(opp.profit_percent) || 0;
        const spread = sellPrice - buyPrice;
        return {
            coin: opp.coin || 'Crypto',
            symbol: opp.symbol || opp.pair || '',
            buyExchange: opp.buy_exchange || 'Exchange A',
            buyPrice,
            buyUrl: exchangeUrl(opp.buy_exchange, opp.symbol),
            sellExchange: opp.sell_exchange || 'Exchange B',
            sellPrice,
            sellUrl: exchangeUrl(opp.sell_exchange, opp.symbol),
            spread,
            profitPercent: profitPct,
            volume: parseFloat(opp.volume) || 0
        };
    }).filter(opp => opp.profitPercent > 0.05 && opp.buyPrice > 0 && opp.sellPrice > 0);
}

function sortAndRender(opportunities) {
    const sortBy = document.getElementById('arbitrage-sort')?.value || 'profit';
    const feeInput = document.getElementById('arbitrage-fee');
    const fee = feeInput ? parseFloat(feeInput.value) || 0.1 : 0.1;
    const minProfit = parseFloat(document.getElementById('arbitrage-min-profit')?.value) || 0;
    const tradeAmount = parseFloat(document.getElementById('arbitrage-amount')?.value) || 1000;

    let sorted = [...opportunities];

    // Both buy fee and sell fee:
    const totalFeeRate = fee * 2;

    sorted = sorted.map(o => {
        const net = o.profitPercent - totalFeeRate;
        return { ...o, netProfit: net };
    }).filter(o => o.netProfit >= minProfit);

    if (sortBy === 'profit') sorted.sort((a, b) => b.netProfit - a.netProfit);
    else if (sortBy === 'spread') sorted.sort((a, b) => b.spread - a.spread);
    else if (sortBy === 'volume') sorted.sort((a, b) => b.volume - a.volume);

    const list = document.getElementById('tool-content');

    if (!sorted.length) {
        list.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;text-align:center;padding:3rem;background:var(--bg-card);border-radius:16px;border:1px solid rgba(255,255,255,0.1);">
                <p style="font-size:2rem;margin-bottom:1rem;">⚡</p>
                <p style="font-size:1.125rem;font-weight:600;margin-bottom:0.5rem;">No opportunities meet your filter criteria</p>
                <p style="color:var(--text-secondary);">Try lowering the minimum net profit or reducing the fee rate estimate.</p>
            </div>
        `;
        return;
    }

    const totalOpps = sorted.length;
    const bestNet = Math.max(...sorted.map(s => s.netProfit)).toFixed(2);
    const avgNet = (sorted.reduce((s, o) => s + o.netProfit, 0) / totalOpps).toFixed(2);
    const totalVolume = sorted.reduce((s, o) => s + o.volume, 0);

    list.innerHTML = `
        <div class="arb-warning-banner" style="grid-column:1/-1;padding:0.875rem 1.25rem;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:12px;display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">
            <span style="font-size:1.25rem;">⚠️</span>
            <span style="font-size:0.8125rem;color:#fde68a;"><strong>Trader Warning:</strong> Live arbitrage spreads exclude blockchain network transfer fees, order book depth slippage, and temporary exchange deposit/withdrawal freezes. Always verify liquidity on destination order books before executing.</span>
        </div>

        <div class="arb-stats" style="grid-column:1/-1;">
            <div class="arb-stat"><span class="arb-stat-num">${totalOpps}</span><span class="arb-stat-label">Pairs Found</span></div>
            <div class="arb-stat"><span class="arb-stat-num green">+${bestNet}%</span><span class="arb-stat-label">Best Net Spread</span></div>
            <div class="arb-stat"><span class="arb-stat-num">${avgNet}%</span><span class="arb-stat-label">Avg Net</span></div>
            <div class="arb-stat"><span class="arb-stat-num">${abbrArb(totalVolume)}</span><span class="arb-stat-label">24h Pool Vol</span></div>
            <div class="arb-stat"><span class="arb-stat-num">${fee}% &times; 2</span><span class="arb-stat-label">Fees (Buy+Sell)</span></div>
        </div>

        ${sorted.map(opp => {
            const net = opp.netProfit;
            const pClass = net > 1 ? 'high' : net > 0.3 ? 'medium' : 'low';
            const exampleProfit = (tradeAmount * (net / 100)).toFixed(2);
            const buyLink = opp.buyUrl || exchangeUrl(opp.buyExchange, opp.symbol);
            const sellLink = opp.sellUrl || exchangeUrl(opp.sellExchange, opp.symbol);

            return `
                <div class="arb-card ${pClass}" data-coin="${(opp.coin||'').toLowerCase()}" data-exchange="${(opp.buyExchange||'').toLowerCase()} ${(opp.sellExchange||'').toLowerCase()}">
                    <div class="arb-card-head">
                        <div>
                            <div class="arb-coin-name">${opp.coin}</div>
                            <div class="arb-pair">${opp.symbol}</div>
                        </div>
                        <div class="arb-net-badge ${pClass}">${net > 0 ? '+' : ''}${net.toFixed(2)}% net</div>
                    </div>
                    <div class="arb-card-body">
                        <div class="arb-exchange-row">
                            <div class="arb-exchange-side arb-buy-side">
                                <div class="arb-side-label">Buy on</div>
                                <div class="arb-ex-name">${opp.buyExchange}</div>
                                <div class="arb-ex-price red">$${fmtArb(opp.buyPrice)}</div>
                            </div>
                            <div class="arb-arrow">&rarr;</div>
                            <div class="arb-exchange-side arb-sell-side">
                                <div class="arb-side-label">Sell on</div>
                                <div class="arb-ex-name">${opp.sellExchange}</div>
                                <div class="arb-ex-price green">$${fmtArb(opp.sellPrice)}</div>
                            </div>
                        </div>
                        <div class="arb-details">
                            <div class="arb-detail-row"><span>Gross Difference</span><span>$${fmtArb(opp.spread)} (+${opp.profitPercent.toFixed(2)}%)</span></div>
                            <div class="arb-detail-row"><span>Estimated Fees (${fee}% &times; 2)</span><span style="color:#fbbf24">-${(totalFeeRate).toFixed(2)}%</span></div>
                            <div class="arb-detail-row arb-detail-net"><span>Net Estimated Spread</span><span style="color:${net>0?'#34d399':'#f87171'}">${net>0?'+':''}${net.toFixed(2)}%</span></div>
                        </div>
                        ${opp.volume > 0 ? `<div class="arb-vol">Exchange Volume: $${abbrArb(opp.volume)}</div>` : ''}
                        <div class="arb-example">
                            <div class="arb-example-label">$${abbrArb(tradeAmount)} trade &rarr; <strong style="color:${net>0?'#34d399':'#f87171'}">${net>0?'+':''}$${exampleProfit}</strong></div>
                        </div>
                    </div>
                    <div class="arb-card-foot">
                        <a href="${buyLink}" target="_blank" rel="noopener noreferrer" class="arb-btn arb-btn-buy">Buy on ${opp.buyExchange}</a>
                        <a href="${sellLink}" target="_blank" rel="noopener noreferrer" class="arb-btn arb-btn-sell">Sell on ${opp.sellExchange}</a>
                    </div>
                </div>
            `;
        }).join('')}
    `;
}

function filterArbitrage(query) {
    const search = (query || '').toLowerCase();
    const cards = document.querySelectorAll('.arb-card');
    cards.forEach(c => {
        const coin = c.dataset.coin || '';
        const ex = c.dataset.exchange || '';
        c.style.display = (coin.includes(search) || ex.includes(search)) ? 'flex' : 'none';
    });
}

function exchangeUrl(exchange, pair) {
    const base = (pair || 'BTC').split('/')[0];
    const name = (exchange || '').toLowerCase();
    if (name.includes('binance')) return `https://www.binance.com/en/trade/${base}_USDT`;
    if (name.includes('coinbase')) return `https://www.coinbase.com/advanced-trade/spot/${base}-USD`;
    if (name.includes('kraken')) return `https://www.kraken.com/prices/${base.toLowerCase()}`;
    if (name.includes('kucoin')) return `https://www.kucoin.com/trade/${base}-USDT`;
    if (name.includes('bybit')) return `https://www.bybit.com/en/trade/spot/${base}/USDT`;
    if (name.includes('okx')) return `https://www.okx.com/trade-spot/${base.toLowerCase()}-usdt`;
    if (name.includes('gate')) return `https://www.gate.io/trade/${base}_USDT`;
    if (name.includes('bitfinex')) return `https://trading.bitfinex.com/t/${base}:USD`;
    return `https://www.google.com/search?q=${encodeURIComponent(exchange)}+${base}+trading`;
}

function fmtArb(n) {
    if (!n || isNaN(n)) return '0.00';
    if (n < 0.0001) return n.toFixed(8);
    if (n < 1) return n.toFixed(6);
    if (n < 10) return n.toFixed(4);
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function abbrArb(n) {
    if (!n) return '0';
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
    return n.toFixed(0);
}
