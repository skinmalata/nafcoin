document.addEventListener('DOMContentLoaded', () => {
    initPriceTracker();
});

let priceInterval;
let previousPrices = {};

function initPriceTracker() {
    loadPrices();
    priceInterval = setInterval(loadPrices, 60000);

    document.getElementById('search-crypto').addEventListener('input', debounce((e) => {
        filterPrices(e.target.value);
    }, 200));

    document.getElementById('price-source').addEventListener('change', () => {
        previousPrices = {};
        loadPrices();
    });

    document.getElementById('price-sort').addEventListener('change', () => {
        sortAndRender(currentCoins);
    });

    document.getElementById('price-count-select').addEventListener('change', () => {
        previousPrices = {};
        loadPrices();
    });
}

let currentCoins = [];

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

window.forceRefresh = function() {
    previousPrices = {};
    loadPrices();
};

async function loadPrices() {
    const grid = document.getElementById('price-grid');
    const source = document.getElementById('price-source').value;
    const perPage = parseInt(document.getElementById('price-count-select').value) || 50;
    const timestampEl = document.getElementById('price-timestamp');
    const countEl = document.getElementById('price-count');

    if (!grid.querySelector('.loading') && !grid.querySelector('.error')) {
        timestampEl.textContent = '↻ Updating...';
    } else {
        grid.innerHTML = `
            <div class="loading" style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: var(--bg-card); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
                <div class="loading-spinner"></div>
                <p style="font-weight: 600;">Loading prices from ${source === 'coingecko' ? 'CoinGecko' : 'Binance'}...</p>
            </div>
        `;
    }

    try {
        if (source === 'coingecko') {
            const coins = await API.coingecko.getPrices(null, perPage);
            currentCoins = coins;
            renderCoinGeckoPrices(coins);
        } else {
            const tickers = await API.binance.getPrices();
            currentCoins = tickers;
            renderBinancePrices(tickers);
        }

        const now = new Date();
        timestampEl.textContent = `Last updated: ${now.toLocaleTimeString()} • Next refresh in 60s`;
        countEl.textContent = `${currentCoins.length} coins loaded`;

    } catch (err) {
        console.error('Price load error:', err);
        if (err.message.includes('Failed to fetch') || err.message.includes('429')) {
            grid.innerHTML = `
                <div class="error" style="grid-column: 1 / -1; background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3); padding: 2rem; border-radius: 16px; text-align: center;">
                    <p style="font-size: 2rem; margin-bottom: 1rem;">⏳</p>
                    <p style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem;">Rate limited</p>
                    <p style="color: var(--text-secondary);">CoinGecko free tier limit reached. Retrying in 60 seconds...</p>
                </div>
            `;
        } else {
            grid.innerHTML = `<div class="error" style="grid-column: 1 / -1;">Error: ${err.message}</div>`;
        }
    }
}

function renderCoinGeckoPrices(coins) {
    sortAndRender(coins);
}

