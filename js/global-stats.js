async function loadGlobalStats() {
    const grid = document.getElementById('tool-content');
    if (!grid) return;
    
    grid.innerHTML = '<div class="loading">Loading global stats...</div>';
    
    try {
        const res = await fetch('https://api.coingecko.com/api/v3/global');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const global = data.data;
        
        grid.innerHTML = `
            <div class="global-grid">
                <div class="global-card">
                    <div class="global-label">Total Market Cap</div>
                    <div class="global-value">$${((global.total_market_cap?.usd || 0) / 1e12).toFixed(2)}T</div>
                </div>
                <div class="global-card">
                    <div class="global-label">24h Volume</div>
                    <div class="global-value">$${((global.total_volume?.usd || 0) / 1e9).toFixed(2)}B</div>
                </div>
                <div class="global-card">
                    <div class="global-label">BTC Dominance</div>
                    <div class="global-value">${(global.market_cap_percentage?.btc || 0).toFixed(2)}%</div>
                </div>
                <div class="global-card">
                    <div class="global-label">ETH Dominance</div>
                    <div class="global-value">${(global.market_cap_percentage?.eth || 0).toFixed(2)}%</div>
                </div>
                <div class="global-card">
                    <div class="global-label">Active Cryptos</div>
                    <div class="global-value">${(global.active_cryptocurrencies || 0).toLocaleString()}</div>
                </div>
                <div class="global-card">
                    <div class="global-label">Markets</div>
                    <div class="global-value">${(global.markets || 0).toLocaleString()}</div>
                </div>
            </div>
        `;
    } catch (err) {
        grid.innerHTML = `<div class="error">Error: ${err.message}. Try again later.</div>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadGlobalStats();
});

