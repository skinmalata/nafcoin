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
    { id: 'polygon-ecosystem-token', symbol: 'POL', name: 'Polygon', type: 'crypto', icon: '⬢' },
    { id: 'shiba-inu', symbol: 'SHIB', name: 'Shiba Inu', type: 'crypto', icon: '🐕' },
    { id: 'uniswap', symbol: 'UNI', name: 'Uniswap', type: 'crypto', icon: '🦄' },
    { id: 'near', symbol: 'NEAR', name: 'NEAR Protocol', type: 'crypto', icon: 'Ⓝ' },
    { id: 'pepe', symbol: 'PEPE', name: 'Pepe', type: 'crypto', icon: '🐸' },
    { id: 'fetch-ai', symbol: 'FET', name: 'Fetch.ai', type: 'crypto', icon: '🤖' },
    { id: 'render-token', symbol: 'RENDER', name: 'Render', type: 'crypto', icon: '🎨' },
    { id: 'sui', symbol: 'SUI', name: 'Sui', type: 'crypto', icon: '💧' },
    { id: 'the-open-network', symbol: 'TON', name: 'Toncoin', type: 'crypto', icon: '💎' },
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

let cryptoPrices = {};
let fiatRates = {
    usd: 1,
    eur: 0.92,
    gbp: 0.79,
    jpy: 154.0,
    ngn: 1650.0,
    cad: 1.39,
    aud: 1.52,
    inr: 84.4,
    brl: 5.75
};
let priceChanges24h = {};
let isLoading = false;
let autoConvertTimer = null;

async function loadPrices() {
    isLoading = true;
    updateStatus('Loading live rates...');
    
    // 1. Fetch live Forex/fiat rates
    try {
        const fxRes = await fetch('https://open.er-api.com/v6/latest/USD');
        if (fxRes.ok) {
            const fxData = await fxRes.json();
            if (fxData && fxData.rates) {
                fiatRates.usd = 1;
                fiatRates.eur = fxData.rates.EUR || fiatRates.eur;
                fiatRates.gbp = fxData.rates.GBP || fiatRates.gbp;
                fiatRates.jpy = fxData.rates.JPY || fiatRates.jpy;
                fiatRates.ngn = fxData.rates.NGN || fiatRates.ngn;
                fiatRates.cad = fxData.rates.CAD || fiatRates.cad;
                fiatRates.aud = fxData.rates.AUD || fiatRates.aud;
                fiatRates.inr = fxData.rates.INR || fiatRates.inr;
                fiatRates.brl = fxData.rates.BRL || fiatRates.brl;
            }
        }
    } catch (e) {
        console.warn('Using fallback fiat rates:', e);
    }

    // 2. Fetch live crypto prices
    try {
        const cryptoIds = currencies.filter(c => c.type === 'crypto').map(c => c.id).join(',');
        const marketRes = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${cryptoIds}&sparkline=false&price_change_percentage=24h`);
        
        if (marketRes.ok) {
            const data = await marketRes.json();
            data.forEach(c => {
                cryptoPrices[c.id] = c.current_price;
                priceChanges24h[c.id] = c.price_change_percentage_24h || 0;
            });
            updateStatus('Live rates loaded');
        } else {
            throw new Error('CoinGecko error');
        }
    } catch (e) {
        console.warn('CoinGecko failed, using fallback crypto prices');
        cryptoPrices = {
            bitcoin: 74200, ethereum: 2120, tether: 1.0, binancecoin: 580,
            solana: 155, ripple: 0.54, 'usd-coin': 1.0, cardano: 0.46,
            dogecoin: 0.14, polkadot: 7.2, litecoin: 85, 'avalanche-2': 36,
            chainlink: 14.5, 'polygon-ecosystem-token': 0.52, 'shiba-inu': 0.000018,
            uniswap: 9.2, near: 5.1, pepe: 0.000011, 'fetch-ai': 1.4, 'render-token': 6.8,
            sui: 2.1, 'the-open-network': 5.2
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
    
    const prevFrom = fromSelect.value;
    const prevTo = toSelect.value;

    const options = currencies.map(c => 
        `<option value="${c.id}">${c.symbol} - ${c.name} (${c.type.toUpperCase()})</option>`
    ).join('');
    
    fromSelect.innerHTML = options;
    toSelect.innerHTML = options;
    
    fromSelect.value = prevFrom || 'bitcoin';
    toSelect.value = prevTo || 'usd';
}

// Returns the value of 1 unit of currencyId in USD
function getUSDValue(currencyId) {
    const cur = currencies.find(c => c.id === currencyId);
    if (!cur) return 1;

    if (cur.type === 'crypto') {
        return cryptoPrices[currencyId] || 0;
    } else {
        // For fiat, fiatRates is units of currency per 1 USD
        const rate = fiatRates[currencyId];
        return (rate && rate > 0) ? (1 / rate) : 1;
    }
}

function convertAmount(amount, fromId, toId) {
    if (fromId === toId) return amount;
    
    const fromUSD = getUSDValue(fromId);
    const toUSD = getUSDValue(toId);
    
    if (!fromUSD || !toUSD) return 0;
    
    // Value in USD = amount * fromUSD
    // Result in Target Currency = (amount * fromUSD) / toUSD
    return (amount * fromUSD) / toUSD;
}

function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    if (num === 0) return '0';
    if (num >= 1000000) return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (num >= 1000) return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (num >= 1) return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    if (num >= 0.0001) return num.toFixed(6);
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
    const amountInput = document.getElementById('amount')?.value;
    const amount = parseFloat(amountInput);
    const resultEl = document.getElementById('result');
    
    if (!from || !to || isNaN(amount) || amount <= 0) {
        if (resultEl) resultEl.innerHTML = '<div style="color:var(--text-secondary);padding:1rem;">Enter an amount to see real-time converted value.</div>';
        return;
    }
    
    const fromCurr = currencies.find(c => c.id === from);
    const toCurr = currencies.find(c => c.id === to);
    if (!fromCurr || !toCurr) return;

    const result = convertAmount(amount, from, to);
    const rate = convertAmount(1, from, to);
    const reverseRate = convertAmount(1, to, from);
    
    const priceChange = priceChanges24h[from];
    const changeHtml = (priceChange !== undefined && priceChange !== null) ? `
        <div class="price-indicator">
            <div class="label">24h Change</div>
            <div class="value ${priceChange >= 0 ? 'positive' : 'negative'}">${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%</div>
        </div>
    ` : '';

    const fromUsdVal = getUSDValue(from);
    const toUsdVal = getUSDValue(to);

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
                    <div class="label">${fromCurr.symbol} (USD)</div>
                    <div class="value">$${formatNumber(fromUsdVal)}</div>
                </div>
                ${changeHtml}
                <div class="price-indicator">
                    <div class="label">${toCurr.symbol} (USD)</div>
                    <div class="value">$${formatNumber(toUsdVal)}</div>
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
    
    const amountEl = document.getElementById('amount');
    if (amountEl) amountEl.addEventListener('input', autoConvert);

    const fromEl = document.getElementById('from-currency');
    if (fromEl) fromEl.addEventListener('change', autoConvert);

    const toEl = document.getElementById('to-currency');
    if (toEl) toEl.addEventListener('change', autoConvert);

    setInterval(() => {
        if (!isLoading) loadPrices();
    }, 120000);
});
