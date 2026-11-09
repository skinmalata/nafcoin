let chartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('load-chart');
    if (btn) btn.addEventListener('click', loadChart);
    
    const urlParams = new URLSearchParams(window.location.search);
    const coinParam = urlParams.get('coin');
    if (coinParam) {
        document.getElementById('chart-coin').value = coinParam;
        loadChart();
    }
});

async function loadChart() {
    const coinId = document.getElementById('chart-coin').value.trim() || 'bitcoin';
    const days = document.getElementById('chart-days').value;
    const canvas = document.getElementById('tool-content');
    
    if (!canvas) return;
    
    try {
        const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`);
        if (!res.ok) throw new Error('CoinGecko API error');
        const data = await res.json();
        const prices = data.prices;
        
        if (chartInstance) chartInstance.destroy();
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: prices.map(p => {
                    const d = new Date(p[0]);
                    return days <= 1 ? d.toLocaleTimeString() : d.toLocaleDateString();
                }),
                datasets: [{
                    label: 'Price (USD)',
                    data: prices.map(p => p[1]),
                    borderColor: '#6750A4',
                    backgroundColor: 'rgba(103, 80, 164, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#E6E1E5' } }
                },
                scales: {
                    x: { 
                        ticks: { color: '#CAC4D0', maxRotation: 45 },
                        grid: { color: 'rgba(103, 80, 164, 0.1)' }
                    },
                    y: { 
                        ticks: { color: '#CAC4D0' },
                        grid: { color: 'rgba(103, 80, 164, 0.1)' }
                    }
                }
            }
        });
    } catch (err) {
        if (canvas) canvas.innerHTML = `<div class="error">Error loading chart: ${err.message}</div>`;
    }
}
