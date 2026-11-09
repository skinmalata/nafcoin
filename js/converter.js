const currencies = [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', type: 'crypto', icon: '₿' },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', type: 'crypto', icon: 'Ξ' },
    { id: 'tether', symbol: 'USDT', name: 'Tether', type: 'crypto', icon: '₮' },
    { id: 'binancecoin', symbol: 'BNB', name: 'BNB', type: 'crypto', icon: '◆' },
    { id: 'solana', symbol: 'SOL', name: 'Solana', type: 'crypto', icon: '◎' },
    { id: 'ripple', symbol: 'XRP', name: 'XRP', type: 'crypto', icon: '✕' },
    { id: 'usd-coin', symbol: 'USDC', name: 'USD Coin', type: 'crypto', icon: '$' },
    { id: 'cardano', symbol: 'ADA', name: 'Cardano', type: 'crypto', icon: '₳' },
    { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', type: 'crypto', icon: 'Ð' },
    { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', type: 'crypto', icon: '●' },
    { id: 'litecoin', symbol: 'LTC', name: 'Litecoin', type: 'crypto', icon: 'Ł' },
    { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', type: 'crypto', icon: '▲' },
    { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', type: 'crypto', icon: '⬡' },
    { id: 'matic-network', symbol: 'MATIC', name: 'Polygon', type: 'crypto', icon: '⬢' },
    { id: 'shiba-inu', symbol: 'SHIB', name: 'Shiba Inu', type: 'crypto', icon: '🐕' },
    { id: 'uniswap', symbol: 'UNI', name: 'Uniswap', type: 'crypto', icon: '🦄' },
    { id: 'near', symbol: 'NEAR', name: 'NEAR Protocol', type: 'crypto', icon: 'Ⓝ' },
    { id: 'pepe', symbol: 'PEPE', name: 'Pepe', type: 'crypto', icon: '🐸' },
    { id: 'fetch-ai', symbol: 'FET', name: 'Fetch.ai', type: 'crypto', icon: '🤖' },
    { id: 'render-token', symbol: 'RNDR', name: 'Render', type: 'crypto', icon: '🎨' },
    { id: 'usd', symbol: 'USD', name: 'US Dollar', type: 'fiat', icon: '$' },
    { id: 'eur', symbol: 'EUR', name: 'Euro', type: 'fiat', icon: '€' },
    { id: 'gbp', symbol: 'GBP', name: 'British Pound', type: 'fiat', icon: '£' },
    { id: 'jpy', symbol: 'JPY', name: 'Japanese Yen', type: 'fiat', icon: '¥' },
    { id: 'ngn', symbol: 'NGN', name: 'Nigerian Naira', type: 'fiat', icon: '₦' },
    { id: 'cad', symbol: 'CAD', name: 'Canadian Dollar', type: 'fiat', icon: 'C$' },
    { id: 'aud', symbol: 'AUD', name: 'Australian Dollar', type: 'fiat', icon: 'A$' },
    { id: 'inr', symbol: 'INR', name: 'Indian Rupee', type: 'fiat', icon: '₹' },
    { id: 'brl', symbol: 'BRL', name: 'Brazilian Real', type: 'fiat', icon: 'R$' }
];

let prices = {};
let priceChanges24h = {};
let isLoading = false;
let autoConvertTimer = null;

async function loadPrices() {
    isLoading = true;
    updateStatus('Loading live rates...');
    
    try {
        const cryptoIds = currencies.filter(c => c.type === 'crypto').map(c => c.id).join(',');
        
        const [priceRes, marketRes] = await Promise.all([
            fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds}&vs_currencies=usd,eur,gbp,jpy`),
            fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds}&vs_currencies=usd&include_24hr_change=true`)
        ]);

        if (priceRes.ok) {
            const data = await priceRes.json();
            for (const [id, vals] of Object.entries(data)) {
                prices[id] = vals.usd || 1;
                priceChanges24h[id] = null;
            }
        }

        if (marketRes.ok) {
            const marketData = await marketRes.json();
            for (const [id, vals] of Object.entries(marketData)) {
                priceChanges24h[id] = vals.usd_24h_change || 0;
            }
        }

        prices.usd = 1;
        prices.eur = 0.92;
        prices.gbp = 0.79;
        prices.jpy = 152.5;
        prices.ngn = 1550;
        prices.cad = 1.37;
        prices.aud = 1.53;
        prices.inr = 83.5;
        prices.brl = 5.0;

        updateStatus('Live rates loaded');
    } catch (e) {
        prices = {
            bitcoin: 105000, ethereum: 3200, tether: 1, binancecoin: 720,
            solana: 210, ripple: 2.8, 'usd-coin': 1, cardano: 1.1,
            dogecoin: 0.35, polkadot: 8.5, litecoin: 125, 'avalanche-2': 42,
            chainlink: 18, 'matic-network': 0.65, 'shiba-inu': 0.000028,
            uniswap: 12, near: 8, pepe: 0.000012, 'fetch-ai': 1.5, 'render-token': 11,
            usd: 1, eur: 0.92, gbp: 0.79, jpy: 152, ngn: 1550, cad: 1.37, aud: 1.53, inr: 83.5, brl: 5.0
        };
        updateStatus('Using cached rates');
    }

    isLoading = false;
    populateDropdowns();
    autoConvert();
}

function updateStatus(msg) {
    const el = document.getElementById('converter-status');
    if (el) el.textContent = msg;
}

function populateDropdowns() {
    const fromSelect = document.getElementById('from-currency');
    const toSelect = document.getElementById('to-currency');
    if (!fromSelect || !toSelect) return;
    
    const options = currencies.map(c => 
        `<option value="${c.id}">${c.symbol} - ${c.name}</option>`
    ).join('');
    
    fromSelect.innerHTML = options;
    toSelect.innerHTML = options;
    
    fromSelect.value = 'bitcoin';
    toSelect.value = 'usd';
}

function getFiatRate(currencyId) {
    if (prices[currencyId] !== undefined) return prices[currencyId];
    return 1;
}

function convertAmount(amount, fromId, toId) {
    if (fromId === toId) return amount;
    
    const fromPrice = getFiatRate(fromId);
    const toPrice = getFiatRate(toId);
    
    if (fromId === 'usd') return amount * toPrice;
    if (toId === 'usd') return amount * fromPrice;
    
    return (amount * fromPrice) / toPrice;
}

function formatNumber(num) {
    if (num >= 1000000) return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (num >= 1000) return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (num >= 1) return num.toFixed(4);
    if (num >= 0.01) return num.toFixed(6);
    return num.toFixed(8);
}

function autoConvert() {
    if (autoConvertTimer) clearTimeout(autoConvertTimer);
    autoConvertTimer = setTimeout(() => performConvert(), 150);
}

function performConvert() {
    if (isLoading) return;
    
    const from = document.getElementById('from-currency')?.value;
    const to = document.getElementById('to-currency')?.value;
    const amount = parseFloat(document.getElementById('amount')?.value);
    const resultEl = document.getElementById('result');
    
    if (!from || !to || !amount || amount <= 0) {
        if (resultEl) resultEl.innerHTML = '';
        return;
    }
    
    const result = convertAmount(amount, from, to);
    const rate = convertAmount(1, from, to);
    const reverseRate = convertAmount(1, to, from);
    
    const fromCurr = currencies.find(c => c.id === from);
    const toCurr = currencies.find(c => c.id === to);
    
    const priceChange = priceChanges24h[from];
    const changeHtml = priceChange !== null ? `
        <div class="price-indicator">
            <div class="label">24h Change</div>
            <div class="value ${priceChange >= 0 ? 'positive' : 'negative'}">${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%</div>
        </div>
    ` : '';

    resultEl.innerHTML = `
        <div class="result-display">
            <div class="result-from">${formatNumber(amount)} ${fromCurr.symbol}</div>
            <div class="result-value">${formatNumber(result)} ${toCurr.symbol}</div>
            <div class="result-rate">1 ${fromCurr.symbol} = ${formatNumber(rate)} ${toCurr.symbol}</div>
            
            <div class="rate-info">
                <div class="rate-info-item">
                    <div class="label">Reverse Rate</div>
                    <div class="value">1 ${toCurr.symbol} = ${formatNumber(reverseRate)} ${fromCurr.symbol}</div>
                </div>
            </div>

            <div class="price-indicators">
                <div class="price-indicator">
                    <div class="label">${fromCurr.symbol} Price</div>
                    <div class="value">$${formatNumber(prices[from] || 0)}</div>
                </div>
                ${changeHtml}
                <div class="price-indicator">
                    <div class="label">${toCurr.symbol} Price</div>
                    <div class="value">$${toCurr.type === 'crypto' ? formatNumber(prices[to] || 0) : '1.00'}</div>
                </div>
            </div>
        </div>
    `;
    
    saveConversion({ from: fromCurr.symbol, to: toCurr.symbol, amount, result: formatNumber(result), timestamp: new Date().toISOString() });
    renderHistory();
}

function setAmount(val) {
    document.getElementById('amount').value = val;
    autoConvert();
}

function swapCurrencies() {
    const from = document.getElementById('from-currency');
    const to = document.getElementById('to-currency');
    const temp = from.value;
    from.value = to.value;
    to.value = temp;
    autoConvert();
}

function saveConversion(conv) {
    try {
        const history = JSON.parse(localStorage.getItem('converter-history') || '[]');
        const last = history[0];
        if (last && last.from === conv.from && last.to === conv.to && last.amount === conv.amount) return;
        history.unshift(conv);
        if (history.length > 15) history.pop();
        localStorage.setItem('converter-history', JSON.stringify(history));
    } catch (e) {}
}

function renderHistory() {
    const container = document.getElementById('history');
    if (!container) return;
    
    try {
        const history = JSON.parse(localStorage.getItem('converter-history') || '[]');
        
        if (history.length === 0) {
            container.innerHTML = '<div class="empty-state">No conversion history yet. Enter an amount to get started.</div>';
            return;
        }
        
        container.innerHTML = history.map(h => `
            <div class="history-item">
                <div class="conv">${h.amount} ${h.from} → ${h.result} ${h.to}</div>
                <div class="time">${formatTimeAgo(h.timestamp)}</div>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = '<div class="empty-state">Unable to load history</div>';
    }
}

function formatTimeAgo(isoStr) {
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

document.addEventListener('DOMContentLoaded', async () => {
    populateDropdowns();
    await loadPrices();
    renderHistory();
    
    setInterval(() => {
        if (!isLoading) loadPrices();
    }, 120000);
});
