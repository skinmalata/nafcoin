"""Generate programmatic SEO coin pages from CoinGecko market data.

Fetches a curated list of major coins, saves a snapshot to data/coins.json,
then writes coins/<slug>.html plus coins/index.html and css/coins.css.
"""
import json
import os
import html
import time
import urllib.request
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://nafcoin.com"
GA_ID = "G-TWS5MC223Y"

CURATED_IDS = [
    "bitcoin", "ethereum", "binancecoin", "ripple", "solana", "tron",
    "dogecoin", "cardano", "chainlink", "avalanche-2", "stellar",
    "bitcoin-cash", "litecoin", "uniswap", "polkadot",
    "polygon-ecosystem-token", "near", "sui", "aptos", "arbitrum",
    "optimism", "cosmos", "filecoin", "internet-computer",
    "hedera-hashgraph", "injective-protocol", "render-token", "pepe",
    "shiba-inu", "the-open-network",
]

SLUGS = {
    "ripple": "xrp",
    "binancecoin": "bnb",
    "avalanche-2": "avalanche",
    "polygon-ecosystem-token": "polygon",
    "the-open-network": "toncoin",
}

COIN_INFO = {
    "bitcoin": "Bitcoin is the first and largest cryptocurrency, launched in 2009 by the pseudonymous Satoshi Nakamoto. It runs on a proof-of-work blockchain with a fixed supply cap of 21 million coins.",
    "ethereum": "Ethereum is a decentralized smart-contract platform that powers much of DeFi, NFTs, and stablecoins. Ether (ETH) is used to pay gas fees and to help secure the network through staking.",
    "binancecoin": "BNB is the native token of the BNB Chain ecosystem. It is used for transaction fees, staking, and accessing services across Binance-linked products.",
    "ripple": "XRP is the native asset of the XRP Ledger, a payments-focused blockchain designed for fast, low-cost cross-border transfers.",
    "solana": "Solana is a high-throughput layer-1 blockchain built for fast, low-fee transactions. SOL pays network fees and can be staked to help secure the network.",
    "tron": "TRON is a layer-1 blockchain focused on content sharing and stablecoin transfers. TRX is used for fees, staking, and network governance.",
    "dogecoin": "Dogecoin started as a meme coin in 2013 and grew into one of the most recognized cryptocurrencies. It uses a proof-of-work blockchain with an inflationary supply schedule.",
    "cardano": "Cardano is a proof-of-stake blockchain built around peer-reviewed research. ADA is used for staking, governance, and transaction fees.",
    "chainlink": "Chainlink is a decentralized oracle network that connects smart contracts to real-world data and payment systems. LINK is used to pay node operators.",
    "avalanche-2": "Avalanche is a smart-contract platform with subnets that let projects run custom chains. AVAX is used for fees, staking, and subnet deployment.",
    "stellar": "Stellar is a payments network built for low-cost cross-border transfers and tokenized assets. XLM is the native asset used for fees and transactions.",
    "bitcoin-cash": "Bitcoin Cash is a proof-of-work cryptocurrency that forked from Bitcoin in 2017 with larger blocks for cheaper transactions. BCH is used for peer-to-peer payments.",
    "litecoin": "Litecoin is an early Bitcoin-derived cryptocurrency with faster block times. LTC is used for low-cost payments and is widely supported by exchanges.",
    "uniswap": "Uniswap is a leading decentralized exchange on Ethereum and other chains. UNI is a governance token used to vote on protocol decisions.",
    "polkadot": "Polkadot is a multi-chain network that connects specialized blockchains through a shared security model. DOT is used for staking, governance, and parachain bonding.",
    "polygon-ecosystem-token": "Polygon is a scaling ecosystem for Ethereum. POL is the upgraded native token used for staking, governance, and network security.",
    "near": "NEAR is a sharded proof-of-stake blockchain focused on usability and low fees. NEAR is used for transactions, storage, and staking.",
    "sui": "Sui is a layer-1 blockchain using an object-based model for fast parallel execution. SUI is used for fees, staking, and governance.",
    "aptos": "Aptos is a layer-1 blockchain built with the Move language for fast, parallel transaction execution. APT is used for fees and staking.",
    "arbitrum": "Arbitrum is an Ethereum layer-2 rollup designed to reduce fees and increase throughput. ARB is a governance token for the Arbitrum ecosystem.",
    "optimism": "Optimism is an Ethereum layer-2 rollup using optimistic scaling. OP is used for governance and ecosystem incentives.",
    "cosmos": "Cosmos is an ecosystem of interconnected blockchains built with the Cosmos SDK and IBC protocol. ATOM is used for staking and governance in the Cosmos Hub.",
    "filecoin": "Filecoin is a decentralized storage network where providers earn FIL for storing data. FIL is used for storage deals, mining, and network fees.",
    "internet-computer": "Internet Computer is a blockchain network that hosts smart contracts and web content directly on-chain. ICP is used for compute, storage, and governance.",
    "hedera-hashgraph": "Hedera is a public distributed ledger built on hashgraph consensus. HBAR is used for network fees, staking, and services.",
    "injective-protocol": "Injective is a layer-1 blockchain focused on finance applications such as spot and derivatives trading. INJ is used for fees, staking, and governance.",
    "render-token": "Render is a decentralized GPU rendering network. RENDER is used to pay for GPU compute and to secure the network.",
    "pepe": "Pepe is a community-driven meme coin on Ethereum. PEPE has no intrinsic cash flow and trades primarily on sentiment and liquidity.",
    "shiba-inu": "Shiba Inu is a meme coin ecosystem on Ethereum that includes tokens and a decentralized exchange. SHIB is highly speculative.",
    "the-open-network": "Toncoin is the native token of The Open Network (TON), a blockchain originally developed by Telegram. TON is used for fees, staking, and ecosystem apps.",
}