function sortAndRender(coins) {
    const sortBy = document.getElementById('price-sort').value;
    let sorted = [...coins];

    if (sortBy === 'price') {
        sorted.sort((a, b) => (b.current_price || 0) - (a.current_price || 0));
    } else if (sortBy === 'gainers') {
        sorted.sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0)).reverse();
    } else if (sortBy === 'losers') {
        sorted.sort((a, b) => (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0));
    } else if (sortBy === 'volume') {
        sorted.sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));
    } else {
        sorted.sort((a, b) => (a.market_cap_rank || 999) - (b.market_cap_rank || 999));
    }

    const grid = document.getElementById('price-grid');
    grid.innerHTML = sorted.map(coin => {
        const prevPrice = previousPrices[coin.id] || coin.current_price;
        const priceFlash = coin.current_price > prevPrice ? 'price-flash-up' : coin.current_price < prevPrice ? 'price-flash-down' : '';
        previousPrices[coin.id] = coin.current_price;

        const athChange = coin.ath_change_percentage || -50;
        const athDistance = athChange < -90 ? 'Very Far' : athChange < -70 ? 'Far' : athChange < -50 ? 'Medium' : 'Close';

        return `
            <div class="price-card ${priceFlash}" data-name="${coin.name.toLowerCase()} ${coin.symbol.toLowerCase()}" onclick="window.location.href='coin-analysis.html?coin=${coin.id}'">
                <div class="price-card-header">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <img src="${coin.image}" width="36" height="36" alt="${coin.name}" style="border-radius: 50%;">
                        <div>
                            <div style="font-size: 1.125rem; font-weight: 700; color: var(--text-primary);">${coin.name}</div>
                            <div style="font-size: 0.8125rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 500;">${coin.symbol.toUpperCase()} • Rank #${coin.market_cap_rank || 'N/A'}</div>
                        </div>
                    </div>
                </div>
                <div class="price-card-body">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <div style="font-size: 1.75rem; font-weight: 700; color: var(--text-primary);">${formatPrice(coin.current_price)}</div>
                        <div style="padding: 0.5rem 0.875rem; border-radius: 8px; font-weight: 700; font-size: 0.9375rem; background: ${coin.price_change_percentage_24h >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}; color: ${coin.price_change_percentage_24h >= 0 ? '#10b981' : '#ef4444'};">
                            ${coin.price_change_percentage_24h >= 0 ? '▲' : '▼'} ${Math.abs(coin.price_change_percentage_24h || 0).toFixed(2)}%
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; margin-bottom: 1rem;">
                        <div style="padding: 0.75rem; background: rgba(255,255,255,0.03); border-radius: 8px;">
                            <div style="font-size: 0.6875rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">Market Cap</div>
                            <div style="font-size: 0.9375rem; font-weight: 700; color: var(--text-primary); margin-top: 0.25rem;">$${formatLargeNumber(coin.market_cap)}</div>
                        </div>
                        <div style="padding: 0.75rem; background: rgba(255,255,255,0.03); border-radius: 8px;">
                            <div style="font-size: 0.6875rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">24h Volume</div>
                            <div style="font-size: 0.9375rem; font-weight: 700; color: var(--text-primary); margin-top: 0.25rem;">$${formatLargeNumber(coin.total_volume)}</div>
                        </div>
                        <div style="padding: 0.75rem; background: rgba(255,255,255,0.03); border-radius: 8px;">
                            <div style="font-size: 0.6875rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">24h High</div>
                            <div style="font-size: 0.9375rem; font-weight: 700; color: #10b981; margin-top: 0.25rem;">$${formatPrice(coin.high_24h)}</div>
                        </div>
                        <div style="padding: 0.75rem; background: rgba(255,255,255,0.03); border-radius: 8px;">
                            <div style="font-size: 0.6875rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">24h Low</div>
                            <div style="font-size: 0.9375rem; font-weight: 700; color: #ef4444; margin-top: 0.25rem;">$${formatPrice(coin.low_24h)}</div>
                        </div>
                    </div>

                    <div style="padding: 0.75rem; background: rgba(103,80,164,0.1); border-radius: 8px; border: 1px solid rgba(103,80,164,0.15);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 0.75rem; color: var(--text-secondary);">From ATH</span>
                            <span style="font-size: 0.875rem; font-weight: 700; color: ${athChange >= -50 ? '#10b981' : athChange >= -75 ? '#f59e0b' : '#ef4444'};">${athChange.toFixed(1)}% (${athDistance})</span>
                        </div>
                    </div>

                    <div style="display: flex; justify-content: space-between; margin-top: 0.75rem; font-size: 0.8125rem;">
                        <span style="color: var(--text-secondary);">Circulating Supply</span>
                        <span style="font-weight: 600; color: var(--text-primary);">${formatSupply(coin.circulating_supply)} ${coin.symbol.toUpperCase()}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderBinancePrices(tickers) {
    const grid = document.getElementById('price-grid');
    grid.innerHTML = tickers.map(t => `
        <div class="price-card" data-name="${t.symbol.toLowerCase()}">
            <div class="price-card-header">
                <div>
                    <div style="font-size: 1.125rem; font-weight: 700; color: var(--text-primary);">${t.symbol.replace('USDT', '')}</div>
                    <div style="font-size: 0.8125rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 500;">${t.symbol}</div>
                </div>
            </div>
            <div class="price-card-body">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <div style="font-size: 1.75rem; font-weight: 700; color: var(--text-primary);">$${parseFloat(t.lastPrice).toLocaleString()}</div>
                    <div style="padding: 0.5rem 0.875rem; border-radius: 8px; font-weight: 700; font-size: 0.9375rem; background: ${parseFloat(t.priceChangePercent) >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}; color: ${parseFloat(t.priceChangePercent) >= 0 ? '#10b981' : '#ef4444'};">
                        ${parseFloat(t.priceChangePercent) >= 0 ? '▲' : '▼'} ${Math.abs(parseFloat(t.priceChangePercent)).toFixed(2)}%
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem;">
                    <div style="padding: 0.75rem; background: rgba(255,255,255,0.03); border-radius: 8px;">
                        <div style="font-size: 0.6875rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">24h High</div>
                        <div style="font-size: 0.9375rem; font-weight: 700; color: #10b981; margin-top: 0.25rem;">$${parseFloat(t.highPrice).toLocaleString()}</div>
                    </div>
                    <div style="padding: 0.75rem; background: rgba(255,255,255,0.03); border-radius: 8px;">
                        <div style="font-size: 0.6875rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">24h Low</div>
                        <div style="font-size: 0.9375rem; font-weight: 700; color: #ef4444; margin-top: 0.25rem;">$${parseFloat(t.lowPrice).toLocaleString()}</div>
                    </div>
                    <div style="padding: 0.75rem; background: rgba(255,255,255,0.03); border-radius: 8px;">
                        <div style="font-size: 0.6875rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">Volume</div>
                        <div style="font-size: 0.9375rem; font-weight: 700; color: var(--text-primary); margin-top: 0.25rem;">${formatLargeNumber(parseFloat(t.volume))}</div>
                    </div>
                    <div style="padding: 0.75rem; background: rgba(255,255,255,0.03); border-radius: 8px;">
                        <div style="font-size: 0.6875rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">Quote Vol</div>
                        <div style="font-size: 0.9375rem; font-weight: 700; color: var(--text-primary); margin-top: 0.25rem;">$${formatLargeNumber(parseFloat(t.quoteVolume))}</div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function filterPrices(query) {
    const cards = document.querySelectorAll('#price-grid .price-card');
    const search = query.toLowerCase();
    cards.forEach(card => {
        card.style.display = card.dataset.name.includes(search) ? 'block' : 'none';
    });
}

function formatPrice(price) {
    if (!price && price !== 0) return 'N/A';
    if (price < 0.000001) return `$${price.toFixed(12)}`;
    if (price < 0.001) return `$${price.toFixed(9)}`;
    if (price < 1) return `$${price.toFixed(6)}`;
    if (price < 1000) return `$${price.toFixed(4)}`;
    return `$${price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

function formatLargeNumber(num) {
    if (!num && num !== 0) return 'N/A';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
}

function formatSupply(num) {
    if (!num && num !== 0) return 'N/A';
    return formatLargeNumber(num);
}
