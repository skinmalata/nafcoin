const WHALE_THRESHOLD_USD = 100000;
const TRACKED_WHALES = [
    { chain: 'BTC', address: '34xp4vRoCGJym3xR7yCVPFHoBEZ7qKBFsV', label: 'Binance Cold Storage', balance: '~248,597 BTC', explorer: 'https://mempool.space/address/34xp4vRoCGJym3xR7yCVPFHoBEZ7qKBFsV' },
    { chain: 'BTC', address: 'bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq90ecnvqqjwvw97', label: 'Bitfinex Cold Storage', balance: '~178,010 BTC', explorer: 'https://mempool.space/address/bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq90ecnvqqjwvw97' },
    { chain: 'BTC', address: '1P5ZEDWTKTFGxQjZphgWPQUpe554WKDfHQ', label: 'Robinhood Whale', balance: '~118,300 BTC', explorer: 'https://mempool.space/address/1P5ZEDWTKTFGxQjZphgWPQUpe554WKDfHQ' },
    { chain: 'ETH', address: '0x00000000219ab540356cBB839Cbe05303d7705Fa', label: 'ETH2 Deposit Contract', balance: '~48,500,000 ETH', explorer: 'https://etherscan.io/address/0x00000000219ab540356cBB839Cbe05303d7705Fa' },
    { chain: 'ETH', address: '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8', label: 'Binance 7 (Hot Wallet)', balance: '~1,996,000 ETH', explorer: 'https://etherscan.io/address/0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8' },
    { chain: 'ETH', address: '0x40B38765696e3d5d8d9d834D8AaD4bB6e418E489', label: 'Robinhood Cold Storage', balance: '~1,490,000 ETH', explorer: 'https://etherscan.io/address/0x40B38765696e3d5d8d9d834D8AaD4bB6e418E489' }
];

let whaleInterval;

async function loadWhaleData() {
    renderTrackedWhales();

    try {
        const marketData = await fetchMarketData();
        renderMarketWhales(marketData);

        const btcPrice = marketData.find(c => c.id === 'bitcoin')?.current_price || 74000;
        const ethPrice = marketData.find(c => c.id === 'ethereum')?.current_price || 2100;

        const btcPriceEl = document.getElementById('btc-price-val');
        const ethPriceEl = document.getElementById('eth-price-val');
        if (btcPriceEl) { btcPriceEl.textContent = `$${btcPrice.toLocaleString()}`; btcPriceEl.dataset.price = btcPrice; }
        if (ethPriceEl) { ethPriceEl.textContent = `$${ethPrice.toLocaleString()}`; ethPriceEl.dataset.price = ethPrice; }

        const [btcTxs, ethTxs] = await Promise.allSettled([
            fetchBTCWhaleTransactions(btcPrice),
            fetchETHWhaleTransactions(ethPrice)
        ]);

        if (btcTxs.status === 'fulfilled' && btcTxs.value.length > 0) {
            renderBTCWhales(btcTxs.value);
        } else {
            renderBTCWhales([]);
        }

        if (ethTxs.status === 'fulfilled' && ethTxs.value.length > 0) {
            renderETHWhales(ethTxs.value);
        } else {
            renderETHWhales([]);
        }

        const lastUpdated = document.getElementById('last-updated');
        if (lastUpdated) lastUpdated.textContent = 'Updated ' + new Date().toLocaleTimeString();

    } catch (e) {
        console.warn('Whale load error:', e);
    }
}

async function fetchBTCWhaleTransactions(btcPrice) {
    try {
        const res = await fetch('https://blockchain.info/unconfirmed-transactions?format=json');
        if (!res.ok) throw new Error('BTC mempool API error');
        const data = await res.json();
        const txs = data.txs || data.txrs || [];

        const whaleTxs = [];
        txs.forEach(tx => {
            const outputs = tx.out || [];
            // Find significant non-dust outputs:
            const outValues = outputs.map(o => (o.value || 0) * 1e-8);
            const maxOutput = Math.max(0, ...outValues);
            const totalOut = outValues.reduce((s, v) => s + v, 0);

            // To avoid treating change outputs as massive trades, we check individual transfers
            const primaryAmount = (outputs.length > 1) ? maxOutput : totalOut;
            const usdValue = primaryAmount * btcPrice;

            if (usdValue >= WHALE_THRESHOLD_USD) {
                whaleTxs.push({
                    hash: tx.hash,
                    btcAmount: primaryAmount,
                    usdAmount: usdValue,
                    time: tx.time ? tx.time * 1000 : Date.now(),
                    inputs: tx.inputs ? tx.inputs.length : 1,
                    outputs: outputs.length
                });
            }
        });

        whaleTxs.sort((a, b) => b.usdAmount - a.usdAmount);
        return whaleTxs.slice(0, 10);
    } catch (e) {
        console.warn('Failed to fetch live BTC unconfirmed txs:', e);
        return [];
    }
}

