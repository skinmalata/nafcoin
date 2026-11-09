let scoreboardInterval;

async function loadScoreboard() {
    const history = getSignalHistory();
    let prices = {};

    try {
        const uniqueIds = [...new Set(history.filter(s => s.outcome === 'active').map(s => s.id))];
        if (uniqueIds.length > 0) {
            const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${uniqueIds.join(',')}&vs_currencies=usd`);
            prices = await res.json();
        }
    } catch (e) {
        console.warn('Failed to fetch current prices');
    }

    const updated = computeOutcomes(history, prices);
    saveSignalHistory(updated);
    renderScoreboard(updated);
}

function renderScoreboard(signals) {
    const stats = getScoreboardStats(signals);

    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-win-rate').textContent = `${stats.winRate}%`;
    document.getElementById('stat-wins').textContent = stats.wins;
    document.getElementById('stat-losses').textContent = stats.losses;
    document.getElementById('stat-active').textContent = stats.active;
    document.getElementById('stat-buy').textContent = stats.buySignals;
    document.getElementById('stat-sell').textContent = stats.sellSignals;
    document.getElementById('stat-watch').textContent = stats.watchSignals;

    const sorted = [...signals].sort((a, b) => b.timestamp - a.timestamp);
    const tbody = document.getElementById('signal-table-body');
    const filterSignal = document.getElementById('filter-signal')?.value || 'all';
    const filterOutcome = document.getElementById('filter-outcome')?.value || 'all';

    const filtered = sorted.filter(s => {
        if (filterSignal !== 'all') {
            if (filterSignal === 'buy' && !['BUY', 'STRONG BUY'].includes(s.signal)) return false;
            if (filterSignal === 'sell' && !['SELL', 'STRONG SELL'].includes(s.signal)) return false;
            if (filterSignal === 'watch' && s.signal !== 'WATCH') return false;
        }
        if (filterOutcome !== 'all' && s.outcome !== filterOutcome) return false;
        return true;
    });

    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-secondary);">No signals match the selected filters</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(s => {
        const date = new Date(s.timestamp).toLocaleDateString();
        const time = new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const pnl = s.outcome === 'win' ? '✅ Hit TP' :
                    s.outcome === 'loss' ? '❌ Hit SL' :
                    s.outcome === 'expired' ? '⏳ Expired' :
                    '🟡 Active';
        const pnlClass = s.outcome === 'win' ? 'positive' :
                         s.outcome === 'loss' ? 'negative' :
                         s.outcome === 'expired' ? 'neutral-tag' : '';
        const signalBadge = s.signal === 'STRONG BUY' ? 'strong-buy' :
                           s.signal === 'BUY' ? 'buy-badge' :
                           s.signal === 'SELL' ? 'sell-badge' :
                           s.signal === 'STRONG SELL' ? 'strong-sell' : 'watch-badge';
        return `<tr>
            <td>${date}<br><span style="font-size:0.75rem;color:var(--text-muted)">${time}</span></td>
            <td><strong>${s.name}</strong><br><span style="font-size:0.75rem;color:var(--text-secondary)">${s.symbol}</span></td>
            <td><span class="signal-label ${signalBadge}">${s.signal}</span></td>
            <td>$${abbrNumScore(s.entryPrice)}</td>
            <td>$${abbrNumScore(s.targetPrice)}</td>
            <td>$${s.stopPrice > 0 ? abbrNumScore(s.stopPrice) : '—'}</td>
            <td class="${pnlClass}" style="font-weight:600">${pnl}</td>
            <td><span class="rr-badge">1:${s.riskReward || 'N/A'}</span></td>
        </tr>`;
    }).join('');
}

function abbrNumScore(n) {
    if (!n || isNaN(n)) return '0';
    if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
    return n.toFixed(n < 1 ? 4 : 2);
}

function clearSignalHistory() {
    if (!confirm('Clear all signal history? This cannot be undone.')) return;
    localStorage.removeItem(SIGNAL_HISTORY_KEY);
    loadScoreboard();
}

document.addEventListener('DOMContentLoaded', () => {
    loadScoreboard();
    if (scoreboardInterval) clearInterval(scoreboardInterval);
    scoreboardInterval = setInterval(loadScoreboard, 120000);

    document.getElementById('filter-signal')?.addEventListener('change', () => renderScoreboard(getSignalHistory()));
    document.getElementById('filter-outcome')?.addEventListener('change', () => renderScoreboard(getSignalHistory()));
});
