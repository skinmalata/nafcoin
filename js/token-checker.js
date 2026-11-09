document.addEventListener('DOMContentLoaded', () => {
    initTokenChecker();
});

function initTokenChecker() {
    document.getElementById('check-token').addEventListener('click', checkToken);
    document.getElementById('token-address').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkToken();
    });
}

window.quickCheck = function(address, chain) {
    document.getElementById('token-address').value = address;
    document.getElementById('check-chain').value = chain;
    checkToken();
};

async function checkToken() {
    const address = document.getElementById('token-address').value.trim();
    const chainId = document.getElementById('check-chain').value;
    const result = document.getElementById('tool-content');

    if (!address) {
        result.innerHTML = '<div class="empty-state"><p style="font-size: 2rem; margin-bottom: 1rem;">⚠️</p><p style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem;">Enter a contract address</p><p style="color: var(--text-secondary);">Paste the token contract address to run a security audit</p></div>';
        return;
    }

    result.innerHTML = `
        <div class="empty-state">
            <div class="loading-spinner"></div>
            <p style="font-weight: 600;">Analyzing contract on ${getChainName(chainId)}...</p>
        </div>
    `;

    try {
        const res = await fetch(`https://api.gopluslabs.io/api/v1/token_security/${chainId}?contract_addresses=${address}`);
        if (!res.ok) throw new Error(`GoPlus API error: ${res.status}`);
        const data = await res.json();
        const token = data.result?.[address.toLowerCase()];

        if (!token) {
            result.innerHTML = '<div class="empty-state"><p style="font-size: 2rem; margin-bottom: 1rem;">❌</p><p style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem;">Token not found</p><p style="color: var(--text-secondary);">The address may be invalid or not analyzed yet on this chain</p></div>';
            return;
        }

        const score = calculateSecurityScore(token);
        const risks = getRiskFlags(token);
        const details = getTokenDetails(token);

        let riskBanner = '';
        if (risks.length > 0) {
            riskBanner = `
                <div class="warning-banner">
                    <span class="icon">⚠️</span>
                    <span class="message">${risks.join(' • ')}</span>
                </div>
            `;
        }

        result.innerHTML = `
            <div class="security-result">
                ${riskBanner}
                <div class="score-header">
                    <div class="score-circle" style="background: ${getScoreBg(score)}; color: ${getScoreColor(score)}; border-color: ${getScoreColor(score)};">
                        ${score}
                    </div>
                    <div class="score-label">${getScoreLabel(score)}</div>
                    <div class="score-subtitle">Security Score on ${getChainName(chainId)}</div>
                </div>
                <div class="token-info-bar">
                    <div class="token-info-item">
                        <div class="label">Token Name</div>
                        <div class="value">${token.token_name || 'N/A'}</div>
                    </div>
                    <div class="token-info-item">
                        <div class="label">Symbol</div>
                        <div class="value">${token.symbol || 'N/A'}</div>
                    </div>
                    <div class="token-info-item">
                        <div class="label">Total Supply</div>
                        <div class="value">${formatSupply(token.total_supply, details.decimals)}</div>
                    </div>
                    <div class="token-info-item">
                        <div class="label">Holders</div>
                        <div class="value">${token.holder_count || 'N/A'}</div>
                    </div>
                    <div class="token-info-item">
                        <div class="label">Decimals</div>
                        <div class="value">${details.decimals}</div>
                    </div>
                </div>
                <div class="checks-grid">
                    ${renderCheckItem('Open Source', token.is_open_source, 'normal')}
                    ${renderCheckItem('Honeypot Risk', token.is_honeypot, 'critical')}
                    ${renderCheckItem('Mintable', token.is_mintable, 'high')}
                    ${renderCheckItem('Proxy Contract', token.has_proxy, 'medium')}
                    ${renderCheckItem('Owner Can Change Balance', token.owner_can_change_balance, 'high')}
                    ${renderCheckItem('Take Back Ownership', token.can_take_back_ownership, 'critical')}
                    ${renderCheckItem('Transfer Pausable', token.is_pausable, 'medium')}
                    ${renderCheckItem('Trading Cooldown', token.is_cooldown, 'medium')}
                    ${renderCheckItem('Anti-Whale', token.is_anti_whale, 'info')}
                    ${renderCheckItem('Self-Destruct', token.is_in_danger, 'critical')}
                    ${renderCheckItem('External Call', token.is_true_token, 'normal')}
                    ${renderCheckItem('Buy Tax', details.buyTax > 0 ? `⚠ ${details.buyTax}%` : '✓ 0%', details.buyTax > 10 ? 'fail' : details.buyTax > 0 ? 'warning' : 'pass', details.buyTax > 0)}
                    ${renderCheckItem('Sell Tax', details.sellTax > 0 ? `⚠ ${details.sellTax}%` : '✓ 0%', details.sellTax > 10 ? 'fail' : details.sellTax > 0 ? 'warning' : 'pass', details.sellTax > 0)}
                    ${renderCheckItem('Owner Balance', `${parseFloat(token.owner_balance || 0).toFixed(2)}%`, parseFloat(token.owner_balance || 0) > 20 ? 'fail' : parseFloat(token.owner_balance || 0) > 5 ? 'warning' : 'pass', parseFloat(token.owner_balance || 0) > 0)}
                    ${renderCheckItem('Top 10 Holders', `${parseFloat(token.top_10_holder_percent || 0).toFixed(1)}%`, parseFloat(token.top_10_holder_percent || 0) > 80 ? 'fail' : parseFloat(token.top_10_holder_percent || 0) > 50 ? 'warning' : 'pass', true)}
                    ${renderCheckItem('LP Locked', details.lpLocked, 'normal')}
                    ${renderCheckItem('Renounced Ownership', details.renounced, 'normal')}
                    ${renderCheckItem('Personal Slippage', token.personal_slippage_modification === '1', 'medium')}
                </div>
            </div>
        `;
    } catch (err) {
        console.error('Token check error:', err);
        result.innerHTML = `<div class="empty-state"><p style="font-size: 2rem; margin-bottom: 1rem;">❌</p><p style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem;">Analysis failed</p><p style="color: var(--text-secondary);">${err.message}</p></div>`;
    }
}