async function fetchETHWhaleTransactions(ethPrice) {
    try {
        const res = await fetch('https://api.blockchair.com/ethereum/transactions?limit=25&s=time(desc)');
        if (!res.ok) throw new Error('ETH Blockchair API error');
        const data = await res.json();
        const txs = data.data || [];

        return txs
            .map(tx => {
                const ethAmount = parseFloat(tx.value || 0) / 1e18;
                const usdAmount = ethAmount * ethPrice;
                return {
                    hash: tx.hash,
                    ethAmount,
                    usdAmount,
                    from: tx.sender || tx.from,
                    to: tx.recipient || tx.to,
                    time: tx.time ? new Date(tx.time).getTime() : Date.now()
                };
            })
            .filter(tx => tx.ethAmount > 0.001)
            .sort((a, b) => b.usdAmount - a.usdAmount)
            .slice(0, 10);
    } catch (e) {
        console.warn('Failed to fetch live ETH txs:', e);
        return [];
    }
}

async function fetchMarketData() {
    try {
        const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=volume_desc&per_page=50&sparkline=false');
        if (!res.ok) throw new Error('Market API error');
        return await res.json();
    } catch {
        return [
            { id: 'bitcoin', name: 'Bitcoin', symbol: 'btc', current_price: 74200, price_change_percentage_24h: 1.2, total_volume: 32000000000, market_cap: 1460000000000 },
            { id: 'ethereum', name: 'Ethereum', symbol: 'eth', current_price: 2120, price_change_percentage_24h: 2.1, total_volume: 16000000000, market_cap: 256000000000 }
        ];
    }
}

function renderBTCWhales(txs) {
    const container = document.getElementById('btc-whale-feed');
    if (!container) return;

    if (!txs.length) {
        container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-secondary);">No large BTC mempool transactions (> $100k) detected in the last scan interval. Mempool updates continuously.</div>';
        return;
    }

    container.innerHTML = txs.map(tx => `
        <div class="whale-tx" style="padding:1rem;border-bottom:1px solid rgba(255,255,255,0.05);display:flex;justify-content:space-between;align-items:center;">
            <div>
                <div class="whale-tx-header" style="display:flex;align-items:center;gap:0.75rem;">
                    <span class="whale-asset btc" style="background:#f7931a;color:#fff;padding:0.2rem 0.5rem;border-radius:4px;font-weight:700;font-size:0.75rem;">BTC</span>
                    <span class="whale-amount" style="font-weight:700;font-size:1.1rem;">${tx.btcAmount.toFixed(2)} BTC</span>
                    <span class="whale-usd" style="color:#10b981;font-weight:600;">$${abbrNum(tx.usdAmount)}</span>
                </div>
                <div class="whale-tx-meta" style="font-size:0.75rem;color:var(--text-secondary);margin-top:0.25rem;">
                    <span>${tx.inputs} inputs &rarr; ${tx.outputs} outputs &bull; Unconfirmed Mempool</span>
                </div>
            </div>
            <div>
                <a href="https://mempool.space/tx/${tx.hash}" target="_blank" rel="noopener noreferrer" class="whale-link" style="color:#a78bfa;font-size:0.8125rem;">View on Explorer &rarr;</a>
            </div>
        </div>
    `).join('');
}

function renderETHWhales(txs) {
    const container = document.getElementById('eth-whale-feed');
    if (!container) return;

    if (!txs.length) {
        container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-secondary);">No recent large on-chain ETH transfers indexed in this scan. Checking live blocks...</div>';
        return;
    }

    container.innerHTML = txs.map(tx => `
        <div class="whale-tx" style="padding:1rem;border-bottom:1px solid rgba(255,255,255,0.05);display:flex;justify-content:space-between;align-items:center;">
            <div>
                <div class="whale-tx-header" style="display:flex;align-items:center;gap:0.75rem;">
                    <span class="whale-asset eth" style="background:#627eea;color:#fff;padding:0.2rem 0.5rem;border-radius:4px;font-weight:700;font-size:0.75rem;">ETH</span>
                    <span class="whale-amount" style="font-weight:700;font-size:1.1rem;">${tx.ethAmount.toFixed(4)} ETH</span>
                    <span class="whale-usd" style="color:#10b981;font-weight:600;">$${abbrNum(tx.usdAmount)}</span>
                </div>
                <div class="whale-tx-meta" style="font-size:0.75rem;color:var(--text-secondary);margin-top:0.25rem;">
                    <span class="whale-address">${shortenAddress(tx.from)} &rarr; ${shortenAddress(tx.to)}</span>
                </div>
            </div>
            <div>
                <a href="https://etherscan.io/tx/${tx.hash}" target="_blank" rel="noopener noreferrer" class="whale-link" style="color:#a78bfa;font-size:0.8125rem;">View on Etherscan &rarr;</a>
            </div>
        </div>
    `).join('');
}

