document.addEventListener('DOMContentLoaded', () => {
    loadTrending('gainers');

    document.querySelectorAll('.trending-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.trending-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadTrending(tab.dataset.filter);
        });
    });

    document.getElementById('trending-search').addEventListener('input', debounce((e) => {
        filterTrending(e.target.value);
    }, 200));
});

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

async function loadTrending(filter = 'gainers') {
    const list = document.getElementById('tool-content');
    const timestampEl = document.getElementById('trending-timestamp');

    list.innerHTML = `
        <div class="loading" style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: var(--bg-card); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
            <div class="loading-spinner"></div>
            <p style="font-weight: 600;">Loading ${filter}...</p>
        </div>
    `;

    try {
        let filtered = [];

        if (filter === 'trending') {
            const data = await fetch('https://api.coingecko.com/api/v3/search/trending').then(r => r.json());
            const trendingItems = data.coins?.slice(0, 15).map(c => c.item) || [];

            const ids = trendingItems.map(c => c.id).filter(Boolean);
            let priceData = [];
            if (ids.length > 0) {
                try {
                    priceData = await API.coingecko.getPrices(ids, ids.length);
                } catch (e) {
                    console.warn('Failed to fetch price data for trending');
                }
            }

            filtered = trendingItems.map(item => {
                const match = priceData.find(p => p.id === item.id);
                return {
                    ...item,
                    current_price: match?.current_price,
                    price_change_percentage_24h: match?.price_change_percentage_24h,
                    market_cap: match?.market_cap,
                    total_volume: match?.total_volume,
                    market_cap_rank: match?.market_cap_rank
                };
            });
        } else {
            const coins = await API.coingecko.getPrices(null, 50);

            if (filter === 'gainers') {
                filtered = [...coins]
                    .sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0))
                    .slice(0, 15);
            } else if (filter === 'losers') {
                filtered = [...coins]
                    .sort((a, b) => (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0))
                    .slice(0, 15);
            }
        }

        if (timestampEl) {
            const now = new Date();
            timestampEl.textContent = `Showing ${filtered.length} ${filter} • Updated ${now.toLocaleTimeString()}`;
        }

        list.innerHTML = filtered.map(coin => {
            const change = coin.price_change_percentage_24h || 0;
            const isHot = change > 10;
            const name = coin.name || coin.symbol?.toUpperCase() || 'Unknown';
            const symbol = coin.symbol?.toUpperCase() || '';
            const image = coin.image || coin.thumb || coin.large || '';
            const rank = coin.market_cap_rank || coin.market_cap_rank || '';

            return `
                <div class="trending-card ${isHot ? 'hot' : ''}" data-name="${name.toLowerCase()} ${symbol.toLowerCase()}">
                    <div style="padding: 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            ${image ? `<img src="${image}" width="36" height="36" alt="${name}" style="border-radius: 50%;">` : ''}
                            <div>
                                <div style="font-size: 1.125rem; font-weight: 700; color: var(--text-primary);">${name}</div>
                                <div style="font-size: 0.8125rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 500;">${symbol}${rank ? ` • #${rank}` : ''}</div>
                            </div>
                        </div>
                        ${isHot ? '<span style="font-size: 0.625rem; font-weight: 700; background: rgba(245,158,11,0.2); color: #fbbf24; padding: 0.25rem 0.5rem; border-radius: 4px;">🔥 HOT</span>' : ''}
                    </div>
                    <div style="padding: 1.25rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary);">${formatPrice(coin.current_price)}</div>
                            <div style="padding: 0.5rem 0.875rem; border-radius: 8px; font-weight: 700; font-size: 0.9375rem; background: ${change >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}; color: ${change >= 0 ? '#10b981' : '#ef4444'};">
                                ${change >= 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(2)}%
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem;">
                            <div style="padding: 0.75rem; background: rgba(255,255,255,0.03); border-radius: 8px;">
                                <div style="font-size: 0.6875rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">Market Cap</div>
                                <div style="font-size: 0.9375rem; font-weight: 700; color: var(--text-primary); margin-top: 0.25rem;">${coin.market_cap ? '$' + formatLargeNumber(coin.market_cap) : 'N/A'}</div>
                            </div>
                            <div style="padding: 0.75rem; background: rgba(255,255,255,0.03); border-radius: 8px;">
                                <div style="font-size: 0.6875rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">24h Volume</div>
                                <div style="font-size: 0.9375rem; font-weight: 700; color: var(--text-primary); margin-top: 0.25rem;">${coin.total_volume ? '$' + formatLargeNumber(coin.total_volume) : 'N/A'}</div>
                            </div>
                        </div>
                    </div>
                    <div style="padding: 0 1.25rem 1.25rem;">
                        <a href="coin-analysis.html?coin=${coin.id || ''}" class="btn-analysis" style="display: block; padding: 0.75rem; background: linear-gradient(135deg, #7C3AED, #5B21B6); color: #fff; border-radius: 8px; text-align: center; text-decoration: none; font-weight: 600; font-size: 0.875rem; box-shadow: 0 4px 15px rgba(124,58,237,0.3);">View Analysis →</a>
                    </div>
                </div>
            `;
        }).join('');

        if (filtered.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <p style="font-size: 2rem; margin-bottom: 1rem;">📭</p>
                    <p style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem;">No coins found</p>
                    <p style="color: var(--text-secondary);">Try a different filter or check back later</p>
                </div>
            `;
        }

    } catch (err) {
        console.error('Trending load error:', err);
        list.innerHTML = `
            <div class="empty-state">
                <p style="font-size: 2rem; margin-bottom: 1rem;">❌</p>
                <p style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem;">Failed to load data</p>
                <p style="color: var(--text-secondary);">${err.message}</p>
                <button class="btn btn-primary" style="margin-top: 1rem;" onclick="loadTrending('${filter}')">Retry</button>
            </div>
        `;
    }
}

function filterTrending(query) {
    const cards = document.querySelectorAll('.trending-card');
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
