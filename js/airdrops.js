document.addEventListener('DOMContentLoaded', () => {
    loadAirdrops();
    
    document.getElementById('refresh-airdrops').addEventListener('click', loadAirdrops);
    document.getElementById('airdrop-search').addEventListener('input', (e) => {
        filterAirdrops(e.target.value);
    });
    document.getElementById('airdrop-filter').addEventListener('change', loadAirdrops);
});

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[char]);
}

function safeExternalUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
    } catch {
        return '';
    }
}

async function loadAirdrops() {
    const list = document.getElementById('tool-content');
    const filter = document.getElementById('airdrop-filter').value;
    list.innerHTML = '<div class="loading">Loading potential airdrops from DeFiLlama...</div>';
    
    try {
        const protocols = await API.defillama.getProtocols();
        
        let filtered = protocols.filter(p => {
            const hasToken = p.symbol && p.symbol !== '-' && p.symbol !== '';
            const tvl = p.tvl || 0;
            
            if (filter === 'potential') return !hasToken && tvl > 10000000;
            if (filter === 'active') return hasToken;
            if (filter === 'ended') return hasToken && tvl < 1000000;
            return true;
        }).slice(0, 20);
        
        const tracked = getTrackedAirdrops();
        
        list.innerHTML = filtered.map(protocol => {
            const isTracked = tracked.some(t => t.name === protocol.name);
            const hasToken = protocol.symbol && protocol.symbol !== '-';
            const status = !hasToken ? 'potential' : 'active';
            const tvl = ((protocol.tvl || 0) / 1e6).toFixed(1);
            const name = String(protocol.name || 'Unknown protocol');
            const symbol = hasToken ? String(protocol.symbol) : 'NO TOKEN';
            const category = String(protocol.category || 'DeFi');
            const chains = (protocol.chains || []).slice(0, 3).join(', ');
            const url = safeExternalUrl(protocol.url);
            
            return `
                <div class="crypto-card" data-name="${escapeHtml(name.toLowerCase())}">
                    <div class="coin-header">
                        <div>
                            <div class="coin-name">${escapeHtml(name)}</div>
                            <div class="coin-symbol">${escapeHtml(symbol.toUpperCase())}</div>
                        </div>
                        <span class="chain-badge" style="background: ${getStatusColor(status)};">${status}</span>
                    </div>
                    <div class="pair-stats">
                        <div class="pair-stat">
                            <span>TVL:</span>
                            <span>$${tvl}M</span>
                        </div>
                        <div class="pair-stat">
                            <span>Category:</span>
                            <span>${escapeHtml(category)}</span>
                        </div>
                    </div>
                    <div style="margin-top: 12px; font-size: 13px; color: #CAC4D0;">
                        <strong>Chains:</strong> ${escapeHtml(chains)}
                    </div>
                    <div style="margin-top: 16px; display: flex; gap: 8px;">
                        <button class="btn airdrop-visit" style="flex: 1; padding: 8px;" data-url="${escapeHtml(url)}" ${url ? '' : 'disabled'}>
                            Visit
                        </button>
                        <button class="btn airdrop-track" style="flex: 1; padding: 8px; background: ${isTracked ? 'var(--md-red)' : 'var(--md-green)'};" data-name="${escapeHtml(name)}" data-token="${escapeHtml(symbol)}" data-category="${escapeHtml(category)}">
                            ${isTracked ? 'Remove' : 'Track'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        list.querySelectorAll('.airdrop-visit').forEach(button => {
            button.addEventListener('click', () => window.open(button.dataset.url, '_blank', 'noopener'));
        });
        list.querySelectorAll('.airdrop-track').forEach(button => {
            button.addEventListener('click', () => trackAirdrop(button.dataset.name, button.dataset.token, button.dataset.category));
        });
        
        if (filtered.length === 0) {
            list.innerHTML = '<div class="loading">No airdrops found for this filter.</div>';
        }
        
        renderTrackedAirdrops();
    } catch (err) {
        list.innerHTML = `<div class="error">Error loading airdrops: ${err.message}</div>`;
    }
}

function getTrackedAirdrops() {
    return JSON.parse(localStorage.getItem('tracked-airdrops') || '[]');
}

window.trackAirdrop = function(name, token, category) {
    const tracked = getTrackedAirdrops();
    const index = tracked.findIndex(t => t.name === name);
    
    if (index > -1) {
        tracked.splice(index, 1);
    } else {
        tracked.push({ 
            name: name, 
            token: token || 'N/A', 
            category: category || 'DeFi',
            trackedAt: new Date().toISOString(),
            status: 'tracked'
        });
    }
    
    localStorage.setItem('tracked-airdrops', JSON.stringify(tracked));
    loadAirdrops();
};

function renderTrackedAirdrops() {
    const list = document.getElementById('my-airdrops-list');
    const tracked = getTrackedAirdrops();
    
    if (!list) return;
    
    if (tracked.length === 0) {
        list.innerHTML = '<div style="color: #CAC4D0; padding: 16px;">No airdrops tracked yet.</div>';
        return;
    }
    
    list.innerHTML = tracked.map((airdrop, index) => `
        <div class="portfolio-item">
            <div class="portfolio-item-info">
                <h4>${escapeHtml(airdrop.name)} (${escapeHtml(airdrop.token)})</h4>
                <div>Category: ${escapeHtml(airdrop.category || 'DeFi')}</div>
                <div style="font-size: 12px; color: #CAC4D0;">Tracked: ${new Date(airdrop.trackedAt).toLocaleDateString()}</div>
            </div>
            <div class="portfolio-item-actions">
                <button class="remove-tracked-airdrop" data-index="${index}">Remove</button>
            </div>
        </div>
    `).join('');

    list.querySelectorAll('.remove-tracked-airdrop').forEach(button => {
        button.addEventListener('click', () => {
            const updated = getTrackedAirdrops();
            updated.splice(Number(button.dataset.index), 1);
            localStorage.setItem('tracked-airdrops', JSON.stringify(updated));
            loadAirdrops();
        });
    });
}

function filterAirdrops(query) {
    const cards = document.querySelectorAll('#tool-content .crypto-card');
    cards.forEach(card => {
        card.style.display = card.dataset.name.includes(query.toLowerCase()) ? 'block' : 'none';
    });
}

function getStatusColor(status) {
    switch(status) {
        case 'active': return 'var(--md-green)';
        case 'potential': return 'var(--md-primary)';
        case 'tracked': return 'var(--md-primary)';
        default: return 'var(--md-outline)';
    }
}
