let arbInterval;
let arbCountdown;
let cachedOpportunities = [];
let arbActiveCoin = 'all';

function debounceArb(fn, wait) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); };
}

function startArbCountdown() {
    const el = document.getElementById('arb-countdown');
    if (!el) return;
    let sec = 120;
    if (arbCountdown) clearInterval(arbCountdown);
    el.textContent = '120s';
    arbCountdown = setInterval(() => {
        sec--;
        el.textContent = sec + 's';
        if (sec <= 0) sec = 120;
    }, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('scan-arbitrage').addEventListener('click', () => scanArbitrage());

    document.getElementById('arbitrage-search').addEventListener('input', debounceArb((e) => {
        filterArbitrage(e.target.value);
    }, 250));

    document.getElementById('arbitrage-sort').addEventListener('change', () => {
        sortAndRender(cachedOpportunities);
    });

    document.getElementById('arbitrage-fee').addEventListener('input', () => {
        sortAndRender(cachedOpportunities);
    });

    document.getElementById('arbitrage-min-profit').addEventListener('change', () => {
        sortAndRender(cachedOpportunities);
    });

    document.getElementById('arbitrage-amount').addEventListener('input', () => {
        sortAndRender(cachedOpportunities);
    });

    document.getElementById('arbitrage-coin').addEventListener('change', () => {
        arbActiveCoin = document.getElementById('arbitrage-coin').value;
        scanArbitrage();
    });

    document.getElementById('arb-auto-refresh').addEventListener('change', (e) => {
        if (e.target.checked) {
            if (arbInterval) clearInterval(arbInterval);
            arbInterval = setInterval(scanArbitrage, 120000);
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
    const selectedCoin = coinSelect ? coinSelect.value : 'btc';
    const timestampEl = document.getElementById('arb-timestamp');

    arbActiveCoin = selectedCoin;
    list.innerHTML = '<div class="loading" style="grid-column:1/-1"><div class="loading-spinner"></div><p>Scanning exchanges for arbitrage...</p></div>';

    try {
        if (selectedCoin === 'all') {
            const coinList = ['btc', 'eth', 'sol', 'bnb', 'xrp', 'doge', 'ada', 'avax', 'link', 'dot'];
            const results = await Promise.allSettled(
                coinList.map(c => API.rapidapi_arbitrage.getArbitrage(c).catch(() => []))
            );
            let all = [];
            results.forEach(r => {
                if (r.status === 'fulfilled' && Array.isArray(r.value)) all.push(...r.value);
            });
            if (!all.length) throw new Error('No data');
            cachedOpportunities = parseOpportunities(all);
        } else {
            const data = await API.rapidapi_arbitrage.getArbitrage(selectedCoin);
            if (!data || !Array.isArray(data)) throw new Error('Invalid response');
            cachedOpportunities = parseOpportunities(data);
        }
    } catch (err) {
        console.warn('Arbitrage data unavailable:', err);
        cachedOpportunities = [];
        list.innerHTML = '<div class="empty-state" style="grid-column:1/-1;text-align:center;padding:3rem"><p style="font-size:1.125rem;font-weight:600;margin-bottom:0.5rem">Live arbitrage data is unavailable</p><p style="color:var(--text-secondary)">No estimated or simulated opportunities are shown. A server-side market-data integration is required to enable live scans.</p></div>';
        if (timestampEl) timestampEl.textContent = 'Live data unavailable';
        if (arbInterval) clearInterval(arbInterval);
        if (arbCountdown) clearInterval(arbCountdown);
        const countdown = document.getElementById('arb-countdown');
        if (countdown) countdown.textContent = 'OFF';
        return;
    }

    sortAndRender(cachedOpportunities);
    if (timestampEl) timestampEl.textContent = 'Last updated: ' + new Date().toLocaleTimeString();
    startArbCountdown();

    const autoRefresh = document.getElementById('arb-auto-refresh');
    if (arbInterval) clearInterval(arbInterval);
    if (!autoRefresh || autoRefresh.checked) {
        arbInterval = setInterval(scanArbitrage, 120000);
    }
}

function parseOpportunities(data) {
    return data.map(opp => {
        const buyPrice = parseFloat(opp.buy_price) || 0;
        const sellPrice = parseFloat(opp.sell_price) || 0;
        const profitPct = parseFloat(opp.profit_percent) || 0;
        const spread = sellPrice - buyPrice;
        return {
            coin: opp.coin || 'Unknown',
            symbol: opp.symbol || opp.pair || '',
            buyExchange: opp.buy_exchange || 'N/A',
            buyPrice,
            sellExchange: opp.sell_exchange || 'N/A',
            sellPrice,
            spread,
            profitPercent: profitPct,
            volume: parseFloat(opp.volume) || 0
        };
    }).filter(opp => opp.profitPercent > 0.05 && opp.buyPrice > 0 && opp.sellPrice > 0);
}

function sortAndRender(opportunities) {
    const sortBy = document.getElementById('arbitrage-sort').value;
    const feeInput = document.getElementById('arbitrage-fee');
    const fee = feeInput ? parseFloat(feeInput.value) || 0.1 : 0.1;
    const minProfit = parseFloat(document.getElementById('arbitrage-min-profit').value) || 0;
    const tradeAmount = parseFloat(document.getElementById('arbitrage-amount').value) || 1000;

    let sorted = [...opportunities];

    sorted = sorted.filter(o => {
        const net = Math.max(0, o.profitPercent - (fee * 2));
        return net >= minProfit;
    });

    if (sortBy === 'profit') sorted.sort((a, b) => b.profitPercent - a.profitPercent);
    else if (sortBy === 'spread') sorted.sort((a, b) => b.spread - a.spread);
    else if (sortBy === 'volume') sorted.sort((a, b) => b.volume - a.volume);

    const list = document.getElementById('tool-content');

    if (!sorted.length) {
        list.innerHTML = '<div class="empty-state" style="grid-column:1/-1;text-align:center;padding:3rem"><p style="font-size:2rem;margin-bottom:1rem">⚡</p><p style="font-size:1.125rem;font-weight:600;margin-bottom:0.5rem">No arbitrage opportunities found</p><p style="color:var(--text-secondary)">Try lowering the minimum profit filter or selecting a different coin.</p></div>';
        return;
    }

    const totalOpps = sorted.length;
    const avgProfit = (sorted.reduce((s, o) => s + o.profitPercent, 0) / totalOpps).toFixed(2);
    const bestProfit = sorted[0].profitPercent.toFixed(2);
    const totalVolume = sorted.reduce((s, o) => s + o.volume, 0);

    list.innerHTML = `
        <div class="arb-stats">
            <div class="arb-stat"><span class="arb-stat-num">${totalOpps}</span><span class="arb-stat-label">Opportunities</span></div>
            <div class="arb-stat"><span class="arb-stat-num green">${bestProfit}%</span><span class="arb-stat-label">Best Net</span></div>
            <div class="arb-stat"><span class="arb-stat-num">${avgProfit}%</span><span class="arb-stat-label">Avg Net</span></div>
            <div class="arb-stat"><span class="arb-stat-num">${abbrArb(totalVolume)}</span><span class="arb-stat-label">Total Volume</span></div>
            <div class="arb-stat"><span class="arb-stat-num">${fee}%</span><span class="arb-stat-label">Fee Rate</span></div>
        </div>
        ${sorted.map((opp, idx) => {
            const net = Math.max(0, opp.profitPercent - (fee * 2));
            const pClass = net > 1 ? 'high' : net > 0.5 ? 'medium' : 'low';
            const pBar = Math.min(100, net * 20);
            const exampleProfit = (tradeAmount * net / 100).toFixed(2);
            const buyLink = exchangeUrl(opp.buyExchange, opp.symbol);
            const sellLink = exchangeUrl(opp.sellExchange, opp.symbol);

            return `
                <div class="arb-card ${pClass}" data-coin="${(opp.coin||'').toLowerCase()}" data-exchange="${(opp.buyExchange||'').toLowerCase()} ${(opp.sellExchange||'').toLowerCase()}">
                    <div class="arb-card-head">
                        <div>
                            <div class="arb-coin-name">${opp.coin}</div>
                            <div class="arb-pair">${opp.symbol}</div>
                        </div>
                        <div class="arb-net-badge ${pClass}">+${net.toFixed(2)}% net</div>
                    </div>
                    <div class="arb-card-body">
                        <div class="arb-exchange-row">
                            <div class="arb-exchange-side arb-buy-side">
                                <div class="arb-side-label">Buy on</div>
                                <div class="arb-ex-name">${opp.buyExchange}</div>
                                <div class="arb-ex-price red">$${fmtArb(opp.buyPrice)}</div>
                            </div>
                            <div class="arb-arrow">→</div>
                            <div class="arb-exchange-side arb-sell-side">
                                <div class="arb-side-label">Sell on</div>
                                <div class="arb-ex-name">${opp.sellExchange}</div>
                                <div class="arb-ex-price green">$${fmtArb(opp.sellPrice)}</div>
                            </div>
                        </div>
                        <div class="arb-details">
                            <div class="arb-detail-row"><span>Gross Spread</span><span>$${opp.spread.toFixed(4)} (+${opp.profitPercent.toFixed(2)}%)</span></div>
                            <div class="arb-detail-row"><span>Fees (${fee}% × 2)</span><span style="color:#fbbf24">-${(fee*2).toFixed(2)}%</span></div>
                            <div class="arb-detail-row arb-detail-net"><span>Net Profit</span><span style="color:${net>0?'#34d399':'#f87171'}">${net>0?'+':''}${net.toFixed(2)}%</span></div>
                        </div>
                        ${opp.volume > 0 ? `<div class="arb-vol">24h Volume: ${abbrArb(opp.volume)}</div>` : ''}
                        <div class="arb-profit-meter">
                            <div class="arb-meter-bar"><div class="arb-meter-fill ${pClass}" style="width:${pBar}%"></div></div>
                            <span class="arb-meter-label ${pClass}">${pClass === 'high' ? 'Strong' : pClass === 'medium' ? 'Moderate' : 'Low'}</span>
                        </div>
                        <div class="arb-example">
                            <div class="arb-example-label">$${abbrArb(tradeAmount)} trade → <strong style="color:#34d399">+$${exampleProfit}</strong></div>
                        </div>
                    </div>
                    <div class="arb-card-foot">
                        <a href="${buyLink}" target="_blank" class="arb-btn arb-btn-buy">Buy on ${opp.buyExchange}</a>
                        <a href="${sellLink}" target="_blank" class="arb-btn arb-btn-sell">Sell on ${opp.sellExchange}</a>
                    </div>
                </div>
            `;
        }).join('')}
    `;
}

function exchangeUrl(exchange, pair) {
    const base = (pair || 'BTC').split('/')[0];
    const name = exchange.toLowerCase();
    if (name.includes('binance')) return `https://www.binance.com/en/trade/${base}_USDT`;
    if (name.includes('coinbase')) return `https://www.coinbase.com/advanced-trade/spot/${base}-USDT`;
    if (name.includes('kraken')) return `https://www.kraken.com/prices/${base}`;
    if (name.includes('kucoin')) return `https://www.kucoin.com/trade/${base}-USDT`;
    if (name.includes('bybit')) return `https://www.bybit.com/en/trade/spot/${base}/USDT`;
    if (name.includes('okx')) return `https://www.okx.com/trade-spot/${base}-USDT`;
    if (name.includes('gate')) return `https://www.gate.io/trade/${base}_USDT`;
    if (name.includes('huobi')) return `https://www.htx.com/en-us/trade/${base}_usdt`;
    if (name.includes('bitfinex')) return `https://trading.bitfinex.com/t/${base}:USDT`;
    if (name.includes('gemini')) return `https://www.gemini.com/prices/${base}`;
    return `https://www.google.com/search?q=${exchange}+${base}+trading`;
}

function fmtArb(n) {
    if (!n || isNaN(n)) return '0';
    if (n < 0.0001) return n.toFixed(8);
    if (n < 1) return n.toFixed(6);
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function abbrArb(n) {
    if (!n || isNaN(n)) return '0';
    if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
    return n.toFixed(2);
}

function filterArbitrage(query) {
    if (!query.trim()) { sortAndRender(cachedOpportunities); return; }
    const q = query.toLowerCase();
    const filtered = cachedOpportunities.filter(o =>
        (o.coin || '').toLowerCase().includes(q) ||
        (o.symbol || '').toLowerCase().includes(q) ||
        (o.buyExchange || '').toLowerCase().includes(q) ||
        (o.sellExchange || '').toLowerCase().includes(q)
    );
    if (!filtered.length) {
        document.getElementById('tool-content').innerHTML = '<div class="empty-state" style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-secondary)">No opportunities match your search</div>';
        return;
    }
    sortAndRender(filtered);
}