function renderCheckItem(name, status, severity, hasValue = false) {
    if (hasValue) {
        const statusClass = status === 'fail' ? 'fail' : status === 'warning' ? 'warning' : 'pass';
        return `<div class="check-card ${statusClass}"><span class="check-name">${name}</span><span class="check-status">${status}</span></div>`;
    }

    const present = status === '1' || status === true;
    const isPositiveProperty = severity === 'normal';
    const statusClass = isPositiveProperty
        ? (present ? 'pass' : 'warning')
        : (present ? (severity === 'medium' || severity === 'info' ? 'warning' : 'fail') : 'pass');
    const displayText = present ? 'Yes' : 'No';

    return `
        <div class="check-card ${statusClass}">
            <span class="check-name">${name}</span>
            <span class="check-status">${displayText}</span>
        </div>
    `;
}

function getRiskFlags(token) {
    const risks = [];
    if (token.is_honeypot === '1') risks.push('HONEYPOT DETECTED');
    if (token.can_take_back_ownership === '1') risks.push('Owner can reclaim control');
    if (token.is_mintable === '1') risks.push('Unlimited minting possible');
    if (parseFloat(token.owner_balance || 0) > 30) risks.push('Owner holds >30% supply');
    if (token.is_true_token !== '1') risks.push('May not be a real token');
    return risks;
}

function getTokenDetails(token) {
    const buyTax = parseFloat(token.buy_tax || token.buy_tax_percent || 0);
    const sellTax = parseFloat(token.sell_tax || token.sell_tax_percent || 0);
    const lpLocked = token.lp_holder_count ? 'Yes ✓' : 'Unknown';
    const renounced = token.owner_balance === '0' ? 'Yes ✓' : 'No';
    const decimals = parseInt(token.decimals) || 18;
    return {
        buyTax,
        sellTax,
        lpLocked: Boolean(token.lp_holder_count),
        renounced: token.owner_balance === '0',
        decimals
    };
}

function calculateSecurityScore(token) {
    let score = 100;
    if (token.is_open_source !== '1') score -= 10;
    if (token.has_proxy === '1') score -= 10;
    if (token.is_mintable === '1') score -= 15;
    if (token.can_take_back_ownership === '1') score -= 20;
    if (parseFloat(token.owner_balance || 0) > 20) score -= 15;
    else if (parseFloat(token.owner_balance || 0) > 10) score -= 10;
    if (token.is_honeypot === '1') score -= 35;
    if (token.is_pausable === '1') score -= 10;
    if (token.is_cooldown === '1') score -= 5;
    if (token.is_true_token !== '1') score -= 15;
    const buyTax = parseFloat(token.buy_tax || 0);
    const sellTax = parseFloat(token.sell_tax || 0);
    if (buyTax > 10) score -= 10;
    if (sellTax > 10) score -= 10;
    if (parseFloat(token.top_10_holder_percent || 0) > 80) score -= 10;
    return Math.max(0, Math.min(100, score));
}

function getScoreColor(score) {
    if (score >= 80) return '#34d399';
    if (score >= 60) return '#60a5fa';
    if (score >= 40) return '#fbbf24';
    return '#f87171';
}

function getScoreBg(score) {
    if (score >= 80) return 'rgba(16,185,129,0.15)';
    if (score >= 60) return 'rgba(96,165,250,0.15)';
    if (score >= 40) return 'rgba(245,158,11,0.15)';
    return 'rgba(239,68,68,0.15)';
}

function getScoreLabel(score) {
    if (score >= 80) return '✅ Low Risk';
    if (score >= 60) return '🔵 Moderate Risk';
    if (score >= 40) return '🟡 High Risk';
    return '🔴 Very High Risk';
}

function getChainName(chainId) {
    const chains = {
        '1': 'Ethereum', '56': 'BSC', '137': 'Polygon',
        '42161': 'Arbitrum', '43114': 'Avalanche', '10': 'Optimism',
        '8453': 'Base', '250': 'Fantom', 'solana': 'Solana'
    };
    return chains[chainId] || chainId;
}

function formatSupply(supply, decimals) {
    if (!supply) return 'N/A';
    const num = parseFloat(supply) / Math.pow(10, parseInt(decimals) || 18);
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
}