RELATED = [
    ("How to Buy Bitcoin for the First Time", "blog/002-how-to-buy-bitcoin-first-time.html"),
    ("How to Track Your Crypto Portfolio", "blog/029-how-to-track-crypto-portfolio.html"),
    ("What is Dollar-Cost Averaging (DCA)?", "blog/028-what-is-dollar-cost-averaging.html"),
    ("How to Research a Cryptocurrency", "blog/031-how-to-research-cryptocurrency.html"),
]


def slug_for(cid):
    return SLUGS.get(cid, cid)


def money(v):
    if v is None:
        return "N/A"
    if v >= 1_000_000_000_000:
        return "$%.2fT" % (v / 1_000_000_000_000)
    if v >= 1_000_000_000:
        return "$%.2fB" % (v / 1_000_000_000)
    if v >= 1_000_000:
        return "$%.2fM" % (v / 1_000_000)
    return "${:,.2f}".format(v)


def price(v):
    if v is None:
        return "N/A"
    if v >= 1:
        return "$%s" % format(v, ",.2f")
    if v >= 0.01:
        return "$%s" % format(v, ",.4f")
    return "$%s" % format(v, ",.8f")


def supply(v, sym):
    if v is None:
        return "No fixed cap"
    if v >= 1_000_000_000:
        return "%sB %s" % (format(v / 1_000_000_000, ",.2f"), sym)
    if v >= 1_000_000:
        return "%sM %s" % (format(v / 1_000_000, ",.2f"), sym)
    return "%s %s" % (format(v, ",.0f"), sym)


def pct(v):
    if v is None:
        return "N/A"
    return ("+%.2f%%" % v) if v >= 0 else ("%.2f%%" % v)


def cls(v):
    if v is None:
        return "flat"
    return "positive" if v >= 0 else "negative"


def fetch_coins():
    ids = ",".join(CURATED_IDS)
    url = (
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids="
        + ids
        + "&sparkline=false&price_change_percentage=24h,7d,30d"
    )
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (compatible; Nafcoin/1.0)",
        "Accept": "application/json",
    })
    last = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=45) as r:
                data = json.load(r)
            if isinstance(data, list) and data:
                return sorted(data, key=lambda c: c.get("market_cap_rank") or 9999)
        except Exception as e:  # noqa: BLE001
            last = e
            print("CoinGecko fetch failed (attempt %d): %s" % (attempt + 1, e))
            time.sleep(2 * (attempt + 1))
    raise SystemExit("Could not fetch CoinGecko data: %s" % last)


def nav(active):
    dropdown = "\n".join(
        '                    <a href="../pages/%s">%s</a>' % (f, label)
        for f, label in [
            ("price-tracker.html", "Price Tracker"),
            ("trending.html", "Trending"),
            ("global-stats.html", "Global Stats"),
            ("dex-scanner.html", "DEX Scanner"),
            ("token-checker.html", "Token Checker"),
            ("arbitrage.html", "Arbitrage Scanner"),
            ("airdrops.html", "Airdrop Finder"),
            ("portfolio.html", "Portfolio"),
            ("profit-calculator.html", "Calculator"),
            ("converter.html", "Converter"),
            ("whale-wallet.html", "Whale Tracker"),
            ("signal-scoreboard.html", "Signal Scoreboard"),
            ("pump-scanner.html", "Pump Scanner"),
            ("coin-analysis.html", "Coin Analysis"),
        ]
    )
    return """    <nav class="navbar">
        <div class="nav-brand"><a href="../index.html" style="color: inherit; text-decoration: none;"><img src="../logo-64.png" alt="Nafcoin Logo" style="width: 24px; height: 24px; vertical-align: middle; margin-right: 4px;"> Nafcoin</a></div>
        <button class="mobile-menu-btn" onclick="toggleMenu()"><span></span><span></span><span></span></button>
        <div class="nav-links" id="navLinks">
            <a href="../index.html" class="nav-link">Home</a>
            <a href="../about.html" class="nav-link">About</a>
            <div class="dropdown">
                <a href="#" class="nav-link">Tools</a>
                <div class="dropdown-content">
%s
                </div>
            </div>
            <a href="index.html" class="nav-link active">Coins</a>
            <a href="../blog.html" class="nav-link">Blog</a>
            <a href="../contact.html" class="nav-link">Contact</a>
        </div>
    </nav>""" % dropdown


