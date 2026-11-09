const SIGNAL_HISTORY_KEY = 'signal-history';
const SIGNAL_DEDUP_HOURS = 4;

function getSignalHistory() {
    try {
        return JSON.parse(localStorage.getItem(SIGNAL_HISTORY_KEY)) || [];
    } catch {
        return [];
    }
}

function saveSignalHistory(history) {
    try {
        localStorage.setItem(SIGNAL_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
        console.warn('Failed to save signal history:', e);
    }
}

function saveCurrentSignals(signals) {
    if (!signals || !signals.length) return;
    let history = getSignalHistory();
    const now = Date.now();
    const dedupMs = SIGNAL_DEDUP_HOURS * 60 * 60 * 1000;

    signals.forEach(s => {
        const existing = history.find(h =>
            h.id === s.id &&
            h.signal === s.signal &&
            (now - h.timestamp) < dedupMs
        );
        if (existing) return;

        const entry = parseFloat(String(s.levels?.entry || '').replace('$', '').split('-')[0]?.trim()) || s.price || 0;
        const stop = parseFloat(String(s.levels?.stopLoss || '').replace('$', '').trim()) || 0;
        const tp1 = parseFloat(String(s.levels?.takeProfit1 || '').replace('$', '').trim()) || 0;

        history.push({
            id: s.id || 'unknown',
            name: s.name || 'Unknown',
            symbol: (s.symbol || '?').toUpperCase(),
            signal: s.signal || 'WATCH',
            entryPrice: entry,
            stopPrice: stop,
            targetPrice: tp1,
            riskReward: s.levels?.riskReward || 'N/A',
            priceAtSignal: s.price || 0,
            change24h: s.change || 0,
            timestamp: now,
            date: new Date().toISOString(),
            outcome: 'active',
            resolvedAt: null,
            resolvedPrice: null
        });
    });

    const cutoff = now - 90 * 24 * 60 * 60 * 1000;
    history = history.filter(h => h.timestamp > cutoff);

    saveSignalHistory(history);
}

function computeOutcomes(signals, prices) {
    return signals.map(s => {
        const current = prices[s.id]?.usd || s.priceAtSignal || 0;
        const isBuy = s.signal === 'BUY' || s.signal === 'STRONG BUY';
        const isSell = s.signal === 'SELL' || s.signal === 'STRONG SELL';

        if (s.outcome !== 'active') return s;

        let outcome = 'active';
        let resolvedAt = s.resolvedAt;
        let resolvedPrice = s.resolvedPrice;

        if (isBuy && s.stopPrice > 0 && s.targetPrice > 0) {
            if (current >= s.targetPrice) {
                outcome = 'win';
                resolvedAt = Date.now();
                resolvedPrice = current;
            } else if (current <= s.stopPrice) {
                outcome = 'loss';
                resolvedAt = Date.now();
                resolvedPrice = current;
            }
        } else if (isSell && s.stopPrice > 0 && s.targetPrice > 0) {
            if (current <= s.targetPrice) {
                outcome = 'win';
                resolvedAt = Date.now();
                resolvedPrice = current;
            } else if (current >= s.stopPrice) {
                outcome = 'loss';
                resolvedAt = Date.now();
                resolvedPrice = current;
            }
        }

        const age = Date.now() - s.timestamp;
        if (outcome === 'active' && age > 7 * 24 * 60 * 60 * 1000) {
            outcome = 'expired';
            resolvedAt = Date.now();
            resolvedPrice = current;
        }

        return { ...s, outcome, resolvedAt, resolvedPrice, currentPrice: current };
    });
}

function getScoreboardStats(signals) {
    const total = signals.length;
    const wins = signals.filter(s => s.outcome === 'win').length;
    const losses = signals.filter(s => s.outcome === 'loss').length;
    const active = signals.filter(s => s.outcome === 'active').length;
    const expired = signals.filter(s => s.outcome === 'expired').length;
    const resolved = wins + losses;
    const winRate = resolved > 0 ? ((wins / resolved) * 100).toFixed(1) : '0.0';

    const buySignals = signals.filter(s => s.signal === 'BUY' || s.signal === 'STRONG BUY').length;
    const sellSignals = signals.filter(s => s.signal === 'SELL' || s.signal === 'STRONG SELL').length;
    const watchSignals = signals.filter(s => s.signal === 'WATCH').length;

    const best = signals
        .filter(s => s.outcome === 'win')
        .sort((a, b) => (b.targetPrice - b.entryPrice) - (a.targetPrice - a.entryPrice))[0];

    const worst = signals
        .filter(s => s.outcome === 'loss')
        .sort((a, b) => (a.entryPrice - a.stopPrice) - (b.entryPrice - b.stopPrice))[0];

    return { total, wins, losses, active, expired, resolved, winRate, buySignals, sellSignals, watchSignals, best, worst };
}
