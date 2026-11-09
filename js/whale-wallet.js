const WHALE_THRESHOLD_USD = 100000;
const WHALE_ADDRESSES = {
    bitcoin: [
        { address: '34xp4vRoCGJym3xR7yCVPFHoBEZ7qKBFsV', label: 'Binance Cold Wallet' },
        { address: '3LpF9J1RJsEYLGxMA1Wv2Q7iBqMJMvRmBd', label: 'Bitfinex Cold Wallet' },
        { address: 'bc1qazcm763858n0r9l7z7x7l7x7x7x7x7x7x7x7x7', label: 'Unknown Whale' }
    ],
    ethereum: [
        { address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18', label: 'Binance 8' },
        { address: '0xF977814e90dA44bFA03b6295A0616a897441aceC', label: 'Binance 7' },
        { address: '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8', label: 'Binance 6' }
    ]
};

let whaleInterval;
let btcWhaleData = [];
let ethWhaleData = [];

async function loadWhaleData() {
    try {
        const [btcTxs, marketData] = await Promise.all([
            fetchBTCWhaleTransactions(),
            fetchMarketData()
        ]);
        
        btcWhaleData = btcTxs;
        renderBTCWhales(btcTxs);
        renderMarketWhales(marketData);
    } catch (e) {
        document.getElementById('btc-whale-feed').innerHTML = '<div class="loading" style="padding: 2rem;">Unable to load whale data. Retrying...</div>';
    }
    
    try {
        const ethTxs = await fetchETHWhaleTransactions();
        ethWhaleData = ethTxs;
        renderETHWhales(ethTxs);
    } catch (e) {
        // silently fail
    }
}

async function fetchBTCWhaleTransactions() {
    const res = await fetch('https://blockchain.info/unconfirmed-transactions?format=json');
    const data = await res.json();
    const txs = data.txrs || data.txs || [];
    
    return txs
        .filter(tx => {
            const totalOut = tx.out ? tx.out.reduce((sum, o) => sum + (o.value || 0), 0) : 0;
            return totalOut * 1e-8 * getBtcPrice() > WHALE_THRESHOLD_USD;
        })
        .slice(0, 20)
        .map(tx => {
            const totalOut = tx.out ? tx.out.reduce((sum, o) => sum + (o.value || 0), 0) : 0;
            const btcAmount = totalOut * 1e-8;
            return {
                hash: tx.hash,
                btcAmount,
                usdAmount: btcAmount * getBtcPrice(),
                time: tx.time || Date.now() / 1000,
                inputs: tx.inputs ? tx.inputs.length : 0,
                outputs: tx.out ? tx.out.length : 0
            };
        })
        .sort((a, b) => b.usdAmount - a.usdAmount)
        .slice(0, 10);
}

async function fetchETHWhaleTransactions() {
    const res = await fetch('https://api.blockchair.com/ethereum/transactions?limit=20&sort=asc&q=value(>100000000000000000000)');
    const data = await res.json();
    if (!data.data) return [];
    
    return data.data
        .filter(tx => tx.value > 0)
        .slice(0, 10)
        .map(tx => ({
            hash: tx.hash,
            ethAmount: tx.value / 1e18,
            usdAmount: (tx.value / 1e18) * getEthPrice(),
            from: tx.sender || tx.from,
            to: tx.recipient || tx.to,
            time: tx.time
        }));
}

async function fetchMarketData() {
    const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=volume_desc&per_page=50&sparkline=false');
    return await res.json();
}

function getBtcPrice() {
    const el = document.getElementById('btc-price-val');
    return el ? parseFloat(el.dataset.price) || 65000 : 65000;
}

function getEthPrice() {
    const el = document.getElementById('eth-price-val');
    return el ? parseFloat(el.dataset.price) || 3500 : 3500;
}

function renderBTCWhales(txs) {
    const container = document.getElementById('btc-whale-feed');
    if (!txs.length) {
        container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-secondary);">No large BTC transactions detected recently</div>';
        return;
    }
    
    container.innerHTML = txs.map(tx => `
        <div class="whale-tx">
            <div class="whale-tx-header">
                <span class="whale-asset btc">BTC</span>
                <span class="whale-amount">${abbrNum(tx.btcAmount)} BTC</span>
                <span class="whale-usd">$${abbrNum(tx.usdAmount)}</span>
            </div>
            <div class="whale-tx-meta">
                <span>${tx.inputs} inputs → ${tx.outputs} outputs</span>
            </div>
        </div>
    `).join('');
}