function renderTrackedWhales() {
    let el = document.getElementById('tracked-whale-entities');
    if (!el) {
        const main = document.querySelector('main.container');
        if (!main) return;
        const sec = document.createElement('section');
        sec.className = 'whale-section';
        sec.innerHTML = `
            <h2>Major Cold Storage & Known Entity Wallets</h2>
            <p class="section-desc">Verified exchange reserves and institutional custody wallets</p>
            <div id="tracked-whale-entities" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:1rem;margin-top:1rem;"></div>
        `;
        const mWhales = document.querySelector('.whale-section:last-of-type');
        if (mWhales) main.insertBefore(sec, mWhales);
        el = document.getElementById('tracked-whale-entities');
    }

    if (el) {
        el.innerHTML = TRACKED_WHALES.map(w => `
            <div style="background:var(--bg-card);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:1rem;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                    <div>
                        <span style="background:${w.chain==='BTC'?'#f7931a':'#627eea'};color:#fff;font-size:0.6875rem;font-weight:700;padding:2px 6px;border-radius:4px;">${w.chain}</span>
                        <div style="font-weight:700;font-size:0.95rem;margin-top:0.4rem;">${w.label}</div>
                        <div style="font-size:0.75rem;color:var(--text-secondary);font-family:monospace;margin-top:2px;">${shortenAddress(w.address)}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-weight:700;color:#10b981;font-size:0.9rem;">${w.balance}</div>
                        <a href="${w.explorer}" target="_blank" rel="noopener noreferrer" style="font-size:0.75rem;color:#a78bfa;text-decoration:none;display:inline-block;margin-top:4px;">Inspect &rarr;</a>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

function renderMarketWhales(coins) {
    const container = document.getElementById('market-whales');
    if (!container || !coins.length) return;

    const whaleCoins = coins.filter(c => (c.total_volume || 0) > 2e8).slice(0, 12);

    container.innerHTML = whaleCoins.map(c => `
        <div class="whale-coin-card">
            <div class="whale-coin-info">
                <img src="${c.image || '../logo-64.png'}" alt="${c.name}" onerror="this.src='../logo-64.png'" loading="lazy">
                <div>
                    <strong>${c.name}</strong>
                    <span class="whale-coin-symbol">${(c.symbol || '').toUpperCase()}</span>
                </div>
            </div>
            <div class="whale-coin-stats">
                <div class="whale-stat">
                    <span class="whale-stat-label">24h Volume</span>
                    <span class="whale-stat-value">$${abbrNum(c.total_volume)}</span>
                </div>
                <div class="whale-stat">
                    <span class="whale-stat-label">Price</span>
                    <span class="whale-stat-value ${c.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}">$${c.current_price < 1 ? c.current_price?.toFixed(4) : c.current_price?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <div class="whale-stat">
                    <span class="whale-stat-label">24h Change</span>
                    <span class="whale-stat-value ${c.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}">${c.price_change_percentage_24h >= 0 ? '+' : ''}${c.price_change_percentage_24h?.toFixed(2)}%</span>
                </div>
                <div class="whale-stat">
                    <span class="whale-stat-label">Market Cap</span>
                    <span class="whale-stat-value">$${abbrNum(c.market_cap)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function abbrNum(n) {
    if (!n || isNaN(n)) return '0';
    if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
    return n.toFixed(2);
}

function shortenAddress(addr) {
    if (!addr) return 'N/A';
    if (addr.length < 12) return addr;
    return addr.substring(0, 6) + '...' + addr.substring(addr.length - 4);
}

document.addEventListener('DOMContentLoaded', () => {
    loadWhaleData();
    whaleInterval = setInterval(loadWhaleData, 60000);
});
