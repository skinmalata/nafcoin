let pumpInterval;
let pumpCoins = [];
let pumpActiveTab = 'all';
let pumpSort = 'score';
let minScore = 0;
let countdownInterval;

function debouncePump(fn, wait) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); };
}

function startCountdown() {
    const el = document.getElementById('pump-countdown');
    if (!el) return;
    let sec = 60;
    if (countdownInterval) clearInterval(countdownInterval);
    el.textContent = '60s';
    countdownInterval = setInterval(() => {
        sec--;
        el.textContent = sec + 's';
        if (sec <= 0) sec = 60;
    }, 1000);
}

async function loadPumpData() {
    const container = document.getElementById('pump-content');
    const timestampEl = document.getElementById('pump-timestamp');

    if (!container.querySelector('.loading') && !container.querySelector('.error')) {
        if (timestampEl) timestampEl.textContent = '🔄 Updating...';
    } else {
        container.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>Scanning for early pumps...</p></div>';
    }

    try {
        const r = await fetch(
            'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=volume_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h,7d,30d',
            { signal: AbortSignal.timeout(15000) }
        );
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        pumpCoins = await r.json();
    } catch (e) {
        console.warn('CoinGecko failed, using fallback');
        pumpCoins = getFallbackPumpCoins();
    }

    if (!pumpCoins || !pumpCoins.length) {
        container.innerHTML = '<div class="empty-state">Unable to fetch data. <button class="btn btn-secondary" onclick="loadPumpData()">Retry</button></div>';
        return;
    }

    pumpCoins = pumpCoins.map(c => enrichPumpCoin(c)).filter(Boolean);
    renderStats();
    renderPumpCoins(pumpActiveTab);

    if (timestampEl) {
        const now = new Date();
        timestampEl.textContent = `Last updated: ${now.toLocaleTimeString()}`;
    }
    startCountdown();
}

function enrichPumpCoin(c) {
    const price = c.current_price || 0;
    const change24 = c.price_change_percentage_24h || 0;
    const change7d = c.price_change_percentage_7d_in_currency || 0;
    const change30d = c.price_change_percentage_30d_in_currency || 0;
    const vol = c.total_volume || 0;
    const mcap = c.market_cap || 0;
    const high24 = c.high_24h || price;
    const low24 = c.low_24h || price;

    if (price <= 0 || mcap <= 0) return null;

    const range = high24 - low24;
    const momentum = range > 0 ? ((price - low24) / range) * 100 : 50;

    const volMcapRatio = (vol / mcap) * 100;

    const priceScore = Math.min(100, Math.max(0, (change24 + 5) * 4));
    const volScore = Math.min(100, volMcapRatio * 2);
    const momentumScore = change24 > 0 ? momentum : Math.max(0, 50 - momentum);

    const pumpScore = Math.min(100, Math.round(priceScore * 0.45 + volScore * 0.3 + momentumScore * 0.25));

    const signal = change24 > 15 ? '🚀 Moon' : change24 > 8 ? '💥 Surge' : change24 > 4 ? '📈 Pump' : change24 > 0 ? '🟢 Up' : change24 > -3 ? '🟡 Sideways' : '🔴 Dump';

    const isBreakout = change24 > 3 && momentum >= 95;
    const isVolumeSpike = volMcapRatio > 15;
    const isPriceSurge = change24 > 6;

    const isHot = pumpScore >= 65;

    return {
        id: c.id, name: c.name, symbol: (c.symbol || '').toUpperCase(),
        image: c.image, price, change24, change7d, change30d,
        vol, mcap, high24, low24, rank: c.market_cap_rank || 999,
        volMcapRatio, momentum, pumpScore, signal,
        isBreakout, isVolumeSpike, isPriceSurge, isHot
    };
}

