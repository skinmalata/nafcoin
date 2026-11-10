document.addEventListener('DOMContentLoaded', () => {
    initTokenChecker();
});

function initTokenChecker() {
    const btn = document.getElementById('check-token');
    const input = document.getElementById('token-address');
    if (btn) btn.addEventListener('click', checkToken);
    if (input) input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkToken();
    });
}

window.quickCheck = function(address, chain) {
    const addrInput = document.getElementById('token-address');
    const chainSelect = document.getElementById('check-chain');
    if (addrInput) addrInput.value = address;
    if (chainSelect) chainSelect.value = chain;
    checkToken();
};

async function checkToken() {
    const addressInput = document.getElementById('token-address');
    const chainSelect = document.getElementById('check-chain');
    const address = addressInput ? addressInput.value.trim() : '';
    const chainId = chainSelect ? chainSelect.value : '1';
    const result = document.getElementById('tool-content');

    if (!address) {
        result.innerHTML = '<div class="empty-state"><p style="font-size: 2rem; margin-bottom: 1rem;">⚠️</p><p style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem;">Enter a contract address</p><p style="color: var(--text-secondary);">Paste the token contract address to run an on-chain security audit</p></div>';
        return;
    }

    result.innerHTML = `
        <div class="empty-state">
            <div class="loading-spinner"></div>
            <p style="font-weight: 600;">Analyzing contract on ${getChainName(chainId)}...</p>
        </div>
    `;

    try {
        const isSolana = (chainId === 'solana');
        const url = isSolana
            ? `https://api.gopluslabs.io/api/v1/solana/token_security?contract_addresses=${encodeURIComponent(address)}`
            : `https://api.gopluslabs.io/api/v1/token_security/${chainId}?contract_addresses=${encodeURIComponent(address)}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`Security API error: ${res.status}`);
        const data = await res.json();
        
        const tokenKey = isSolana ? address : address.toLowerCase();
        const token = data.result?.[tokenKey] || data.result?.[address];

        if (!token) {
            result.innerHTML = '<div class="empty-state"><p style="font-size: 2rem; margin-bottom: 1rem;">❌</p><p style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem;">Token not found</p><p style="color: var(--text-secondary);">The address may be invalid or has not been indexed yet on this chain.</p></div>';
            return;
        }

        if (isSolana) {
            renderSolanaToken(token, address, result);
        } else {
            renderEvmToken(token, address, chainId, result);
        }

    } catch (err) {
        console.error('Token check error:', err);
        result.innerHTML = `<div class="empty-state"><p style="font-size: 2rem; margin-bottom: 1rem;">❌</p><p style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem;">Audit Failed</p><p style="color: var(--text-secondary);">${err.message}</p></div>`;
    }
}