HEAD = """<!DOCTYPE html>
<html lang="en">
<head>
    <script async src="https://www.googletagmanager.com/gtag/js?id=%s"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '%s');
    </script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@@TITLE@@</title>
    <meta name="description" content="@@DESC@@">
    <meta name="keywords" content="@@KEYWORDS@@">
    <link rel="canonical" href="@@CANONICAL@@">
    <link rel="icon" href="../favicon-32.png" type="image/png">
    <link rel="apple-touch-icon" href="../apple-touch-icon.png">
    <link rel="manifest" href="/manifest.webmanifest">
    <link rel="alternate" type="application/rss+xml" title="Nafcoin Blog" href="/rss.xml">
    <meta name="theme-color" content="#7c3aed">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&amp;family=Space+Grotesk:wght@500;600;700&amp;display=swap" rel="stylesheet">
    <meta property="og:type" content="website">
    <meta property="og:title" content="@@OGTITLE@@">
    <meta property="og:description" content="@@DESC@@">
    <meta property="og:url" content="@@CANONICAL@@">
    <meta property="og:image" content="%s/og-image.png">
    <meta property="og:site_name" content="Nafcoin">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="@@OGTITLE@@">
    <meta name="twitter:description" content="@@DESC@@">
    <meta name="twitter:image" content="%s/og-image.png">
    <meta name="robots" content="index,follow,max-image-preview:large">
    <link rel="stylesheet" href="../css/style.css">
    <link rel="stylesheet" href="../css/coins.css">
    <script src="../js/nav.js" defer></script>
    <script type="application/ld+json">
@@JSONLD@@
    </script>
</head>""" % (GA_ID, GA_ID, SITE, SITE)