function renderStats() {
    const el = document.getElementById('pump-stats-bar');
    if (!el) return;
    const total = pumpCoins.length;
    const pumping = pumpCoins.filter(c => c.change24 > 4).length;
    const breakouts = pumpCoins.filter(c => c.isBreakout).length;
    const volSpikes = pumpCoins.filter(c => c.isVolumeSpike).length;
    const hot = pumpCoins.filter(c => c.isHot).length;
    el.innerHTML = `
        <div class="ps-stat"><span class="ps-num">${total}</span> Scanned</div>
        <div class="ps-stat"><span class="ps-num green">${pumping}</span> Pumping</div>
        <div class="ps-stat"><span class="ps-num gold">${breakouts}</span> Breakouts</div>
        <div class="ps-stat"><span class="ps-num purple">${volSpikes}</span> Vol Spikes</div>
        <div class="ps-stat"><span class="ps-num accent">${hot}</span> Hot</div>
    `;
}

function getFilteredAndSorted() {
    let filtered = [...pumpCoins];

    if (pumpActiveTab === 'volume') {
        filtered = filtered.filter(c => c.isVolumeSpike);
    } else if (pumpActiveTab === 'price') {
        filtered = filtered.filter(c => c.isPriceSurge);
    } else if (pumpActiveTab === 'breakout') {
        filtered = filtered.filter(c => c.isBreakout);
    }

    if (minScore > 0) {
        filtered = filtered.filter(c => c.pumpScore >= minScore);
    }

    if (pumpSort === 'change') {
        filtered.sort((a, b) => b.change24 - a.change24);
    } else if (pumpSort === 'volume') {
        filtered.sort((a, b) => b.vol - a.vol);
    } else if (pumpSort === 'momentum') {
        filtered.sort((a, b) => b.momentum - a.momentum);
    } else {
        filtered.sort((a, b) => b.pumpScore - a.pumpScore);
    }

    return filtered;
}

function renderPumpCoins(filter) {
    pumpActiveTab = filter || pumpActiveTab;
    const container = document.getElementById('pump-content');

    document.querySelectorAll('.pump-tab').forEach(t => t.classList.toggle('active', t.dataset.filter === pumpActiveTab));

    const filtered = getFilteredAndSorted();

    if (!filtered.length) {
        const msg = pumpActiveTab === 'volume' ? 'No coins with high volume/mcap ratio right now.' :
                    pumpActiveTab === 'price' ? 'No coins with significant price surges right now.' :
                    pumpActiveTab === 'breakout' ? 'No coins breaking out right now.' :
                    'No coins match your criteria. Try lowering the minimum score.';
        container.innerHTML = `<div class="empty-state">${msg}</div>`;
        return;
    }

    container.innerHTML = filtered.map(c => {
        const hotClass = c.isHot ? 'pump-card-hot' : '';
        return `<div class="pump-card ${hotClass}" onclick="window.location.href='coin-analysis.html?coin=${c.id}'">
            <div class="pump-card-header">
                <div class="pump-coin-info">
                    <img src="${c.image}" alt="${c.name}" onerror="this.src='../logo-64.png'" loading="lazy">
                    <div>
                        <strong>${c.name}</strong>
                        <span class="pump-symbol">${c.symbol} <span class="pump-rank">#${c.rank}</span></span>
                    </div>
                </div>
                <span class="pump-signal">${c.signal}</span>
            </div>
            <div class="pump-card-body">
                <div class="pump-price-row">
                    <span class="pump-price">${fmtPump(c.price)}</span>
                    <span class="pump-change ${c.change24 >= 0 ? 'positive' : 'negative'}">
                        ${c.change24 >= 0 ? '▲' : '▼'} ${Math.abs(c.change24).toFixed(2)}%
                    </span>
                </div>
                <div class="pump-score-bar-wrap">
                    <div class="pump-score-bar" style="width:${c.pumpScore}%;background:${scoreColor(c.pumpScore)}"></div>
                    <span class="pump-score-label">${c.pumpScore}</span>
                </div>
                <div class="pump-stats">
                    <div class="pump-stat">
                        <span class="pump-stat-label">Volume</span>
                        <span class="pump-stat-val">${abbrPump(c.vol)}</span>
                    </div>
                    <div class="pump-stat">
                        <span class="pump-stat-label">Vol/MCap</span>
                        <span class="pump-stat-val">${c.volMcapRatio.toFixed(1)}%</span>
                    </div>
                    <div class="pump-stat">
                        <span class="pump-stat-label">Momentum</span>
                        <span class="pump-stat-val">${c.momentum.toFixed(0)}%</span>
                    </div>
                    <div class="pump-stat">
                        <span class="pump-stat-label">Mcap</span>
                        <span class="pump-stat-val">${abbrPump(c.mcap)}</span>
                    </div>
                </div>
                <div class="pump-changes">
                    <span class="pc-item ${c.change24 >= 0 ? 'green' : 'red'}">24h: ${c.change24 >= 0 ? '+' : ''}${c.change24.toFixed(1)}%</span>
                    <span class="pc-item ${c.change7d >= 0 ? 'green' : 'red'}">7d: ${c.change7d >= 0 ? '+' : ''}${c.change7d.toFixed(1)}%</span>
                    <span class="pc-item ${c.change30d >= 0 ? 'green' : 'red'}">30d: ${c.change30d >= 0 ? '+' : ''}${c.change30d.toFixed(1)}%</span>
                </div>
                <div class="pump-badges">
                    ${c.isBreakout ? '<span class="pump-badge breakout-badge">⚡ Breaking Out</span>' : ''}
                    ${c.isVolumeSpike && !c.isBreakout ? '<span class="pump-badge volume-badge">📊 Volume Spike</span>' : ''}
                    ${c.isHot && !c.isBreakout && !c.isVolumeSpike ? '<span class="pump-badge hot-badge">🔥 Hot</span>' : ''}
                </div>
            </div>
        </div>`;
    }).join('');
}

