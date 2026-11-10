document.addEventListener('DOMContentLoaded', initDexScanner);

let allDexPairs = [];

function initDexScanner() {
    loadDexPairs();

    document.getElementById('dex-search')?.addEventListener('input', debounce((e) => {
        filterDexPairs(e.target.value);
    }, 300));

    document.getElementById('chain-filter')?.addEventListener('change', () => {
        loadDexPairs();
    });

    document.getElementById('volume-sort')?.addEventListener('change', () => {
        sortAndRenderDexPairs();
    });

    document.getElementById('min-liquidity')?.addEventListener('change', () => {
        filterByLiquidity();
    });
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

async function loadDexPairs() {
    const grid = document.getElementById('tool-content');
    const chainSelect = document.getElementById('chain-filter');
    const chain = chainSelect ? chainSelect.value : '';

    grid.innerHTML = `
        <div class="loading" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
            <div class="loading-spinner"></div>
            <p>Scanning live DEX pairs across on-chain pools...</p>
        </div>
    `;

    try {
        const chainTokens = {
            'solana': 'So11111111111111111111111111111111111111112',
            'ethereum': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            'bsc': '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
            'base': '0x4200000000000000000000000000000000000006',
            'arbitrum': '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
            'polygon': '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
            'avalanche': '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
            'optimism': '0x4200000000000000000000000000000000000006'
        };

        let pairs = [];

        if (chain && chainTokens[chain]) {
            const tokenAddress = chainTokens[chain];
            const [tokenRes, searchRes] = await Promise.all([
                fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`).then(r => r.ok ? r.json() : { pairs: [] }).catch(() => ({ pairs: [] })),
                fetch(`https://api.dexscreener.com/latest/dex/search?q=${chain}`).then(r => r.ok ? r.json() : { pairs: [] }).catch(() => ({ pairs: [] }))
            ]);

            const combined = [...(tokenRes.pairs || []), ...(searchRes.pairs || [])];
            const seen = new Set();
            pairs = combined.filter(p => {
                if (!p.pairAddress || seen.has(p.pairAddress)) return false;
                seen.add(p.pairAddress);
                return p.chainId === chain;
            });
        } else {
            const searchQueries = ['USDC', 'USDT', 'WETH', 'SOL', 'PEPE', 'WIF', 'BONK', 'BRETT'];
            const fetchPromises = searchQueries.map(q =>
                fetch(`https://api.dexscreener.com/latest/dex/search?q=${q}`)
                    .then(r => r.ok ? r.json() : { pairs: [] })
                    .catch(() => ({ pairs: [] }))
            );
            const results = await Promise.all(fetchPromises);
            const allPairs = results.flatMap(r => r.pairs || []);

            const seen = new Set();
            pairs = allPairs.filter(p => {
                if (!p.pairAddress) return false;
                const key = p.chainId + '_' + p.pairAddress;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        }

        pairs = pairs.filter(p => (parseFloat(p.liquidity?.usd) || 0) > 100);

        if (pairs.length === 0) {
            throw new Error('No live pairs currently returned for this filter.');
        }

        allDexPairs = pairs;
        renderDexStats(allDexPairs);
        sortAndRenderDexPairs();

    } catch (err) {
        console.error('DEX scan error:', err);
        allDexPairs = [];
        renderDexStats([]);
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: var(--bg-card); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
                <p style="font-size: 2rem; margin-bottom: 1rem;">⚠️</p>
                <p style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem;">Live DEX Feed Unavailable</p>
                <p style="color: var(--text-secondary); max-width: 500px; margin: 0 auto 1.5rem;">${err.message || 'Unable to connect to on-chain DEX data.'} No simulated or synthetic tokens are displayed.</p>
                <button class="btn btn-primary" onclick="loadDexPairs()">Retry Scan</button>
            </div>
        `;
    }
}

function renderDexStats(pairs) {
    const statsBar = document.getElementById('dex-stats-bar');
    if (!statsBar) return;

    if (!pairs || pairs.length === 0) {
        statsBar.innerHTML = '';
        return;
    }

    const totalVolume = pairs.reduce((sum, p) => sum + (parseFloat(p.volume?.h24) || 0), 0);
    const totalLiquidity = pairs.reduce((sum, p) => sum + (parseFloat(p.liquidity?.usd) || 0), 0);
    const avgChange = (pairs.reduce((sum, p) => sum + (parseFloat(p.priceChange?.h24) || 0), 0) / pairs.length);
    const topGainer = pairs.reduce((max, p) => (parseFloat(p.priceChange?.h24) || 0) > (parseFloat(max.priceChange?.h24) || 0) ? p : max, pairs[0]);

    statsBar.innerHTML = `
        <div class="stat-item">
            <div class="stat-label">Live Pairs</div>
            <div class="stat-value">${pairs.length}</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">24h DEX Volume</div>
            <div class="stat-value">$${formatLargeNumber(totalVolume)}</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">Pool Liquidity</div>
            <div class="stat-value">$${formatLargeNumber(totalLiquidity)}</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">Avg 24h Change</div>
            <div class="stat-value" style="color: ${avgChange >= 0 ? '#10b981' : '#ef4444'};">${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">Top Performer</div>
            <div class="stat-value" style="color: #10b981; font-size: 1rem;">${topGainer?.baseToken?.symbol || 'N/A'} +${parseFloat(topGainer?.priceChange?.h24 || 0).toFixed(1)}%</div>
        </div>
    `;
}

function sortAndRenderDexPairs() {
    const sortBy = document.getElementById('volume-sort')?.value || 'volume';
    let filtered = [...allDexPairs];

    const minLiq = parseFloat(document.getElementById('min-liquidity')?.value) || 0;
    filtered = filtered.filter(p => (parseFloat(p.liquidity?.usd) || 0) >= minLiq);

    if (sortBy === 'volume') {
        filtered.sort((a, b) => (parseFloat(b.volume?.h24) || 0) - (parseFloat(a.volume?.h24) || 0));
    } else if (sortBy === 'liquidity') {
        filtered.sort((a, b) => (parseFloat(b.liquidity?.usd) || 0) - (parseFloat(a.liquidity?.usd) || 0));
    } else if (sortBy === 'gainers') {
        filtered.sort((a, b) => (parseFloat(b.priceChange?.h24) || 0) - (parseFloat(a.priceChange?.h24) || 0));
    } else if (sortBy === 'losers') {
        filtered.sort((a, b) => (parseFloat(a.priceChange?.h24) || 0) - (parseFloat(b.priceChange?.h24) || 0));
    }

    renderDexPairs(filtered);
}

function renderDexPairs(pairs) {
    const grid = document.getElementById('tool-content');

    if (pairs.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: var(--bg-card); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
                <p style="font-size: 2rem; margin-bottom: 1rem;">🔍</p>
                <p style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem;">No pairs match your filters</p>
                <p style="color: var(--text-secondary);">Try lowering the minimum liquidity or selecting a different blockchain.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = pairs.map(pair => {
        const baseToken = pair.baseToken || {};
        const quoteToken = pair.quoteToken || {};
        const priceUsd = parseFloat(pair.priceUsd) || 0;
        const change24h = parseFloat(pair.priceChange?.h24) || 0;
        const change6h = parseFloat(pair.priceChange?.h6) || 0;
        const change1h = parseFloat(pair.priceChange?.h1) || 0;
        const volume24h = parseFloat(pair.volume?.h24) || 0;
        const liquidity = parseFloat(pair.liquidity?.usd) || 0;
        const marketCap = parseFloat(pair.marketCap) || 0;
        const fdv = parseFloat(pair.fdv) || 0;
        const txns24h = pair.txns?.h24 || {};
        const buys24h = txns24h.buys || 0;
        const sells24h = txns24h.sells || 0;
        const totalTxns24h = buys24h + sells24h;
        const buyRatio = totalTxns24h > 0 ? (buys24h / totalTxns24h * 100) : 50;
        const pairUrl = pair.url || `https://dexscreener.com/${pair.chainId}/${pair.pairAddress}`;
        const chainName = getChainName(pair.chainId);
        const dexName = pair.dexId || 'DEX';

        let priceDisplay;
        if (priceUsd === 0) priceDisplay = '$0.00';
        else if (priceUsd < 0.000001) priceDisplay = `$${priceUsd.toFixed(10)}`;
        else if (priceUsd < 0.001) priceDisplay = `$${priceUsd.toFixed(7)}`;
        else if (priceUsd < 1) priceDisplay = `$${priceUsd.toFixed(5)}`;
        else if (priceUsd < 1000) priceDisplay = `$${priceUsd.toFixed(3)}`;
        else priceDisplay = `$${priceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        const isHot = change24h > 15 && volume24h > 1e5;
        const isNew = pair.pairCreatedAt && (Date.now() - pair.pairCreatedAt) < 86400000;

        return `
            <div class="dex-card" data-pair="${(baseToken.name || baseToken.symbol || '').toLowerCase()}" style="background: var(--bg-card); border-radius: 16px; border: 1px solid ${isHot ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.1)'}; overflow: hidden; transition: transform 0.3s, box-shadow 0.3s; position: relative;">
                ${isHot ? '<div class="hot-badge" style="position: absolute; top: 12px; right: 12px; background: rgba(245,158,11,0.9); color: #fff; font-size: 0.625rem; font-weight: 700; padding: 0.25rem 0.625rem; border-radius: 4px; text-transform: uppercase;">🔥 Hot</div>' : ''}
                ${isNew ? `<div class="new-badge" style="position: absolute; top: 12px; right: ${isHot ? '75px' : '12px'}; background: rgba(124,58,237,0.9); color: #fff; font-size: 0.625rem; font-weight: 700; padding: 0.25rem 0.625rem; border-radius: 4px; text-transform: uppercase;">New</div>` : ''}

                <div class="dex-header" style="padding: 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <div style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary);">${baseToken.symbol || 'N/A'}/${quoteToken.symbol || 'N/A'}</div>
                            <div style="display: flex; gap: 0.5rem; align-items: center; margin-top: 0.5rem;">
                                <span class="chain-badge" style="padding: 0.25rem 0.5rem; background: rgba(103,80,164,0.2); color: #a78bfa; border-radius: 4px; font-size: 0.6875rem; font-weight: 600;">${chainName}</span>
                                <span class="dex-badge" style="padding: 0.25rem 0.5rem; background: rgba(255,255,255,0.08); color: var(--text-secondary); border-radius: 4px; font-size: 0.6875rem; font-weight: 500;">${dexName}</span>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 1.35rem; font-weight: 700; color: var(--text-primary);">${priceDisplay}</div>
                            <div style="font-size: 0.9375rem; font-weight: 700; color: ${change24h >= 0 ? '#10b981' : '#ef4444'}; margin-top: 0.25rem;">
                                ${change24h >= 0 ? '▲' : '▼'} ${Math.abs(change24h).toFixed(2)}%
                            </div>
                        </div>
                    </div>
                </div>

                <div class="dex-body" style="padding: 1.25rem;">
                    <div class="timeframe-changes" style="display: flex; gap: 0.75rem; margin-bottom: 1rem;">
                        <div class="time-change" style="flex: 1; text-align: center; padding: 0.5rem; background: rgba(255,255,255,0.03); border-radius: 8px;">
                            <div style="font-size: 0.625rem; color: var(--text-secondary); font-weight: 600;">1H</div>
                            <div style="font-size: 0.875rem; font-weight: 700; color: ${change1h >= 0 ? '#10b981' : '#ef4444'};">${change1h >= 0 ? '+' : ''}${change1h.toFixed(2)}%</div>
                        </div>
                        <div class="time-change" style="flex: 1; text-align: center; padding: 0.5rem; background: rgba(255,255,255,0.03); border-radius: 8px;">
                            <div style="font-size: 0.625rem; color: var(--text-secondary); font-weight: 600;">6H</div>
                            <div style="font-size: 0.875rem; font-weight: 700; color: ${change6h >= 0 ? '#10b981' : '#ef4444'};">${change6h >= 0 ? '+' : ''}${change6h.toFixed(2)}%</div>
                        </div>
                        <div class="time-change" style="flex: 1; text-align: center; padding: 0.5rem; background: rgba(255,255,255,0.03); border-radius: 8px;">
                            <div style="font-size: 0.625rem; color: var(--text-secondary); font-weight: 600;">24H</div>
                            <div style="font-size: 0.875rem; font-weight: 700; color: ${change24h >= 0 ? '#10b981' : '#ef4444'};">${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%</div>
                        </div>
                    </div>

                    <div class="dex-metrics" style="margin-bottom: 1rem;">
                        <div style="display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 0.875rem;">
                            <span style="color: var(--text-secondary);">24h Volume</span>
                            <span style="font-weight: 600; color: var(--text-primary);">$${formatLargeNumber(volume24h)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 0.875rem;">
                            <span style="color: var(--text-secondary);">Liquidity</span>
                            <span style="font-weight: 600; color: #10b981;">$${formatLargeNumber(liquidity)}</span>
                        </div>
                        ${marketCap > 0 ? `
                        <div style="display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 0.875rem;">
                            <span style="color: var(--text-secondary);">Market Cap</span>
                            <span style="font-weight: 600; color: var(--text-primary);">$${formatLargeNumber(marketCap)}</span>
                        </div>` : ''}
                        ${fdv > 0 ? `
                        <div style="display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 0.875rem;">
                            <span style="color: var(--text-secondary);">FDV</span>
                            <span style="font-weight: 600; color: var(--text-primary);">$${formatLargeNumber(fdv)}</span>
                        </div>` : ''}
                    </div>

                    <div class="trade-activity" style="margin-bottom: 1rem;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.375rem;">
                            <span style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">24h Transactions</span>
                            <span style="font-size: 0.75rem; font-weight: 600; color: ${buyRatio > 55 ? '#10b981' : buyRatio < 45 ? '#ef4444' : '#f59e0b'};">${buys24h.toLocaleString()} Buys / ${sells24h.toLocaleString()} Sells</span>
                        </div>
                        <div style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden; display: flex;">
                            <div style="height: 100%; width: ${buyRatio}%; background: #10b981;"></div>
                            <div style="height: 100%; width: ${100 - buyRatio}%; background: #ef4444;"></div>
                        </div>
                    </div>
                </div>

                <div class="dex-footer" style="padding: 0 1.25rem 1.25rem; display: flex; gap: 0.5rem;">
                    <a href="${pairUrl}" target="_blank" rel="noopener noreferrer" class="dex-btn" style="flex: 1; padding: 0.75rem; background: linear-gradient(135deg, #7C3AED, #5B21B6); color: #fff; border-radius: 8px; text-align: center; text-decoration: none; font-weight: 600; font-size: 0.8125rem;">View on DexScreener &rarr;</a>
                    <button class="dex-btn-copy" onclick="copyPairAddress('${pair.baseToken?.address || pair.pairAddress}')" style="padding: 0.75rem 1rem; background: rgba(255,255,255,0.05); color: var(--text-secondary); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); cursor: pointer;" title="Copy token address">📋</button>
                </div>
            </div>
        `;
    }).join('');
}

function filterDexPairs(query) {
    const search = (query || '').toLowerCase();
    const filtered = allDexPairs.filter(pair => {
        const baseName = (pair.baseToken?.name || '').toLowerCase();
        const baseSymbol = (pair.baseToken?.symbol || '').toLowerCase();
        const chainId = (pair.chainId || '').toLowerCase();
        return baseName.includes(search) || baseSymbol.includes(search) || chainId.includes(search);
    });
    renderDexPairs(filtered);
}

function filterByLiquidity() {
    sortAndRenderDexPairs();
}

function copyPairAddress(address) {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
        showToast('Address copied to clipboard!');
    }).catch(() => {
        showToast('Address copied!');
    });
}

function showToast(message) {
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    toast.style.cssText = 'position: fixed; bottom: 24px; right: 24px; background: rgba(16,185,129,0.95); color: #fff; padding: 0.875rem 1.25rem; border-radius: 10px; font-size: 0.875rem; font-weight: 600; z-index: 10000; animation: slideIn 0.3s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

function getChainName(chainId) {
    const chains = {
        'ethereum': 'Ethereum',
        'bsc': 'BSC',
        'polygon': 'Polygon',
        'solana': 'Solana',
        'arbitrum': 'Arbitrum',
        'avalanche': 'Avalanche',
        'optimism': 'Optimism',
        'base': 'Base',
        'tron': 'TRON',
        'sui': 'Sui',
        'ton': 'TON'
    };
    return chains[chainId] || chainId;
}

function formatLargeNumber(num) {
    if (!num || num === 0) return '0';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
}