COIN_TEMPLATE = HEAD + """
<body>
@@NAV@@
    <main class="container">
        <nav class="breadcrumb" aria-label="Breadcrumb">
            <a href="../index.html">Home</a> <span>/</span>
            <a href="index.html">Coins</a> <span>/</span>
            <span>@@NAME@@</span>
        </nav>

        <section class="coin-hero">
            <div>
                <h1>@@NAME@@ (@@SYM@@) Price</h1>
                <div class="coin-price-row">
                    <span class="coin-price" data-price>@@PRICE@@</span>
                    <span class="coin-change @@CLS24@@" data-change24>@@PCT24@@ (24h)</span>
                </div>
                <p class="coin-sub">Live @@NAME@@ price in USD with market cap, volume, supply, and a 7-day chart. Market cap rank #@@RANK@@. Data updates automatically.</p>
            </div>
            <div class="coin-hero-actions">
                <a href="../pages/converter.html" class="btn btn-primary">Convert @@SYM@@</a>
                <a href="../pages/price-tracker.html" class="btn btn-secondary">Live Prices</a>
            </div>
        </section>

        <section class="coin-chart-card">
            <div class="coin-chart-head">
                <h2>@@NAME@@ Price Chart (7 days)</h2>
                <span data-updated>Updated @@DATE@@</span>
            </div>
            <div class="spark-wrap"><canvas id="spark"></canvas></div>
        </section>

        <section class="stat-grid">
            <div class="stat-card"><div class="label">Market Cap</div><div class="value" data-mcap>@@MCAP@@</div></div>
            <div class="stat-card"><div class="label">24h Volume</div><div class="value" data-vol>@@VOL@@</div></div>
            <div class="stat-card"><div class="label">24h Change</div><div class="value @@CLS24@@" data-change24>@@PCT24@@</div></div>
            <div class="stat-card"><div class="label">7d Change</div><div class="value @@CLS7@@" data-change7>@@PCT7@@</div></div>
            <div class="stat-card"><div class="label">Circulating Supply</div><div class="value" data-circ>@@CIRC@@</div></div>
            <div class="stat-card"><div class="label">Max Supply</div><div class="value" data-max>@@MAX@@</div></div>
            <div class="stat-card"><div class="label">All-Time High</div><div class="value" data-ath>@@ATH@@</div></div>
            <div class="stat-card"><div class="label">Market Cap Rank</div><div class="value" data-rank>#@@RANK@@</div></div>
        </section>

        <section class="coin-section">
            <h2>What is @@NAME@@?</h2>
            <p>@@ABOUT@@</p>
            <p>@@NAME@@ trades 24/7 on centralized and decentralized exchanges. Its price is driven by supply and demand, market sentiment, liquidity, and broader crypto market conditions. Always check live data before making a transaction.</p>
        </section>

        <section class="coin-section">
            <h2>How to buy @@NAME@@ (@@SYM@@)</h2>
            <ol class="step-list">
                <li><strong>Choose a reputable exchange.</strong> Pick a platform that lists @@SYM@@ and supports your country and payment method.</li>
                <li><strong>Create and verify your account.</strong> Complete identity verification (KYC) and enable two-factor authentication.</li>
                <li><strong>Deposit funds.</strong> Add cash or transfer crypto from another wallet, then check the fees before trading.</li>
                <li><strong>Place your order.</strong> Use a market order for speed or a limit order to control the price you pay.</li>
                <li><strong>Store it safely.</strong> For larger holdings, move @@SYM@@ to a hardware wallet and back up your recovery phrase offline.</li>
            </ol>
            <p><a href="../blog/002-how-to-buy-bitcoin-first-time.html" style="color: var(--accent);">Read the full beginner buying guide &rarr;</a></p>
        </section>

        <section class="coin-section">
            <h2>Track @@SYM@@ with Nafcoin</h2>
            <div class="tools-grid">
                <div class="tool-card"><h3>Price Tracker</h3><p>Follow live prices, market cap, and volume across the top coins.</p><a href="../pages/price-tracker.html" class="btn btn-secondary">Open Tracker</a></div>
                <div class="tool-card"><h3>Portfolio Tracker</h3><p>Add your @@SYM@@ holdings and see your profit and loss.</p><a href="../pages/portfolio.html" class="btn btn-secondary">Track Portfolio</a></div>
                <div class="tool-card"><h3>Crypto Converter</h3><p>Convert @@SYM@@ to USD and other currencies instantly.</p><a href="../pages/converter.html" class="btn btn-secondary">Open Converter</a></div>
                <div class="tool-card"><h3>Coin Analysis</h3><p>Review momentum, trend, and market structure for major coins.</p><a href="../pages/coin-analysis.html" class="btn btn-secondary">Analyze Coins</a></div>
            </div>
        </section>

        <section class="coin-section">
            <h2>@@NAME@@ FAQ</h2>
            <div class="faq">
@@FAQ@@
            </div>
        </section>

        <section class="coin-section">
            <h2>Related crypto guides</h2>
            <ul class="related-links">
@@RELATED@@
            </ul>
        </section>

        <p class="disclaimer">This page is for informational purposes only and is not financial advice. Cryptocurrency prices are volatile and you can lose money. Do your own research and never invest more than you can afford to lose.</p>
    </main>

    <script>
        var COIN_ID = '@@COIN_ID@@';
        var COIN_SYM = '@@SYM@@';

        function fmtPrice(n) {
            if (n === null || n === undefined || isNaN(n)) return 'N/A';
            if (n >= 1) return '$' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            if (n >= 0.01) return '$' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
            return '$' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 8 });
        }
        function fmtBig(n) {
            if (n === null || n === undefined || isNaN(n)) return 'N/A';
            if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
            if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
            if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
            return '$' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
        }
        function setText(sel, txt) { var el = document.querySelector(sel); if (el) el.textContent = txt; }
        function setChange(sel, v) {
            var el = document.querySelector(sel);
            if (!el) return;
            el.textContent = (v >= 0 ? '+' : '') + Number(v).toFixed(2) + '%';
            el.classList.remove('positive', 'negative');
            el.classList.add(v >= 0 ? 'positive' : 'negative');
        }
        function drawSpark(prices) {
            var c = document.getElementById('spark');
            if (!c || !prices || prices.length < 2) return;
            var dpr = window.devicePixelRatio || 1;
            var w = c.clientWidth || 900, h = 220;
            c.width = w * dpr; c.height = h * dpr;
            var ctx = c.getContext('2d');
            ctx.scale(dpr, dpr);
            ctx.clearRect(0, 0, w, h);
            var min = Math.min.apply(null, prices), max = Math.max.apply(null, prices);
            var range = (max - min) || 1, pad = 12;
            var x = function (i) { return pad + (i / (prices.length - 1)) * (w - pad * 2); };
            var y = function (v) { return pad + ((max - v) / range) * (h - pad * 2); };
            var up = prices[prices.length - 1] >= prices[0];
            var col = up ? '#10B981' : '#EF4444';
            var grad = ctx.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0, up ? 'rgba(16,185,129,0.28)' : 'rgba(239,68,68,0.28)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.beginPath();
            ctx.moveTo(x(0), y(prices[0]));
            for (var i = 1; i < prices.length; i++) ctx.lineTo(x(i), y(prices[i]));
            ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
            ctx.lineTo(x(prices.length - 1), h); ctx.lineTo(x(0), h); ctx.closePath();
            ctx.fillStyle = grad; ctx.fill();
        }
        async function refreshCoin() {
            try {
                var res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=' + COIN_ID + '&sparkline=true&price_change_percentage=24h,7d,30d');
                if (!res.ok) return;
                var data = await res.json();
                var c = data && data[0];
                if (!c) return;
                document.querySelectorAll('[data-price]').forEach(function (el) { el.textContent = fmtPrice(c.current_price); });
                setText('[data-mcap]', fmtBig(c.market_cap));
                setText('[data-vol]', fmtBig(c.total_volume));
                setText('[data-ath]', fmtPrice(c.ath));
                setText('[data-circ]', c.circulating_supply ? Number(c.circulating_supply).toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' ' + COIN_SYM : 'N/A');
                setText('[data-max]', c.max_supply ? Number(c.max_supply).toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' ' + COIN_SYM : 'No fixed cap');
                setText('[data-rank]', c.market_cap_rank ? '#' + c.market_cap_rank : 'N/A');
                setChange('[data-change24]', c.price_change_percentage_24h_in_currency || 0);
                setChange('[data-change7]', c.price_change_percentage_7d_in_currency || 0);
                setText('[data-updated]', 'Updated ' + new Date().toLocaleString());
                if (c.sparkline_in_7d && c.sparkline_in_7d.price) drawSpark(c.sparkline_in_7d.price);
            } catch (e) { /* keep static values */ }
        }
        refreshCoin();
        setInterval(refreshCoin, 60000);
    </script>
</body>
</html>
"""