function scoreColor(s) {
    if (s >= 75) return '#10b981';
    if (s >= 50) return '#f59e0b';
    if (s >= 25) return '#f97316';
    return '#6b7280';
}

function fmtPump(n) {
    if (!n || isNaN(n)) return '$0';
    if (n < 0.0001) return '$' + n.toFixed(8);
    if (n < 1) return '$' + n.toFixed(6);
    return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function abbrPump(n) {
    if (!n || isNaN(n)) return '0';
    if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
    return n.toFixed(2);
}

function getFallbackPumpCoins() {
    const names = [
        ['Bitcoin', 'btc', 67500, 2.5, 5.2, 12.5, 35e9, 1.32e12, 68500, 66000],
        ['Ethereum', 'eth', 3520, 3.2, 6.8, 15.2, 18e9, 4.2e11, 3600, 3400],
        ['Solana', 'sol', 148, 5.8, 12.5, 25.3, 3e9, 6.5e10, 152, 140],
        ['BNB', 'bnb', 585, 1.2, 3.5, 8.2, 1.5e9, 8.7e10, 595, 575],
        ['XRP', 'xrp', 0.53, -2.1, -1.5, 5.8, 2e9, 2.8e10, 0.55, 0.51],
        ['Dogecoin', 'doge', 0.12, 4.5, 8.2, 15.5, 1.2e9, 1.7e10, 0.13, 0.11],
        ['Cardano', 'ada', 0.46, -1.8, -0.5, 3.2, 5e8, 1.6e10, 0.48, 0.44],
        ['Avalanche', 'avax', 36, 6.2, 14.5, 28.5, 8e8, 1.3e10, 37, 34],
        ['Chainlink', 'link', 14.5, 2.8, 5.2, 12.8, 6e8, 8.2e9, 15, 14],
        ['Polkadot', 'dot', 7.2, -3.5, -2.8, 1.5, 4e8, 9.2e9, 7.6, 6.8],
        ['NEAR', 'near', 4.8, 7.5, 15.2, 32.5, 3.5e8, 5.2e9, 4.9, 4.5],
        ['Injective', 'inj', 22.5, 9.2, 18.5, 42.3, 2.5e8, 2.1e9, 23, 20.5],
    ];
    return names.map(([name, symbol, price, ch24, ch7, ch30, vol, mcap, high, low], i) => ({
        id: name.toLowerCase().replace(/\s+/g, '-'), name, symbol,
        image: '../logo-64.png', current_price: price,
        price_change_percentage_24h: ch24, price_change_percentage_7d_in_currency: ch7,
        price_change_percentage_30d_in_currency: ch30, total_volume: vol, market_cap: mcap,
        high_24h: high, low_24h: low, market_cap_rank: i + 1
    }));
}

function setSort(val) {
    pumpSort = val;
    renderPumpCoins(pumpActiveTab);
}

function setMinScore(val) {
    minScore = parseInt(val) || 0;
    renderPumpCoins(pumpActiveTab);
}

document.addEventListener('DOMContentLoaded', () => {
    loadPumpData();
    if (pumpInterval) clearInterval(pumpInterval);
    pumpInterval = setInterval(loadPumpData, 60000);

    const searchInput = document.getElementById('pump-search');
    if (searchInput) {
        searchInput.addEventListener('input', debouncePump((e) => {
            const q = e.target.value.toLowerCase();
            if (!q) { renderPumpCoins(pumpActiveTab); return; }
            const filtered = pumpCoins.filter(c =>
                c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q)
            );
            const container = document.getElementById('pump-content');
            if (!filtered.length) {
                container.innerHTML = '<div class="empty-state">No coins match your search</div>';
                return;
            }
            container.innerHTML = filtered.map(c => {
                const hotClass = c.isHot ? 'pump-card-hot' : '';
                return `<div class="pump-card ${hotClass}" onclick="window.location.href='coin-analysis.html?coin=${c.id}'">
                    <div class="pump-card-header">
                        <div class="pump-coin-info">
                            <img src="${c.image}" alt="${c.name}" onerror="this.src='../logo-64.png'" loading="lazy">
                            <div>
                                <strong>${c.name}</strong>
                                <span class="pump-symbol">${c.symbol} <span class="pump-rank">#${c.rank}</span></span>
                            </div>
                        </div>
                        <span class="pump-signal">${c.signal}</span>
                    </div>
                    <div class="pump-card-body">
                        <div class="pump-price-row">
                            <span class="pump-price">${fmtPump(c.price)}</span>
                            <span class="pump-change ${c.change24 >= 0 ? 'positive' : 'negative'}">
                                ${c.change24 >= 0 ? '▲' : '▼'} ${Math.abs(c.change24).toFixed(2)}%
                            </span>
                        </div>
                        <div class="pump-score-bar-wrap">
                            <div class="pump-score-bar" style="width:${c.pumpScore}%;background:${scoreColor(c.pumpScore)}"></div>
                            <span class="pump-score-label">${c.pumpScore}</span>
                        </div>
                        <div class="pump-stats">
                            <div class="pump-stat">
                                <span class="pump-stat-label">Volume</span>
                                <span class="pump-stat-val">${abbrPump(c.vol)}</span>
                            </div>
                            <div class="pump-stat">
                                <span class="pump-stat-label">Vol/MCap</span>
                                <span class="pump-stat-val">${c.volMcapRatio.toFixed(1)}%</span>
                            </div>
                            <div class="pump-stat">
                                <span class="pump-stat-label">Momentum</span>
                                <span class="pump-stat-val">${c.momentum.toFixed(0)}%</span>
                            </div>
                            <div class="pump-stat">
                                <span class="pump-stat-label">Mcap</span>
                                <span class="pump-stat-val">${abbrPump(c.mcap)}</span>
                            </div>
                        </div>
                        <div class="pump-changes">
                            <span class="pc-item ${c.change24 >= 0 ? 'green' : 'red'}">24h: ${c.change24 >= 0 ? '+' : ''}${c.change24.toFixed(1)}%</span>
                            <span class="pc-item ${c.change7d >= 0 ? 'green' : 'red'}">7d: ${c.change7d >= 0 ? '+' : ''}${c.change7d.toFixed(1)}%</span>
                            <span class="pc-item ${c.change30d >= 0 ? 'green' : 'red'}">30d: ${c.change30d >= 0 ? '+' : ''}${c.change30d.toFixed(1)}%</span>
                        </div>
                        <div class="pump-badges">
                            ${c.isBreakout ? '<span class="pump-badge breakout-badge">⚡ Breaking Out</span>' : ''}
                            ${c.isVolumeSpike && !c.isBreakout ? '<span class="pump-badge volume-badge">📊 Volume Spike</span>' : ''}
                            ${c.isHot && !c.isBreakout && !c.isVolumeSpike ? '<span class="pump-badge hot-badge">🔥 Hot</span>' : ''}
                        </div>
                    </div>
                </div>`;
            }).join('');
        }, 250));
    }
});
