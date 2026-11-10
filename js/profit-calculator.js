document.addEventListener('DOMContentLoaded', () => {
    renderProfitHistory();
    const inputs = ['invest-amount', 'buy-price', 'sell-price', 'fee-percent'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => {
            // Optional: auto recalculate if already filled
        });
    });
});

window.calculateProfit = function() {
    const invest = parseFloat(document.getElementById('invest-amount')?.value) || 0;
    const buyPrice = parseFloat(document.getElementById('buy-price')?.value) || 0;
    const sellPrice = parseFloat(document.getElementById('sell-price')?.value) || 0;
    const feePercent = parseFloat(document.getElementById('fee-percent')?.value) || 0;
    
    if (invest <= 0 || buyPrice <= 0 || sellPrice <= 0) {
        document.getElementById('profit-result').innerHTML = '<div class="error" style="background:rgba(239,68,68,0.1);padding:1rem;border-radius:8px;border:1px solid rgba(239,68,68,0.2);">Please enter valid positive values for all fields.</div>';
        return;
    }
    
    const feeRate = feePercent / 100;
    
    // Entry:
    // User puts up $invest.
    // Buy fee paid at entry:
    const buyFee = invest * feeRate;
    const netInvested = invest - buyFee;
    const coinsBought = netInvested / buyPrice;
    
    // Exit:
    const grossSell = coinsBought * sellPrice;
    const sellFee = grossSell * feeRate;
    const netProceeds = grossSell - sellFee;
    
    const totalFees = buyFee + sellFee;
    const netProfit = netProceeds - invest;
    const grossProfit = (coinsBought * sellPrice) - (coinsBought * buyPrice);
    const roi = (netProfit / invest) * 100;

    // Break-even price: sellPrice where netProceeds == invest
    // coinsBought * P_be * (1 - feeRate) = invest
    // (netInvested / buyPrice) * P_be * (1 - feeRate) = invest
    // P_be = (invest * buyPrice) / (netInvested * (1 - feeRate))
    const breakEvenPrice = (invest * buyPrice) / (netInvested * Math.max(0.0001, (1 - feeRate)));
    
    const resultColor = netProfit >= 0 ? '#10b981' : '#ef4444';
    const profitSign = netProfit >= 0 ? '+' : '';
    
    const resultHTML = `
        <div class="result-card" style="background:var(--bg-card);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:1.5rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;padding-bottom:1rem;border-bottom:1px solid rgba(255,255,255,0.06);">
                <div>
                    <div style="font-size:0.875rem;color:var(--text-secondary);">Net Profit / Loss</div>
                    <div style="font-size:2rem;font-weight:800;color:${resultColor};">${profitSign}$${fmtCurrency(netProfit)}</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:0.875rem;color:var(--text-secondary);">Total ROI</div>
                    <div style="font-size:1.5rem;font-weight:700;color:${resultColor};">${profitSign}${roi.toFixed(2)}%</div>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:0.75rem;margin-bottom:1rem;">
                <div style="background:rgba(255,255,255,0.03);padding:0.75rem;border-radius:8px;">
                    <div style="font-size:0.75rem;color:var(--text-secondary);">Coins Purchased</div>
                    <div style="font-size:1.1rem;font-weight:600;margin-top:2px;">${fmtCoins(coinsBought)}</div>
                </div>
                <div style="background:rgba(255,255,255,0.03);padding:0.75rem;border-radius:8px;">
                    <div style="font-size:0.75rem;color:var(--text-secondary);">Break-Even Price</div>
                    <div style="font-size:1.1rem;font-weight:600;color:#fbbf24;margin-top:2px;">$${fmtPrice(breakEvenPrice)}</div>
                </div>
                <div style="background:rgba(255,255,255,0.03);padding:0.75rem;border-radius:8px;">
                    <div style="font-size:0.75rem;color:var(--text-secondary);">Gross Return</div>
                    <div style="font-size:1.1rem;font-weight:600;margin-top:2px;">$${fmtCurrency(grossSell)}</div>
                </div>
                <div style="background:rgba(255,255,255,0.03);padding:0.75rem;border-radius:8px;">
                    <div style="font-size:0.75rem;color:var(--text-secondary);">Total Fees (Buy + Sell)</div>
                    <div style="font-size:1.1rem;font-weight:600;color:#f87171;margin-top:2px;">-$${fmtCurrency(totalFees)}</div>
                </div>
            </div>

            <div style="font-size:0.8125rem;color:var(--text-secondary);border-top:1px solid rgba(255,255,255,0.06);padding-top:0.75rem;display:flex;justify-content:space-between;">
                <span>Buy Fee (${feePercent}%): -$${fmtCurrency(buyFee)}</span>
                <span>Sell Fee (${feePercent}%): -$${fmtCurrency(sellFee)}</span>
                <span>Gross PnL: ${profitSign}$${fmtCurrency(grossProfit)}</span>
            </div>
        </div>
    `;
    
    document.getElementById('profit-result').innerHTML = resultHTML;
    
    saveCalculation({
        invest,
        buyPrice,
        sellPrice,
        feePercent,
        netProfit,
        roi: parseFloat(roi.toFixed(2)),
        timestamp: new Date().toISOString()
    });
    
    renderProfitHistory();
};

