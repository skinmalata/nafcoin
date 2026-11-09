document.addEventListener('DOMContentLoaded', () => {
    renderProfitHistory();
});

window.calculateProfit = function() {
    const invest = parseFloat(document.getElementById('invest-amount').value) || 0;
    const buyPrice = parseFloat(document.getElementById('buy-price').value) || 0;
    const sellPrice = parseFloat(document.getElementById('sell-price').value) || 0;
    const feePercent = parseFloat(document.getElementById('fee-percent').value) || 0;
    
    if (invest <= 0 || buyPrice <= 0 || sellPrice <= 0) {
        document.getElementById('profit-result').innerHTML = '<div class="error">Please fill in all fields with valid values.</div>';
        return;
    }
    
    const coinsBought = invest / buyPrice;
    const grossAmount = coinsBought * sellPrice;
    const feeAmount = grossAmount * (feePercent / 100);
    const netAmount = grossAmount - feeAmount;
    const profit = netAmount - invest;
    const roi = ((profit / invest) * 100).toFixed(2);
    
    const resultColor = profit >= 0 ? 'profit-positive' : 'profit-negative';
    const profitSign = profit >= 0 ? '+' : '';
    
    const resultHTML = `
        <div class="result-card">
            <div class="result-row">
                <span class="result-label">Investment</span>
                <span class="result-value">$${invest.toFixed(2)}</span>
            </div>
            <div class="result-row">
                <span class="result-label">Coins Bought</span>
                <span class="result-value">${coinsBought.toFixed(6)}</span>
            </div>
            <div class="result-row">
                <span class="result-label">Gross Amount</span>
                <span class="result-value">$${grossAmount.toFixed(2)}</span>
            </div>
            <div class="result-row">
                <span class="result-label">Fee (${feePercent}%)</span>
                <span class="result-value">-$${feeAmount.toFixed(2)}</span>
            </div>
            <div class="result-row">
                <span class="result-label">Net Amount</span>
                <span class="result-value">$${netAmount.toFixed(2)}</span>
            </div>
            <div class="result-row">
                <span class="result-label">Profit / Loss</span>
                <span class="result-value ${resultColor}">${profitSign}$${profit.toFixed(2)}</span>
            </div>
            <div class="result-row">
                <span class="result-label">ROI</span>
                <span class="result-value ${resultColor}">${profitSign}${roi}%</span>
            </div>
        </div>
    `;
    
    document.getElementById('profit-result').innerHTML = resultHTML;
    
    saveCalculation({
        invest,
        buyPrice,
        sellPrice,
        feePercent,
        profit,
        roi: parseFloat(roi),
        timestamp: new Date().toISOString()
    });
    
    renderProfitHistory();
};

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
    
    if (history.length === 0) {
        list.innerHTML = '<div style="color: #CAC4D0; padding: 16px;">No calculations yet.</div>';
        return;
    }
    
    list.innerHTML = history.map((calc, idx) => `
        <div class="profit-history-item">
            <div>Invested: $${calc.invest.toFixed(2)} | Buy: $${calc.buyPrice} | Sell: $${calc.sellPrice}</div>
            <div class="profit ${calc.profit >= 0 ? 'profit-positive' : 'profit-negative'}">
                ${calc.profit >= 0 ? '+' : ''}$${calc.profit.toFixed(2)} (${calc.roi >= 0 ? '+' : ''}${calc.roi.toFixed(2)}%)
            </div>
            <div style="font-size: 11px; color: #888; margin-top: 4px;">${new Date(calc.timestamp).toLocaleString()}</div>
        </div>
    `).join('');
}