INDEX_TEMPLATE = HEAD + """
<body>
@@NAV@@
    <main class="container">
        <nav class="breadcrumb" aria-label="Breadcrumb">
            <a href="../index.html">Home</a> <span>/</span> <span>Coins</span>
        </nav>
        <div class="hero-section">
            <h1>Cryptocurrency Prices &amp; Buying Guides</h1>
            <p class="hero-subtitle">Live prices, market data, and step-by-step guides for the most popular cryptocurrencies.</p>
        </div>
        <div class="refresh-bar">
            <span data-updated>Updated @@DATE@@</span>
            <button class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.8125rem;" onclick="refreshTable()">Refresh</button>
        </div>
        <div class="coin-table-wrap">
            <table class="coin-table">
                <thead>
                    <tr><th>#</th><th>Coin</th><th>Price</th><th>24h</th><th>7d</th><th>Market Cap</th><th>Volume (24h)</th></tr>
                </thead>
                <tbody id="coin-rows">
@@ROWS@@
                </tbody>
            </table>
        </div>
        <section class="coin-section">
            <h2>How to use this crypto directory</h2>
            <p>Each coin page shows a live price, 7-day chart, market statistics, and a plain-English guide to what the project does and how to buy it. Start with Bitcoin or Ethereum if you are new, then use the price tracker, portfolio tracker, and converter to research further.</p>
            <p>Prices are provided by CoinGecko and update automatically while you keep the page open. Always confirm the latest price on your exchange before placing an order.</p>
        </section>
        <p class="disclaimer">This directory is for informational purposes only and is not financial advice. Cryptocurrency prices are volatile and you can lose money.</p>
    </main>
    <script>
        var IDS = @@IDS_JSON@@;
        function fmtPrice(n) {
            if (n === null || n === undefined || isNaN(n)) return 'N/A';
            if (n >= 1) return '$' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            if (n >= 0.01) return '$' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
            return '$' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 8 });
        }
        function fmtBig(n) {
            if (n === null || n === undefined || isNaN(n)) return 'N/A';
            if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
            if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
            if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
            return '$' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
        }
        function pct(v) { if (v === null || v === undefined || isNaN(v)) return 'N/A'; return (v >= 0 ? '+' : '') + Number(v).toFixed(2) + '%'; }
        async function refreshTable() {
            try {
                var res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=' + IDS.join(',') + '&sparkline=false&price_change_percentage=24h,7d');
                if (!res.ok) return;
                var data = await res.json();
                var byId = {};
                data.forEach(function (c) { byId[c.id] = c; });
                document.querySelectorAll('#coin-rows tr').forEach(function (tr) {
                    var c = byId[tr.getAttribute('data-id')];
                    if (!c) return;
                    tr.querySelector('.cell-price').textContent = fmtPrice(c.current_price);
                    tr.querySelector('.cell-24h').textContent = pct(c.price_change_percentage_24h_in_currency);
                    tr.querySelector('.cell-7d').textContent = pct(c.price_change_percentage_7d_in_currency);
                    tr.querySelector('.cell-mcap').textContent = fmtBig(c.market_cap);
                    tr.querySelector('.cell-vol').textContent = fmtBig(c.total_volume);
                });
                document.querySelector('[data-updated]').textContent = 'Updated ' + new Date().toLocaleString();
            } catch (e) { /* keep static values */ }
        }
        refreshTable();
    </script>
</body>
</html>
"""