function renderEvmToken(token, address, chainId, container) {
    const details = getEvmTokenDetails(token);
    const score = calculateEvmSecurityScore(token, details);
    const risks = getEvmRiskFlags(token, details);

    let riskBanner = '';
    if (risks.length > 0) {
        riskBanner = `
            <div class="warning-banner" style="background:rgba(239,68,68,0.15);border-bottom:1px solid rgba(239,68,68,0.2);padding:1rem 1.5rem;display:flex;align-items:center;gap:0.75rem;">
                <span style="font-size:1.5rem;">🚨</span>
                <span style="font-size:0.9375rem;color:#fca5a5;font-weight:600;">Critical Risk: ${risks.join(' • ')}</span>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="security-result" style="background:var(--bg-card);border-radius:16px;border:1px solid rgba(255,255,255,0.1);overflow:hidden;">
            ${riskBanner}
            <div class="score-header" style="text-align:center;padding:2rem 1.5rem;border-bottom:1px solid rgba(255,255,255,0.05);">
                <div class="score-circle" style="width:90px;height:90px;border-radius:50%;margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:800;border:4px solid ${getScoreColor(score)};background:${getScoreBg(score)};color:${getScoreColor(score)};">
                    ${score}
                </div>
                <div class="score-label" style="font-size:1.25rem;font-weight:700;color:${getScoreColor(score)};">${getScoreLabel(score)}</div>
                <div class="score-subtitle" style="font-size:0.875rem;color:var(--text-secondary);margin-top:0.25rem;">Security Score on ${getChainName(chainId)} (0-100)</div>
            </div>

            <div class="token-info-bar" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:1rem;padding:1.5rem;background:rgba(255,255,255,0.02);border-bottom:1px solid rgba(255,255,255,0.05);">
                <div>
                    <div style="font-size:0.75rem;color:var(--text-secondary);">Token Name</div>
                    <div style="font-size:1rem;font-weight:700;">${token.token_name || 'N/A'}</div>
                </div>
                <div>
                    <div style="font-size:0.75rem;color:var(--text-secondary);">Symbol</div>
                    <div style="font-size:1rem;font-weight:700;">${token.symbol || 'N/A'}</div>
                </div>
                <div>
                    <div style="font-size:0.75rem;color:var(--text-secondary);">Total Supply</div>
                    <div style="font-size:1rem;font-weight:700;">${formatSupply(token.total_supply, details.decimals)}</div>
                </div>
                <div>
                    <div style="font-size:0.75rem;color:var(--text-secondary);">Holders</div>
                    <div style="font-size:1rem;font-weight:700;">${(token.holder_count || 0).toLocaleString()}</div>
                </div>
                <div>
                    <div style="font-size:0.75rem;color:var(--text-secondary);">Owner Address</div>
                    <div style="font-size:0.85rem;font-weight:600;font-family:monospace;" title="${token.owner_address || 'None'}">${shortenAddr(token.owner_address)}</div>
                </div>
            </div>

            <div class="checks-grid" style="padding:1.5rem;display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:0.75rem;">
                ${renderItem('Verified Source Code', token.is_open_source === '1' ? 'Open Source ✓' : 'Unverified ✕', token.is_open_source === '1' ? 'pass' : 'warning')}
                ${renderItem('Honeypot Test', token.is_honeypot === '1' ? 'HONEYPOT ⚠️' : 'Passed ✓', token.is_honeypot === '1' ? 'fail' : 'pass')}
                ${renderItem('Mintable Function', token.is_mintable === '1' ? 'Mintable ⚠️' : 'Fixed Supply ✓', token.is_mintable === '1' ? 'fail' : 'pass')}
                ${renderItem('Ownership Renounced', details.isRenounced ? 'Renounced ✓' : 'Not Renounced ⚠️', details.isRenounced ? 'pass' : 'warning')}
                ${renderItem('Liquidity Lock/Burn', details.lpLockText, details.lpLockStatus)}
                ${renderItem('Proxy Contract', token.has_proxy === '1' ? 'Upgradable Proxy ⚠️' : 'Immutable ✓', token.has_proxy === '1' ? 'warning' : 'pass')}
                ${renderItem('Owner Can Alter Balance', token.owner_can_change_balance === '1' ? 'Yes (Dangerous) ⚠️' : 'No ✓', token.owner_can_change_balance === '1' ? 'fail' : 'pass')}
                ${renderItem('Reclaim Ownership', token.can_take_back_ownership === '1' ? 'Yes (Dangerous) ⚠️' : 'No ✓', token.can_take_back_ownership === '1' ? 'fail' : 'pass')}
                ${renderItem('Trading Pausable', token.is_pausable === '1' ? 'Pausable ⚠️' : 'Unstoppable ✓', token.is_pausable === '1' ? 'warning' : 'pass')}
                ${renderItem('Buy Tax', `${details.buyTax}%`, details.buyTax > 10 ? 'fail' : details.buyTax > 0 ? 'warning' : 'pass')}
                ${renderItem('Sell Tax', `${details.sellTax}%`, details.sellTax > 10 ? 'fail' : details.sellTax > 0 ? 'warning' : 'pass')}
                ${renderItem('Top 10 Holders Concentration', `${details.top10Percent.toFixed(1)}%`, details.top10Percent > 80 ? 'fail' : details.top10Percent > 50 ? 'warning' : 'pass')}
                ${renderItem('Anti-Whale Feature', token.is_anti_whale === '1' ? 'Enabled' : 'No', 'normal')}
                ${renderItem('Blacklist Function', token.is_blacklisted === '1' ? 'Blacklist Capable ⚠️' : 'No Blacklist ✓', token.is_blacklisted === '1' ? 'warning' : 'pass')}
            </div>
        </div>
    `;
}

function renderSolanaToken(token, address, container) {
    const isMintable = token.balance_mutable_authority === '1';
    const isFreezable = token.freezable?.status === '1' || token.freeze_authority;
    const isClosable = token.closable === '1';
    
    let score = 100;
    const risks = [];
    if (isMintable) { score -= 30; risks.push('Mint authority still active'); }
    if (isFreezable) { score -= 25; risks.push('Freeze authority enabled (can lock holders)'); }
    if (isClosable) { score -= 15; risks.push('Closable account enabled'); }

    score = Math.max(0, Math.min(100, score));

    let riskBanner = '';
    if (risks.length > 0) {
        riskBanner = `
            <div class="warning-banner" style="background:rgba(239,68,68,0.15);padding:1rem 1.5rem;">
                <span style="font-size:1.5rem;">🚨</span>
                <span style="font-size:0.9375rem;color:#fca5a5;font-weight:600;">Risks: ${risks.join(' • ')}</span>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="security-result" style="background:var(--bg-card);border-radius:16px;border:1px solid rgba(255,255,255,0.1);overflow:hidden;">
            ${riskBanner}
            <div class="score-header" style="text-align:center;padding:2rem 1.5rem;border-bottom:1px solid rgba(255,255,255,0.05);">
                <div class="score-circle" style="width:90px;height:90px;border-radius:50%;margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:800;border:4px solid ${getScoreColor(score)};background:${getScoreBg(score)};color:${getScoreColor(score)};">
                    ${score}
                </div>
                <div class="score-label" style="font-size:1.25rem;font-weight:700;color:${getScoreColor(score)};">${getScoreLabel(score)}</div>
                <div class="score-subtitle" style="font-size:0.875rem;color:var(--text-secondary);margin-top:0.25rem;">Solana SPL Token Security Audit</div>
            </div>

            <div class="token-info-bar" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:1rem;padding:1.5rem;background:rgba(255,255,255,0.02);border-bottom:1px solid rgba(255,255,255,0.05);">
                <div>
                    <div style="font-size:0.75rem;color:var(--text-secondary);">Mint Address</div>
                    <div style="font-size:0.85rem;font-weight:600;font-family:monospace;">${shortenAddr(address)}</div>
                </div>
                <div>
                    <div style="font-size:0.75rem;color:var(--text-secondary);">Holders</div>
                    <div style="font-size:1rem;font-weight:700;">${(token.holder_count || 0).toLocaleString()}</div>
                </div>
            </div>

            <div class="checks-grid" style="padding:1.5rem;display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:0.75rem;">
                ${renderItem('Mint Authority (Inflation Risk)', isMintable ? 'Revoked (Safe) ✓' : 'Active (Mintable) ⚠️', isMintable ? 'pass' : 'fail')}
                ${renderItem('Freeze Authority', isFreezable ? 'Active (Can Freeze) ⚠️' : 'Revoked (Safe) ✓', isFreezable ? 'fail' : 'pass')}
                ${renderItem('Account Closable', isClosable ? 'Yes ⚠️' : 'No ✓', isClosable ? 'warning' : 'pass')}
            </div>
        </div>
    `;
}

function getEvmTokenDetails(token) {
    const buyTax = parseFloat(token.buy_tax || token.buy_tax_percent || 0);
    const sellTax = parseFloat(token.sell_tax || token.sell_tax_percent || 0);
    const decimals = parseInt(token.decimals) || 18;
    const top10Percent = parseFloat(token.top_10_holder_percent || 0);

    const ownerAddr = (token.owner_address || '').toLowerCase();
    const isRenounced = (
        !ownerAddr ||
        ownerAddr === '0x0000000000000000000000000000000000000000' ||
        ownerAddr === '0x000000000000000000000000000000000000dead' ||
        token.can_take_back_ownership === '0' && token.is_open_source === '1' && ownerAddr === ''
    );

    // Real LP locked check:
    const lpHolders = token.lp_holders || [];
    let lockedPct = 0;
    if (Array.isArray(lpHolders) && lpHolders.length > 0) {
        lpHolders.forEach(h => {
            const hAddr = (h.address || '').toLowerCase();
            const isBurn = hAddr === '0x0000000000000000000000000000000000000000' || hAddr === '0x000000000000000000000000000000000000dead';
            const isLock = h.is_locked === 1 || Boolean(h.locked_detail && h.locked_detail.length > 0);
            if (isBurn || isLock) {
                lockedPct += (parseFloat(h.percent) || 0) * 100;
            }
        });
    }

    let lpLockText = '0% Locked (Risk!)';
    let lpLockStatus = 'fail';
    if (lockedPct >= 90) {
        lpLockText = `${lockedPct.toFixed(1)}% Locked/Burned ✓`;
        lpLockStatus = 'pass';
    } else if (lockedPct > 0) {
        lpLockText = `${lockedPct.toFixed(1)}% Partial Lock ⚠️`;
        lpLockStatus = 'warning';
    } else if (!token.lp_holders || token.lp_holders.length === 0) {
        lpLockText = 'No LP Detected / Unverified';
        lpLockStatus = 'warning';
    }

    return {
        buyTax,
        sellTax,
        decimals,
        isRenounced,
        lockedPct,
        lpLockText,
        lpLockStatus,
        top10Percent
    };
}

function calculateEvmSecurityScore(token, details) {
    let score = 100;
    if (token.is_open_source !== '1') score -= 15;
    if (token.is_honeypot === '1') score -= 50;
    if (token.is_mintable === '1') score -= 20;
    if (!details.isRenounced) score -= 10;
    if (details.lpLockStatus === 'fail') score -= 20;
    else if (details.lpLockStatus === 'warning') score -= 10;
    if (token.has_proxy === '1') score -= 10;
    if (token.owner_can_change_balance === '1') score -= 25;
    if (token.can_take_back_ownership === '1') score -= 25;
    if (token.is_pausable === '1') score -= 10;
    if (details.buyTax > 10) score -= 15;
    else if (details.buyTax > 5) score -= 5;
    if (details.sellTax > 10) score -= 15;
    else if (details.sellTax > 5) score -= 5;
    if (details.top10Percent > 80) score -= 15;
    else if (details.top10Percent > 50) score -= 5;

    return Math.max(0, Math.min(100, score));
}

function getEvmRiskFlags(token, details) {
    const risks = [];
    if (token.is_honeypot === '1') risks.push('HONEYPOT DETECTED (Cannot Sell)');
    if (token.owner_can_change_balance === '1') risks.push('Owner can modify user wallet balance');
    if (token.can_take_back_ownership === '1') risks.push('Owner can reclaim control');
    if (token.is_mintable === '1') risks.push('Unlimited minting enabled');
    if (details.sellTax > 25) risks.push(`Excessive sell tax (${details.sellTax}%)`);
    if (details.lpLockStatus === 'fail' && (token.lp_holders?.length || 0) > 0) risks.push('Liquidity is NOT locked (Rug pull risk)');
    return risks;
}

function renderItem(name, value, status) {
    const statusClass = status === 'pass' ? 'pass' : status === 'fail' ? 'fail' : 'warning';
    return `
        <div class="check-card ${statusClass}" style="padding:1rem;border-radius:10px;display:flex;justify-content:space-between;align-items:center;background:${statusClass==='pass'?'rgba(16,185,129,0.08)':statusClass==='fail'?'rgba(239,68,68,0.08)':'rgba(245,158,11,0.08)'};border:1px solid ${statusClass==='pass'?'rgba(16,185,129,0.2)':statusClass==='fail'?'rgba(239,68,68,0.2)':'rgba(245,158,11,0.2)'};">
            <span class="check-name" style="font-size:0.875rem;color:var(--text-secondary);font-weight:500;">${name}</span>
            <span class="check-status" style="font-size:0.875rem;font-weight:700;color:${statusClass==='pass'?'#34d399':statusClass==='fail'?'#f87171':'#fbbf24'};">${value}</span>
        </div>
    `;
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
    return '🚨 Extreme Risk';
}

function getChainName(chainId) {
    const chains = {
        '1': 'Ethereum', '56': 'BSC', '137': 'Polygon',
        '42161': 'Arbitrum', '43114': 'Avalanche', '10': 'Optimism',
        '8453': 'Base', '250': 'Fantom', 'solana': 'Solana'
    };
    return chains[chainId] || chainId;
}

function shortenAddr(addr) {
    if (!addr) return 'None';
    if (addr.length < 12) return addr;
    return addr.substring(0, 6) + '...' + addr.substring(addr.length - 4);
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