function renderETHWhales(txs) {
    const container = document.getElementById('eth-whale-feed');
    if (!txs.length) {
        container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-secondary);">No large ETH transactions detected recently</div>';
        return;
    }
    
    container.innerHTML = txs.map(tx => `
        <div class="whale-tx">
            <div class="whale-tx-header">
                <span class="whale-asset eth">ETH</span>
                <span class="whale-amount">${abbrNum(tx.ethAmount)} ETH</span>
                <span class="whale-usd">$${abbrNum(tx.usdAmount)}</span>
            </div>
            <div class="whale-tx-meta">
                <span class="whale-address" title="${tx.from}">${shortenAddress(tx.from)} → ${shortenAddress(tx.to)}</span>
            </div>
        </div>
    `).join('');
}

function renderMarketWhales(coins) {
    const container = document.getElementById('market-whales');
    if (!coins.length) return;
    
    const whaleCoins = coins.filter(c => c.total_volume > 1e9).slice(0, 12);
    
    container.innerHTML = whaleCoins.map(c => `
        <div class="whale-coin-card">
            <div class="whale-coin-info">
                <img src="${c.image}" alt="${c.name}" onerror="this.src='../logo-64.png'" loading="lazy">
                <div>
                    <strong>${c.name}</strong>
                    <span class="whale-coin-symbol">${c.symbol.toUpperCase()}</span>
                </div>
            </div>
            <div class="whale-coin-stats">
                <div class="whale-stat">
                    <span class="whale-stat-label">Volume</span>
                    <span class="whale-stat-value">$${abbrNum(c.total_volume)}</span>
                </div>
                <div class="whale-stat">
                    <span class="whale-stat-label">Price</span>
                    <span class="whale-stat-value ${c.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}">$${c.current_price?.toFixed(c.current_price < 1 ? 6 : 2)}</span>
                </div>
                <div class="whale-stat">
                    <span class="whale-stat-label">24h</span>
                    <span class="whale-stat-value ${c.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}">${c.price_change_percentage_24h?.toFixed(1)}%</span>
                </div>
                <div class="whale-stat">
                    <span class="whale-stat-label">MCap</span>
                    <span class="whale-stat-value">$${abbrNum(c.market_cap)}</span>
                </div>
            </div>
        </div>
    `).join('');
    
    const btcPrice = coins.find(c => c.id === 'bitcoin')?.current_price || 65000;
    const ethPrice = coins.find(c => c.id === 'ethereum')?.current_price || 3500;
    
    const btcPriceEl = document.getElementById('btc-price-val');
    const ethPriceEl = document.getElementById('eth-price-val');
    if (btcPriceEl) { btcPriceEl.textContent = `$${btcPrice.toLocaleString()}`; btcPriceEl.dataset.price = btcPrice; }
    if (ethPriceEl) { ethPriceEl.textContent = `$${ethPrice.toLocaleString()}`; ethPriceEl.dataset.price = ethPrice; }
}

function abbrNum(n) {
    if (!n) return '0';
    if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
    return n.toFixed(2);
}

function shortenAddress(addr) {
    if (!addr) return 'N/A';
    return addr.substring(0, 6) + '...' + addr.substring(addr.length - 4);
}

document.addEventListener('DOMContentLoaded', () => {
    loadWhaleData();
    whaleInterval = setInterval(loadWhaleData, 120000);
});