COINS_CSS = """.breadcrumb { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; font-size: .875rem; color: var(--text-secondary); margin: 1.5rem 0; }
.breadcrumb a { color: var(--accent); text-decoration: none; }
.breadcrumb a:hover { text-decoration: underline; }
.coin-hero { display: flex; justify-content: space-between; gap: 2rem; align-items: flex-start; flex-wrap: wrap; background: var(--gradient-card); border: 1px solid rgba(124,58,237,.25); border-radius: var(--radius-xl); padding: 2rem; margin-bottom: 1.5rem; }
.coin-hero h1 { margin: .25rem 0 .5rem; font-size: 2rem; }
.coin-price-row { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
.coin-price { font-size: 2.75rem; font-weight: 800; letter-spacing: -.02em; }
.coin-change { font-size: 1rem; font-weight: 700; padding: .35rem .75rem; border-radius: var(--radius-full); }
.positive { color: var(--success); background: rgba(16,185,129,.12); }
.negative { color: var(--danger); background: rgba(239,68,68,.12); }
.flat { color: var(--text-secondary); }
.coin-sub { color: var(--text-secondary); margin-top: .75rem; max-width: 640px; line-height: 1.7; }
.coin-hero-actions { display: flex; gap: .75rem; flex-wrap: wrap; }
.coin-chart-card { background: var(--bg-card); border: 1px solid var(--bg-tertiary); border-radius: var(--radius-lg); padding: 1.25rem 1.5rem; margin-bottom: 1.5rem; }
.coin-chart-head { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
.coin-chart-head h2 { font-size: 1.125rem; margin: 0; }
.coin-chart-head span { font-size: .8125rem; color: var(--text-muted); }
.spark-wrap { width: 100%; height: 220px; }
.spark-wrap canvas { width: 100%; height: 100%; display: block; }
.stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
.stat-card { background: var(--bg-card); border: 1px solid var(--bg-tertiary); border-radius: var(--radius-md); padding: 1rem 1.25rem; }
.stat-card .label { font-size: .75rem; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); margin-bottom: .35rem; }
.stat-card .value { font-size: 1.125rem; font-weight: 700; }
.coin-section { margin: 2.5rem 0; }
.coin-section h2 { font-size: 1.5rem; margin-bottom: 1rem; }
.coin-section p { color: var(--text-secondary); line-height: 1.75; margin-bottom: 1rem; max-width: 820px; }
.step-list { padding-left: 1.25rem; color: var(--text-secondary); line-height: 1.8; }
.step-list li { margin-bottom: .75rem; }
.faq { display: grid; gap: .75rem; max-width: 820px; }
.faq-item { background: var(--bg-card); border: 1px solid var(--bg-tertiary); border-radius: var(--radius-md); padding: 1rem 1.25rem; }
.faq-item summary { cursor: pointer; font-weight: 600; color: var(--text-primary); }
.faq-item p { margin: .75rem 0 0; color: var(--text-secondary); line-height: 1.7; }
.related-links { list-style: none; padding: 0; display: grid; gap: .5rem; max-width: 820px; }
.related-links a { color: var(--accent); text-decoration: none; }
.related-links a:hover { text-decoration: underline; }
.coin-table-wrap { overflow-x: auto; background: var(--bg-card); border: 1px solid var(--bg-tertiary); border-radius: var(--radius-lg); margin: 1.5rem 0; }
.coin-table { width: 100%; border-collapse: collapse; min-width: 760px; font-size: .875rem; }
.coin-table th, .coin-table td { padding: .85rem 1rem; text-align: right; border-bottom: 1px solid var(--bg-tertiary); white-space: nowrap; }
.coin-table th:first-child, .coin-table td:first-child, .coin-table th:nth-child(2), .coin-table td:nth-child(2) { text-align: left; }
.coin-table th { background: var(--bg-secondary); color: var(--text-muted); font-size: .75rem; text-transform: uppercase; letter-spacing: .05em; }
.coin-table tr:last-child td { border-bottom: none; }
.coin-table td a { color: var(--text-primary); text-decoration: none; font-weight: 600; }
.coin-table td a:hover { color: var(--accent); }
.coin-sym { color: var(--text-muted); font-weight: 400; margin-left: .35rem; font-size: .8rem; }
.disclaimer { font-size: .8125rem; color: var(--text-muted); line-height: 1.6; margin: 2rem 0; max-width: 820px; }
@media (max-width: 640px) { .coin-price { font-size: 2rem; } .coin-hero { padding: 1.25rem; } }
"""


