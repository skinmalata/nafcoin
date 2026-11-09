const POPULAR_COINS = [
    { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' },
    { id: 'ethereum', symbol: 'eth', name: 'Ethereum' },
    { id: 'tether', symbol: 'usdt', name: 'Tether' },
    { id: 'binancecoin', symbol: 'bnb', name: 'BNB' },
    { id: 'solana', symbol: 'sol', name: 'Solana' },
    { id: 'ripple', symbol: 'xrp', name: 'XRP' },
    { id: 'usd-coin', symbol: 'usdc', name: 'USD Coin' },
    { id: 'cardano', symbol: 'ada', name: 'Cardano' },
    { id: 'dogecoin', symbol: 'doge', name: 'Dogecoin' },
    { id: 'polkadot', symbol: 'dot', name: 'Polkadot' },
    { id: 'litecoin', symbol: 'ltc', name: 'Litecoin' },
    { id: 'avalanche-2', symbol: 'avax', name: 'Avalanche' },
    { id: 'chainlink', symbol: 'link', name: 'Chainlink' },
    { id: 'matic-network', symbol: 'matic', name: 'Polygon' },
    { id: 'shiba-inu', symbol: 'shib', name: 'Shiba Inu' },
    { id: 'uniswap', symbol: 'uni', name: 'Uniswap' },
    { id: 'near', symbol: 'near', name: 'NEAR Protocol' },
    { id: 'pepe', symbol: 'pepe', name: 'Pepe' },
    { id: 'fetch-ai', symbol: 'fet', name: 'Fetch.ai' },
    { id: 'render-token', symbol: 'rndr', name: 'Render' }
];

let priceCache = {};
let isLoading = false;
let editingIndex = null;
let autoRefreshTimer = null;

function getPortfolio() {
    return JSON.parse(localStorage.getItem('crypto-portfolio') || '[]');
}

function savePortfolio(portfolio) {
    localStorage.setItem('crypto-portfolio', JSON.stringify(portfolio));
}

function formatCurrency(val) {
    if (val >= 1000000) return '$' + val.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (val >= 1000) return '$' + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (val >= 1) return '$' + val.toFixed(4);
    return '$' + val.toFixed(6);
}

function formatPct(val) {
    return (val >= 0 ? '+' : '') + val.toFixed(2) + '%';
}

function populateCoinSelect() {
    const select = document.getElementById('coin-select');
    if (!select) return;
    select.innerHTML = '<option value="">Select a coin...</option>' +
        POPULAR_COINS.map(c => `<option value="${c.id}">${c.name} (${c.symbol.toUpperCase()})</option>`).join('');
}

async function loadPrices() {
    const portfolio = getPortfolio();
    if (portfolio.length === 0) return;

    isLoading = true;
    const ids = [...new Set(portfolio.map(p => p.coin))];
    
    try {
        const res = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids.join(',')}&sparkline=false&price_change_percentage=24h`);
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        
        data.forEach(c => {
            priceCache[c.id] = {
                price: c.current_price,
                change24h: c.price_change_percentage_24h || 0,
                image: c.image,
                symbol: c.symbol,
                name: c.name
            };
        });

        document.getElementById('last-updated').textContent = `Updated ${new Date().toLocaleTimeString()}`;
    } catch (e) {
        console.warn('Price fetch failed, using cache or fallback');
    }
    
    isLoading = false;
    renderPortfolio();
}

async function refreshPrices() {
    priceCache = {};
    await loadPrices();
}

function renderPortfolio() {
    const portfolio = getPortfolio();
    const tbody = document.getElementById('holdings-body');
    const emptyState = document.getElementById('empty-state');

    if (portfolio.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        document.getElementById('stat-value').textContent = '$0.00';
        document.getElementById('stat-pnl').textContent = '0.00%';
        document.getElementById('stat-pnl-usd').textContent = '$0.00';
        document.getElementById('stat-24h').textContent = '0.00%';
        document.getElementById('stat-count').textContent = '0';
        return;
    }

    emptyState.style.display = 'none';

    let totalValue = 0, totalCost = 0, weightedChange24h = 0;

    const rows = portfolio.map((item, idx) => {
        const cached = priceCache[item.coin];
        const price = cached?.price || 0;
        const change24h = cached?.change24h || 0;
        const image = cached?.image || '';
        const symbol = cached?.symbol?.toUpperCase() || item.symbol || '';
        const name = cached?.name || item.name || item.coin;
        
        const value = price * item.amount;
        const cost = item.buyPrice * item.amount;
        const pnl = item.buyPrice > 0 ? ((price - item.buyPrice) / item.buyPrice * 100) : 0;
        const pnlUsd = value - cost;

        totalValue += value;
        totalCost += cost;
        weightedChange24h += change24h * value;

        return { idx, name, symbol, price, change24h, image, amount: item.amount, value, cost, pnl, pnlUsd };
    });

    weightedChange24h = totalValue > 0 ? weightedChange24h / totalValue : 0;
    const totalPnl = totalCost > 0 ? ((totalValue - totalCost) / totalCost * 100) : 0;
    const totalPnlUsd = totalValue - totalCost;

    document.getElementById('stat-value').textContent = formatCurrency(totalValue);
    
    const pnlEl = document.getElementById('stat-pnl');
    pnlEl.textContent = formatPct(totalPnl);
    pnlEl.className = 'value ' + (totalPnl >= 0 ? 'positive' : 'negative');
    
    document.getElementById('stat-pnl-usd').textContent = formatCurrency(totalPnlUsd);
    document.getElementById('stat-pnl-usd').className = 'sub ' + (totalPnlUsd >= 0 ? 'positive' : 'negative');
    
    const h24El = document.getElementById('stat-24h');
    h24El.textContent = formatPct(weightedChange24h);
    h24El.className = 'value ' + (weightedChange24h >= 0 ? 'positive' : 'negative');
    
    document.getElementById('stat-count').textContent = portfolio.length;

    tbody.innerHTML = rows.map(r => {
        const allocation = totalValue > 0 ? (r.value / totalValue * 100) : 0;
        return `
            <tr>
                <td>
                    <div class="coin-cell">
                        ${r.image ? `<img src="${r.image}" class="coin-img" alt="${r.symbol}">` : ''}
                        <div>
                            <div class="coin-name">${r.name}</div>
                            <div class="coin-symbol">${r.symbol}</div>
                        </div>
                    </div>
                </td>
                <td>
                    ${formatCurrency(r.price)}
                    <div class="${r.change24h >= 0 ? 'positive' : 'negative'}" style="font-size: 0.75rem;">${formatPct(r.change24h)}</div>
                </td>
                <td>${r.amount}</td>
                <td>
                    <strong>${formatCurrency(r.value)}</strong>
                </td>
                <td class="hide-mobile">
                    <div class="${r.pnl >= 0 ? 'positive' : 'negative'}">
                        ${formatPct(r.pnl)}
                    </div>
                    <div class="${r.pnlUsd >= 0 ? 'positive' : 'negative'}" style="font-size: 0.75rem;">
                        ${formatCurrency(r.pnlUsd)}
                    </div>
                </td>
                <td class="hide-mobile">
                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem;">${allocation.toFixed(1)}%</div>
                    <div class="allocation-bar">
                        <div class="allocation-fill" style="width: ${allocation}%"></div>
                    </div>
                </td>
                <td>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="action-btn" onclick="openEditModal(${r.idx})" title="Edit">✎</button>
                        <button class="action-btn delete" onclick="removeHolding(${r.idx})" title="Remove">✕</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function addHolding() {
    const coinId = document.getElementById('coin-select').value;
    const amount = parseFloat(document.getElementById('coin-amount').value);
    const buyPrice = parseFloat(document.getElementById('coin-buy-price').value) || 0;

    if (!coinId || !amount || amount <= 0) {
        alert('Please select a coin and enter a valid amount');
        return;
    }

    const coin = POPULAR_COINS.find(c => c.id === coinId);
    const portfolio = getPortfolio();
    
    const existingIdx = portfolio.findIndex(p => p.coin === coinId);
    if (existingIdx >= 0) {
        portfolio[existingIdx].amount += amount;
        if (buyPrice > 0) {
            const totalAmount = portfolio[existingIdx].amount;
            const totalCost = (portfolio[existingIdx].buyPrice * (totalAmount - amount)) + (buyPrice * amount);
            portfolio[existingIdx].buyPrice = totalCost / totalAmount;
        }
    } else {
        portfolio.push({
            coin: coinId,
            name: coin.name,
            symbol: coin.symbol,
            amount,
            buyPrice,
            date: new Date().toISOString()
        });
    }

    savePortfolio(portfolio);
    loadPrices();

    document.getElementById('coin-select').value = '';
    document.getElementById('coin-amount').value = '';
    document.getElementById('coin-buy-price').value = '';
}

function removeHolding(idx) {
    const portfolio = getPortfolio();
    if (confirm(`Remove ${portfolio[idx].name} from portfolio?`)) {
        portfolio.splice(idx, 1);
        savePortfolio(portfolio);
        renderPortfolio();
    }
}

function openEditModal(idx) {
    editingIndex = idx;
    const portfolio = getPortfolio();
    const item = portfolio[idx];
    document.getElementById('edit-amount').value = item.amount;
    document.getElementById('edit-buy-price').value = item.buyPrice || '';
    document.getElementById('edit-modal').classList.add('active');
}

function closeEditModal() {
    editingIndex = null;
    document.getElementById('edit-modal').classList.remove('active');
}

function saveEdit() {
    if (editingIndex === null) return;
    const portfolio = getPortfolio();
    const newAmount = parseFloat(document.getElementById('edit-amount').value);
    const newBuyPrice = parseFloat(document.getElementById('edit-buy-price').value) || 0;
    
    if (!newAmount || newAmount <= 0) {
        alert('Please enter a valid amount');
        return;
    }

    portfolio[editingIndex].amount = newAmount;
    portfolio[editingIndex].buyPrice = newBuyPrice;
    savePortfolio(portfolio);
    closeEditModal();
    renderPortfolio();
}

document.addEventListener('DOMContentLoaded', () => {
    populateCoinSelect();
    loadPrices();
    
    autoRefreshTimer = setInterval(() => {
        if (!isLoading) loadPrices();
    }, 120000);
});