function fmtCurrency(n) {
    if (n === null || n === undefined || isNaN(n)) return '0.00';
    const abs = Math.abs(n);
    if (abs >= 1000) return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (abs >= 1) return n.toFixed(2);
    if (abs >= 0.001) return n.toFixed(4);
    return n.toFixed(6);
}

function fmtPrice(p) {
    if (!p || isNaN(p)) return '0.00';
    if (p >= 1000) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(4);
    if (p >= 0.0001) return p.toFixed(6);
    return p.toFixed(8);
}

function fmtCoins(c) {
    if (!c || isNaN(c)) return '0';
    if (c >= 1000) return c.toLocaleString(undefined, { maximumFractionDigits: 4 });
    if (c >= 1) return c.toFixed(4);
    if (c >= 0.0001) return c.toFixed(6);
    return c.toFixed(8);
}

function getProfitHistory() {
    return JSON.parse(localStorage.getItem('profit-history') || '[]');
}

function saveCalculation(calc) {
    const history = getProfitHistory();
    history.unshift(calc);
    if (history.length > 10) history.pop();
    localStorage.setItem('profit-history', JSON.stringify(history));
}

function renderProfitHistory() {
    const list = document.getElementById('profit-history-list');
    const history = getProfitHistory();
    if (!list) return;
    
    if (history.length === 0) {
        list.innerHTML = '<div style="color: var(--text-secondary); padding: 16px;">No calculations yet. Enter values above and click Calculate.</div>';
        return;
    }
    
    list.innerHTML = history.map((calc) => {
        const isPos = (calc.netProfit !== undefined ? calc.netProfit : calc.profit) >= 0;
        const val = calc.netProfit !== undefined ? calc.netProfit : calc.profit;
        return `
            <div class="profit-history-item" style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem;border-bottom:1px solid rgba(255,255,255,0.05);">
                <div>
                    <div style="font-size:0.875rem;font-weight:600;">$${fmtCurrency(calc.invest)} &bull; Entry: $${fmtPrice(calc.buyPrice)} &rarr; Exit: $${fmtPrice(calc.sellPrice)}</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px;">Fee: ${calc.feePercent || 0}% &bull; ${new Date(calc.timestamp).toLocaleString()}</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-weight:700;color:${isPos ? '#10b981' : '#ef4444'};">
                        ${isPos ? '+' : ''}$${fmtCurrency(val)} (${isPos ? '+' : ''}${calc.roi}%)
                    </div>
                </div>
            </div>
        `;
    }).join('');
}