def render(template, mapping):
    out = template
    for k, v in mapping.items():
        out = out.replace("@@%s@@" % k, str(v))
    return out


def build_faq(name, sym, about, date_str):
    qa = [
        ("What is %s?" % name, about),
        ("How much is %s worth today?" % name,
         "The live %s (%s) price is shown at the top of this page and refreshes automatically from market data. Prices change constantly, so confirm the latest quote on your exchange before trading." % (name, sym)),
        ("Is %s a good investment?" % name,
         "That depends on your goals and risk tolerance. %s is volatile and can lose value. Research the project, understand the risks, and never invest more than you can afford to lose. This is not financial advice." % name),
        ("How do I buy %s?" % name,
         "Create an account on a reputable exchange that lists %s, complete identity verification, deposit funds, and place a buy order. Use a hardware wallet for long-term storage." % sym),
        ("Where can I store %s?" % name,
         "You can keep %s on an exchange for convenience, but self-custody with a hardware or software wallet is safer for larger holdings. Always back up your recovery phrase offline and never share it." % sym),
    ]
    return qa


def main():
    data = fetch_coins()
    data = [c for c in data if c.get("id") in CURATED_IDS]

    os.makedirs(os.path.join(ROOT, "coins"), exist_ok=True)
    os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)
    os.makedirs(os.path.join(ROOT, "css"), exist_ok=True)

    snapshot = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "CoinGecko",
        "count": len(data),
        "coins": data,
    }
    with open(os.path.join(ROOT, "data", "coins.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(snapshot, f, ensure_ascii=False, indent=2)

    with open(os.path.join(ROOT, "css", "coins.css"), "w", encoding="utf-8", newline="\n") as f:
        f.write(COINS_CSS)

    now = datetime.now(timezone.utc)
    date_str = "%s %d, %d" % (now.strftime("%B"), now.day, now.year)

    slugs = {}
    for c in data:
        slugs[c["id"]] = slug_for(c["id"])
    if len(set(slugs.values())) != len(slugs):
        raise SystemExit("Duplicate coin slugs detected: %s" % slugs)

    for c in data:
        cid = c["id"]
        name = c["name"]
        sym = c["symbol"].upper()
        slug = slugs[cid]
        about = COIN_INFO.get(cid) or (
            "%s (%s) is a cryptocurrency that trades on major exchanges. Its price, market cap, and volume "
            "change continuously based on supply, demand, and market sentiment." % (name, sym)
        )
        p24 = c.get("price_change_percentage_24h_in_currency", c.get("price_change_percentage_24h"))
        p7 = c.get("price_change_percentage_7d_in_currency")
        rank = c.get("market_cap_rank") or 0
        canonical = "%s/coins/%s.html" % (SITE, slug)
        title = "%s (%s) Price Today, Chart & How to Buy | Nafcoin" % (name, sym)
        desc = ("Live %s (%s) price, market cap, volume, and price change. Learn what %s is, "
                "how it works, and how to buy %s safely in 2026." % (name, sym, name, sym))
        keywords = "nafcoin, %s price, %s price, buy %s, %s chart, %s market cap" % (
            name.lower(), sym.lower(), name.lower(), name.lower(), name.lower())

        qa = build_faq(name, sym, about, date_str)
        faq_html = "\n".join(
            '                <details class="faq-item"><summary>%s</summary><p>%s</p></details>'
            % (html.escape(q), html.escape(a)) for q, a in qa
        )
        related_html = "\n".join(
            '                <li><a href="../%s">%s</a></li>' % (u, t) for t, u in RELATED
        )

        jsonld = {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "BreadcrumbList",
                    "itemListElement": [
                        {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"},
                        {"@type": "ListItem", "position": 2, "name": "Coins", "item": SITE + "/coins/index.html"},
                        {"@type": "ListItem", "position": 3, "name": name, "item": canonical},
                    ],
                },
                {
                    "@type": "FAQPage",
                    "mainEntity": [
                        {"@type": "Question", "name": q,
                         "acceptedAnswer": {"@type": "Answer", "text": a}}
                        for q, a in qa
                    ],
                },
            ],
        }

        page = render(COIN_TEMPLATE, {
            "TITLE": html.escape(title),
            "OGTITLE": html.escape("%s (%s) Price Today | Nafcoin" % (name, sym)),
            "DESC": html.escape(desc),
            "KEYWORDS": html.escape(keywords),
            "CANONICAL": canonical,
            "JSONLD": json.dumps(jsonld, ensure_ascii=False, indent=2),
            "NAV": nav("coins"),
            "NAME": html.escape(name),
            "SYM": html.escape(sym),
            "COIN_ID": html.escape(cid),
            "PRICE": price(c.get("current_price")),
            "PCT24": pct(p24),
            "CLS24": cls(p24),
            "PCT7": pct(p7),
            "CLS7": cls(p7),
            "MCAP": money(c.get("market_cap")),
            "VOL": money(c.get("total_volume")),
            "CIRC": supply(c.get("circulating_supply"), sym),
            "MAX": supply(c.get("max_supply"), sym),
            "ATH": price(c.get("ath")),
            "RANK": rank if rank else "N/A",
            "ABOUT": html.escape(about),
            "FAQ": faq_html,
            "RELATED": related_html,
            "DATE": date_str,
        })
        with open(os.path.join(ROOT, "coins", slug + ".html"), "w", encoding="utf-8", newline="\n") as f:
            f.write(page)

    rows = []
    for c in data:
        cid = c["id"]
        name = c["name"]
        sym = c["symbol"].upper()
        slug = slugs[cid]
        p24 = c.get("price_change_percentage_24h_in_currency", c.get("price_change_percentage_24h"))
        p7 = c.get("price_change_percentage_7d_in_currency")
        rows.append(
            '                    <tr data-id="%s"><td>%s</td>'
            '<td><a href="%s.html">%s<span class="coin-sym">%s</span></a></td>'
            '<td class="cell-price">%s</td>'
            '<td class="cell-24h %s">%s</td>'
            '<td class="cell-7d %s">%s</td>'
            '<td class="cell-mcap">%s</td>'
            '<td class="cell-vol">%s</td></tr>'
            % (cid, c.get("market_cap_rank") or "", slug, html.escape(name), html.escape(sym),
               price(c.get("current_price")), cls(p24), pct(p24), cls(p7), pct(p7),
               money(c.get("market_cap")), money(c.get("total_volume")))
        )

    index_title = "Cryptocurrency Prices, Charts & Buying Guides | Nafcoin"
    index_desc = ("Browse live prices, 7-day charts, market data, and buying guides for Bitcoin, Ethereum, "
                  "Solana, XRP, and other major cryptocurrencies.")
    index_jsonld = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"},
                    {"@type": "ListItem", "position": 2, "name": "Coins", "item": SITE + "/coins/index.html"},
                ],
            },
            {
                "@type": "CollectionPage",
                "name": "Cryptocurrency Prices & Buying Guides",
                "url": SITE + "/coins/index.html",
                "description": index_desc,
                "mainEntity": {
                    "@type": "ItemList",
                    "itemListElement": [
                        {"@type": "ListItem", "position": i + 1, "name": c["name"],
                         "url": "%s/coins/%s.html" % (SITE, slugs[c["id"]])}
                        for i, c in enumerate(data[:15])
                    ],
                },
            },
        ],
    }
    index_page = render(INDEX_TEMPLATE, {
        "TITLE": html.escape(index_title),
        "OGTITLE": html.escape(index_title),
        "DESC": html.escape(index_desc),
        "KEYWORDS": "crypto prices, bitcoin price, ethereum price, cryptocurrency list, buy crypto, nafcoin",
        "CANONICAL": SITE + "/coins/index.html",
        "JSONLD": json.dumps(index_jsonld, ensure_ascii=False, indent=2),
        "NAV": nav("coins"),
        "ROWS": "\n".join(rows),
        "IDS_JSON": json.dumps([c["id"] for c in data]),
        "DATE": date_str,
    })
    with open(os.path.join(ROOT, "coins", "index.html"), "w", encoding="utf-8", newline="\n") as f:
        f.write(index_page)

    print("Generated %d coin pages + coins/index.html" % len(data))
    print("Slugs:", ", ".join(sorted(slugs.values())))


if __name__ == "__main__":
    main()
