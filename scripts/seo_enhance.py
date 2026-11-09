"""Idempotent SEO enhancements for the Nafcoin static site.

Adds missing social meta, breadcrumb/tool/blog structured data, homepage and
tool-page headings, crawlable blog links, tool-page FAQ/content sections, and
small performance fixes. Safe to run repeatedly and after generate_coins.py.
"""
import html
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://nafcoin.com"
OG_IMAGE = SITE + "/og-image.png"
LOGO = SITE + "/logo-512.png"


TOOL_SEO = {
    "pages/airdrops.html": {
        "name": "Crypto Airdrop Finder",
        "desc": "Discover tokenless protocols and early-stage crypto projects with airdrop potential, then learn how to claim safely.",
        "paragraphs": [
            "A crypto airdrop is a free distribution of tokens to wallet addresses, usually to reward early users, testers, or community members. Some airdrops are worth hundreds or thousands of dollars, but many are low value, and others are outright scams.",
            "The Nafcoin Airdrop Finder tracks tokenless protocols and early-stage projects that may reward users in the future. Use it to build a shortlist, then verify every project through its official website, documentation, and social channels before you connect a wallet.",
            "Never pay an upfront fee, share your seed phrase, or sign a blind transaction to claim an airdrop. Use a separate wallet with limited funds, review every approval, and treat unsolicited claim links as untrusted.",
        ],
        "faqs": [
            ("Are crypto airdrops free?", "Most airdrops are free to claim, but you may need to pay network gas fees. If a project asks for an upfront payment or your seed phrase, it is almost certainly a scam."),
            ("How do I qualify for an airdrop?", "Eligibility rules vary. Common criteria include using a protocol before a snapshot date, holding a specific token, completing testnet tasks, or joining a community. Always check the project's official documentation."),
            ("Is it safe to connect my wallet?", "Use a separate wallet with minimal funds. Review every transaction request, revoke unnecessary approvals, and never sign a message or transaction you do not understand."),
        ],
        "related": [
            ("Token Security Checker", "token-checker.html"),
            ("DEX Scanner", "dex-scanner.html"),
            ("How to Research a Cryptocurrency", "../blog/031-how-to-research-cryptocurrency.html"),
        ],
    },
    "pages/arbitrage.html": {
        "name": "Crypto Arbitrage Scanner",
        "desc": "Compare crypto prices across exchanges and estimate arbitrage opportunities after fees, liquidity, and transfer costs.",
        "paragraphs": [
            "Crypto arbitrage is the practice of buying an asset on one exchange and selling it on another where the price is higher. The gap can look attractive, but real profit depends on trading fees, withdrawal fees, network costs, liquidity, and how long the transfer takes.",
            "The Nafcoin Arbitrage Scanner highlights price differences across major exchanges so you can investigate opportunities faster. Always confirm that both markets have enough liquidity to fill your order and that withdrawals are enabled for the asset.",
            "Arbitrage is not risk-free. Prices can move before your transfer settles, deposits can be delayed, and exchange restrictions can trap funds. Start with small positions and include every cost in your calculation.",
        ],
        "faqs": [
            ("Is crypto arbitrage profitable?", "It can be, but spreads are often thin and competition is fast. After trading fees, withdrawal fees, network fees, and slippage, many apparent opportunities disappear."),
            ("Which fees should I include?", "Include maker/taker fees on both exchanges, blockchain withdrawal fees, deposit fees, conversion spreads, and any cost of moving funds between venues."),
            ("Is arbitrage legal?", "In most jurisdictions, spot arbitrage is legal, but tax and reporting rules vary. Check the regulations in your country and keep records of every trade."),
        ],
        "related": [
            ("Live Price Tracker", "price-tracker.html"),
            ("DEX Scanner", "dex-scanner.html"),
            ("Crypto Converter", "converter.html"),
        ],
    },
    "pages/coin-analysis.html": {
        "name": "Crypto Coin Analysis & Live Charts",
        "desc": "Analyze crypto price action with live charts, RSI, MACD, momentum, and market structure in one free tool.",
        "paragraphs": [
            "Coin analysis combines price charts, market structure, momentum, and volume to help you understand what traders are doing. Technical indicators such as RSI and MACD can add context, but they do not predict the future on their own.",
            "Use this page to review a coin's trend, recent price action, and key indicators before you research the fundamentals. Combine the chart with market data, project research, and a clear risk plan rather than relying on a single signal.",
            "No indicator is perfect. False breakouts, sudden news, and thin liquidity can invalidate a setup quickly. Always use stop losses, position sizing, and independent research.",
            "A practical workflow is to start with the higher timeframe, mark support and resistance, then use lower timeframes to time entries. Check volume and market context before acting, and write down your invalidation level so a losing trade stays small. Reviewing past setups also helps you learn which signals work for each coin, and which ones fail in choppy markets.",
        ],
        "faqs": [
            ("What indicators does the tool use?", "The analysis view includes price action, trend and momentum readings, RSI, MACD, and volume context. The exact panels update with live market data."),
            ("Can technical analysis predict prices?", "No. Technical analysis describes probabilities and market behavior, not certainties. Use it with fundamental research and risk management."),
            ("How often does the data update?", "Market data refreshes automatically while the page is open. Crypto markets trade 24/7, so confirm the latest price on your exchange before acting."),
        ],
        "related": [
            ("How to Read Crypto Price Charts", "../blog/005-how-to-read-crypto-price-charts.html"),
            ("Live Price Tracker", "price-tracker.html"),
            ("Signal Scoreboard", "signal-scoreboard.html"),
        ],
    },
    "pages/converter.html": {
        "name": "Crypto Converter",
        "desc": "Convert between cryptocurrencies and fiat currencies using live market rates, with support for popular coins.",
        "paragraphs": [
            "A crypto converter helps you estimate what a coin is worth in another currency. The Nafcoin converter uses live market prices so you can compare values quickly without opening an exchange.",
            "The rate shown is a market reference, not a guaranteed execution price. Exchanges add spreads and fees, and large orders can move the price through slippage. Always check the final quote before you trade.",
            "Use the converter alongside the price tracker and portfolio tools to plan purchases, calculate position sizes, and compare values across assets.",
            "When comparing currencies, remember that the displayed rate is a mid-market reference. Your exchange may apply a spread, and card or bank payments can add separate fees. For large conversions, compare the final amount you will receive, not just the quoted price. Also check the network you are using, because the same asset can trade at different prices on different chains.",
        ],
        "faqs": [
            ("Are the conversion rates live?", "Yes. Rates are based on live market data and update while the page is open. They are for reference and may differ from your exchange's quote."),
            ("Does the converter include fees?", "No. The tool shows a market conversion rate. Exchange fees, spreads, and network fees are added by the platform you use to trade."),
            ("Which coins are supported?", "The converter supports the major cryptocurrencies tracked across Nafcoin. If a coin is missing, use the price tracker or check back after the next data update."),
        ],
        "related": [
            ("Live Price Tracker", "price-tracker.html"),
            ("Portfolio Tracker", "portfolio.html"),
            ("Profit Calculator", "profit-calculator.html"),
        ],
    },
    "pages/dex-scanner.html": {
        "name": "DEX Scanner",
        "desc": "Scan decentralized exchange pairs for volume, liquidity, buy/sell pressure, and early market activity.",
        "paragraphs": [
            "A DEX scanner surfaces trading activity on decentralized exchanges, where tokens trade directly from wallets instead of through a centralized order book. Volume, liquidity, and buy/sell ratios can help you spot active pairs and understand market interest.",
            "The Nafcoin DEX Scanner highlights trending pairs and market metrics. Use it as a starting point, not a buy signal. Check the contract, liquidity locks, holder distribution, and project documentation before you trade.",
            "Decentralized markets carry unique risks, including honeypots, rug pulls, low liquidity, and high slippage. Start small, use a dedicated wallet, and verify every token contract independently.",
            "Before trading a new pair, verify the token address through the project's official channels and check whether liquidity is locked. Small pools can be manipulated, and a high volume figure may come from wash trading rather than genuine demand. Use small test trades and never approve unlimited spending to an unknown contract.",
        ],
        "faqs": [
            ("What is a DEX?", "A decentralized exchange is a smart-contract-based marketplace where users trade directly from their wallets. Examples include Uniswap and PancakeSwap."),
            ("How do I spot a risky pair?", "Check liquidity, volume, holder concentration, contract permissions, and whether the token can be sold. A token that only lets you buy is a major red flag."),
            ("Why is liquidity important?", "Low liquidity means small orders can move the price sharply and you may not be able to exit at a fair value. Higher liquidity usually means better execution."),
        ],
        "related": [
            ("Token Security Checker", "token-checker.html"),
            ("Crypto Airdrop Finder", "airdrops.html"),
            ("How to Research a Cryptocurrency", "../blog/031-how-to-research-cryptocurrency.html"),
        ],
    },
    "pages/global-stats.html": {
        "name": "Global Crypto Market Stats",
        "desc": "Track total crypto market cap, Bitcoin dominance, trading volume, and the health of the wider cryptocurrency market.",
        "paragraphs": [
            "Global crypto market stats give you a top-down view of the industry. Total market cap shows the combined value of tracked coins, while Bitcoin dominance shows how much of that value sits in BTC.",
            "Trading volume measures how much is being bought and sold, and stablecoin share can indicate where liquidity is waiting. Together these metrics help you judge whether the market is risk-on, risk-off, or range-bound.",
            "Use global stats with individual coin research and technical analysis. A rising market cap does not mean every coin is a good buy, and a falling market can create opportunities for patient investors.",
            "It also helps to compare market cap with volume and stablecoin supply over several weeks. A healthy rally usually comes with rising participation, while a price move on falling volume can fade quickly. Use these readings as context, not as a standalone buy or sell signal.",
        ],
        "faqs": [
            ("What is crypto market cap?", "Market cap is a coin's price multiplied by its circulating supply. It estimates the market value of a crypto asset but does not measure liquidity or how much money has entered the market."),
            ("What does Bitcoin dominance mean?", "Bitcoin dominance is BTC's share of the total crypto market cap. Rising dominance often suggests capital is moving toward Bitcoin; falling dominance can indicate interest in altcoins."),
            ("Why does 24h volume matter?", "Volume shows how actively a market is trading. Higher volume generally means better liquidity and more reliable price discovery, while low volume can make prices easier to move."),
        ],
        "related": [
            ("Live Price Tracker", "price-tracker.html"),
            ("Trending Coins", "trending.html"),
            ("Crypto Directory", "../coins/index.html"),
        ],
    },
    "pages/portfolio.html": {
        "name": "Crypto Portfolio Tracker",
        "desc": "Track your crypto holdings, cost basis, current value, and profit and loss across multiple assets in one dashboard.",
        "paragraphs": [
            "A crypto portfolio tracker helps you see your total exposure, cost basis, and profit and loss without checking every exchange separately. It is useful for tax planning, rebalancing, and understanding which positions are driving your results.",
            "Add each holding with the amount you own and the price you paid. The dashboard uses live market prices to estimate current value and P&L. Keep your records accurate, especially if you buy at different prices over time.",
            "The tracker runs in your browser and is designed for quick portfolio checks. It is not a tax service or financial advisor. For tax reporting, reconcile your records with exchange statements and on-chain data.",
        ],
        "faqs": [
            ("Does the tracker connect to my wallet?", "No. You enter holdings manually, which keeps the tool simple and avoids requesting wallet access."),
            ("How is profit and loss calculated?", "P&L compares your current holding value with the cost basis you enter. It is an estimate based on live prices and does not include trading fees or taxes unless you account for them manually."),
            ("Is my portfolio data stored?", "The tracker is designed to run in your browser. Do not enter sensitive information such as seed phrases or exchange passwords."),
        ],
        "related": [
            ("How to Track Your Crypto Portfolio", "../blog/029-how-to-track-crypto-portfolio.html"),
            ("Profit Calculator", "profit-calculator.html"),
            ("Crypto Converter", "converter.html"),
        ],
    },
    "pages/price-tracker.html": {
        "name": "Live Crypto Price Tracker",
        "desc": "Follow live cryptocurrency prices, market cap, 24-hour volume, and price changes for the top coins.",
        "paragraphs": [
            "A crypto price tracker gives you a fast view of the market without opening multiple exchange tabs. Prices, market cap, and volume update automatically so you can compare assets and spot unusual moves.",
            "The Nafcoin price tracker covers the major cryptocurrencies and refreshes while the page is open. Use it to monitor the market, check a coin before buying, or confirm a price before using another tool.",
            "Displayed prices are market references. Your exchange may quote a slightly different price because of spreads, fees, and liquidity. Always confirm the final order details before trading.",
            "Create a short watchlist instead of tracking every coin at once. Compare market cap, volume, and recent performance to understand why an asset is moving. If a price looks unusual, check the exchange and project announcements before assuming the data is wrong.",
        ],
        "faqs": [
            ("How often do prices update?", "Prices refresh automatically while the page is open, typically around every 60 seconds. Market data can still lag the latest trade on an exchange."),
            ("Which coins are tracked?", "The tracker covers the top cryptocurrencies by market cap, including Bitcoin, Ethereum, Solana, XRP, and other major assets."),
            ("Are these prices real-time?", "They are live market references from public data sources. They are close to real time but may differ from the exact price on your exchange."),
        ],
        "related": [
            ("Global Market Stats", "global-stats.html"),
            ("Trending Coins", "trending.html"),
            ("Crypto Directory", "../coins/index.html"),
        ],
    },
    "pages/profit-calculator.html": {
        "name": "Crypto Profit Calculator",
        "desc": "Calculate crypto profit, ROI, and break-even price using your entry price, exit price, and investment amount.",
        "paragraphs": [
            "A crypto profit calculator helps you estimate the result of a trade before you place it. Enter your entry price, exit price, and investment amount to see gross profit, percentage return, and break-even levels.",
            "The calculation is only as accurate as the inputs. Include trading fees, withdrawal fees, and taxes when you compare scenarios. A trade that looks profitable before fees can be a loss after costs.",
            "Use the calculator to plan position sizes and set realistic targets. It is an educational tool, not financial advice, and it cannot predict future prices.",
            "Try several scenarios: a conservative exit, a target exit, and a stop-loss exit. This shows how much you could lose if the trade goes wrong, not only how much you could gain. Include trading fees and taxes where possible, and compare the result with your position size. Never risk more than you can afford to lose, and do not rely on a single price target.",
        ],
        "faqs": [
            ("How is crypto profit calculated?", "Profit is the difference between the value at exit and the value at entry, adjusted for the amount invested. ROI expresses that difference as a percentage of the initial investment."),
            ("Does the calculator include fees?", "The basic calculation shows gross profit. For a realistic result, subtract trading fees, withdrawal fees, and any taxes that apply in your jurisdiction."),
            ("Can I calculate multiple coins?", "Yes. Run each position separately to compare scenarios, then use the portfolio tracker to see your combined exposure."),
        ],
        "related": [
            ("Portfolio Tracker", "portfolio.html"),
            ("Crypto Converter", "converter.html"),
            ("What Is Dollar-Cost Averaging?", "../blog/028-what-is-dollar-cost-averaging.html"),
        ],
    },
    "pages/pump-scanner.html": {
        "name": "Crypto Pump Scanner",
        "desc": "Detect unusual volume spikes, price surges, and breakout candidates across the crypto market in real time.",
        "paragraphs": [
            "A pump scanner looks for sudden increases in volume and price that may signal a breakout, news event, or coordinated buying. It can help you notice activity early, but it cannot tell you whether the move is sustainable.",
            "The Nafcoin Pump Scanner highlights coins with unusual short-term activity. Treat every alert as a research prompt. Check the project, liquidity, order book, and recent news before you consider a trade.",
            "Buying into a coin that is already pumping is risky. Late buyers can get trapped when the move reverses. Use stop losses, avoid leverage, and never chase a coin solely because it appears on a scanner.",
        ],
        "faqs": [
            ("What is a crypto pump?", "A pump is a rapid price increase driven by large buying, news, or coordinated activity. Pumps can reverse quickly, especially when liquidity is thin."),
            ("How does the scanner work?", "It compares recent price and volume changes with normal market activity to surface unusual moves. Alerts are signals to research, not buy recommendations."),
            ("Is it safe to buy a pumping coin?", "It is high risk. You may be buying near the top. Wait for confirmation, check liquidity, and use strict risk management if you choose to trade."),
        ],
        "related": [
            ("Trending Coins", "trending.html"),
            ("DEX Scanner", "dex-scanner.html"),
            ("Token Security Checker", "token-checker.html"),
        ],
    },
    "pages/signal-scoreboard.html": {
        "name": "Crypto Signal Scoreboard",
        "desc": "Review trade signal performance, win rates, and historical results to evaluate a strategy objectively.",
        "paragraphs": [
            "A signal scoreboard tracks the outcomes of trade ideas so you can judge performance with data instead of memory. Win rate, average return, drawdown, and sample size all matter when evaluating a strategy.",
            "The Nafcoin Signal Scoreboard shows signal history and performance metrics. Use it to understand how a strategy behaves in different market conditions, and remember that past results do not guarantee future returns.",
            "Signals are educational, not financial advice. A high win rate can still hide large losses, and a small sample can be misleading. Always apply your own risk management.",
            "Track results over a large sample and separate bull, bear, and sideways markets. A strategy that works in one regime may fail in another. Also account for fees, slippage, and missed entries before judging performance, and use the scoreboard to compare ideas rather than follow signals blindly.",
        ],
        "faqs": [
            ("What is a trade signal?", "A trade signal is an alert suggesting a potential entry or exit based on technical or market data. It is not a guarantee of future performance."),
            ("How is win rate calculated?", "Win rate is the percentage of closed signals that reached a profit target before hitting a stop. It should be read alongside average return and drawdown."),
            ("Are signals financial advice?", "No. Signals are educational information. You are responsible for your own research, position sizing, and risk management."),
        ],
        "related": [
            ("Coin Analysis", "coin-analysis.html"),
            ("Pump Scanner", "pump-scanner.html"),
            ("How to Read Crypto Price Charts", "../blog/005-how-to-read-crypto-price-charts.html"),
        ],
    },
    "pages/token-checker.html": {
        "name": "Token Security Checker",
        "desc": "Check token contracts for common risks such as honeypots, high fees, mint permissions, and rug-pull patterns.",
        "paragraphs": [
            "A token security checker scans on-chain contract data for common red flags. It can help you spot honeypots, excessive buy or sell taxes, minting permissions, and other risks before you trade a new token.",
            "The Nafcoin Token Checker is a research aid, not a guarantee. A contract can look safe and still be risky if the team controls liquidity, the project is unaudited, or the market is too thin to exit.",
            "Always verify the contract address from an official source, check liquidity and holder distribution, and use a separate wallet for risky trades. Never share your seed phrase or sign transactions you do not understand.",
            "Save the contract address and re-check it before every trade, because ownership and permissions can change. If a token has high taxes, hidden mint functions, or liquidity that can be removed, treat it as high risk even if the chart looks attractive. Research the team and community as well as the code.",
        ],
        "faqs": [
            ("What does the token checker scan?", "It reviews contract-level signals such as trading restrictions, fees, mint authority, ownership, and other patterns commonly associated with scams."),
            ("Can it guarantee a token is safe?", "No. A clean scan only means the checked risks were not detected. It cannot prove the team is honest or that liquidity will remain."),
            ("What is a honeypot?", "A honeypot is a token that can be bought but not sold, or that applies punitive sell taxes. It is designed to trap buyers."),
        ],
        "related": [
            ("DEX Scanner", "dex-scanner.html"),
            ("Crypto Airdrop Finder", "airdrops.html"),
            ("How to Research a Cryptocurrency", "../blog/031-how-to-research-cryptocurrency.html"),
        ],
    },
    "pages/trending.html": {
        "name": "Trending Cryptocurrencies",
        "desc": "See the top gainers, losers, and most active cryptocurrencies based on live market data and volume.",
        "paragraphs": [
            "Trending coins are the assets attracting the most attention through price movement, volume, or search interest. They can reveal where liquidity and narratives are rotating, but attention alone is not a reason to buy.",
            "The Nafcoin Trending page highlights top gainers, losers, and active coins. Use it to build a watchlist, then research each project's fundamentals, tokenomics, and risks before making a decision.",
            "Trending lists can be dominated by short-term speculation. Avoid chasing green candles, check liquidity, and remember that a coin can be popular and still be a poor investment.",
            "Look beyond the percentage change and ask why a coin is trending. Check the news, volume, liquidity, and holder distribution, then decide whether the move fits your strategy. Compare the current move with the asset's normal volatility and market conditions. If you cannot explain the reason for the move, it is usually better to wait. Never chase a coin only because it appears on a list, and avoid using leverage on unfamiliar tokens.",
        ],
        "faqs": [
            ("How are trending coins selected?", "The page uses market data such as price change, volume, and activity to rank coins. The exact list changes as market conditions shift."),
            ("Should I buy trending coins?", "Not automatically. Trending coins are often volatile. Research the project, understand why it is moving, and use position sizing and stop losses."),
            ("How often does the list update?", "The page refreshes with live market data while it is open. Check the timestamp and confirm prices on your exchange before trading."),
        ],
        "related": [
            ("Live Price Tracker", "price-tracker.html"),
            ("Pump Scanner", "pump-scanner.html"),
            ("Global Market Stats", "global-stats.html"),
        ],
    },
    "pages/whale-wallet.html": {
        "name": "Crypto Whale Wallet Tracker",
        "desc": "Monitor large crypto transactions and whale wallet activity across Bitcoin and Ethereum networks.",
        "paragraphs": [
            "Whales are wallets that hold large amounts of a cryptocurrency. Their transactions can signal accumulation, distribution, exchange inflows, or large over-the-counter deals, and they are closely watched by traders.",
            "The Nafcoin Whale Wallet Tracker highlights large on-chain transfers. A single transaction can be misleading, so look for patterns: repeated inflows to exchanges may precede selling, while large withdrawals can suggest accumulation.",
            "Whale watching is one input, not a trading strategy. On-chain data can be noisy, wallets can belong to exchanges or funds, and past behavior does not guarantee the next move. Combine it with price and fundamental research.",
        ],
        "faqs": [
            ("What is a crypto whale?", "A whale is an individual or entity that holds a large position in a cryptocurrency. There is no fixed threshold, but transfers large enough to move markets are usually tracked."),
            ("Why do whale movements matter?", "Large transfers can signal intent, especially when coins move to or from exchanges. They can also be internal transfers or OTC deals that have no immediate market impact."),
            ("Can I copy whale trades?", "It is risky. You do not know the wallet owner's full position, hedging, or timeline. Use whale data as context, not a copy-trading signal."),
        ],
        "related": [
            ("Global Market Stats", "global-stats.html"),
            ("DEX Scanner", "dex-scanner.html"),
            ("How to Research a Cryptocurrency", "../blog/031-how-to-research-cryptocurrency.html"),
        ],
    },
}


TITLE_FIXES = {
    "How to Buy Bitcoin for the First Time: Step-by-Step Guide (2026)": "How to Buy Bitcoin for the First Time (2026)",
    "How to Read Cryptocurrency Price Charts: Beginner's Guide (2026)": "How to Read Crypto Price Charts (2026)",
    "What is Altcoin Season? How to Spot and Profit from It (2026)": "What Is Altcoin Season? How to Spot It (2026)",
    "What is Dollar-Cost Averaging (DCA)? Strategy Guide (2026)": "What Is Dollar-Cost Averaging (DCA)?",
    "How to Track Your Crypto Portfolio: Tools and Strategies (2026)": "How to Track Your Crypto Portfolio (2026)",
    "Binance Futures vs Bybit Futures: Which is Better in 2026?": "Binance Futures vs Bybit Futures (2026)",
    "How to Recover Ledger Wallet with Seed Phrase: Step-by-Step": "How to Recover a Ledger Wallet",
    "Gram (prev. Toncoin) (GRAM) Price Today, Chart & How to Buy": "GRAM (Toncoin) Price, Chart & How to Buy",
}

PAGE_TITLE_FIXES = {
    "pages/coin-analysis.html": ("Coin Analysis", "Crypto Coin Analysis & Live Charts | Nafcoin"),
    "coins/toncoin.html": ("Gram (prev. Toncoin) (GRAM) Price Today, Chart & How to Buy | Nafcoin", "GRAM (Toncoin) Price, Chart & How to Buy | Nafcoin"),
}

DESC_FIXES = {
    "blog/111-how-to-recover-ledger-wallet.html": "Step-by-step guide to recovering a Ledger wallet with your recovery phrase, plus troubleshooting tips, safety warnings, and how to avoid phishing scams.",
    "blog/120-best-hardware-wallets-under-100.html": "Compare the best hardware wallets under $100 in 2026, including features, security, supported coins, and how to choose a safe wallet.",
    "blog/005-how-to-read-crypto-price-charts.html": "Learn how to read crypto price charts with candlesticks, support and resistance, volume, and key technical indicators. A beginner-friendly guide.",
    "404.html": "The page you requested could not be found. Browse Nafcoin's crypto tools, coin guides, and market analysis.",
}

BLOG_LINKS = [
    ("Binance Futures vs Bybit Futures", "blog/075-binance-futures-vs-bybit-futures.html", "Compare fees, liquidity, and tools on two major futures exchanges."),
    ("What is Dollar-Cost Averaging (DCA)?", "blog/028-what-is-dollar-cost-averaging.html", "Learn how DCA reduces timing risk and builds positions over time."),
    ("How to Buy Bitcoin for the First Time", "blog/002-how-to-buy-bitcoin-first-time.html", "A step-by-step guide to buying and securing your first Bitcoin."),
    ("What is Altcoin Season?", "blog/011-what-is-altcoin-season.html", "Understand the Bitcoin dominance cycle and how altcoin seasons work."),
    ("How to Read Crypto Price Charts", "blog/005-how-to-read-crypto-price-charts.html", "Candlesticks, support and resistance, volume, and key indicators."),
    ("How to Track Your Crypto Portfolio", "blog/029-how-to-track-crypto-portfolio.html", "Track holdings across wallets and exchanges with the right tools."),
    ("Best Hardware Wallets Under $100", "blog/120-best-hardware-wallets-under-100.html", "Compare affordable hardware wallets and their security features."),
    ("How to Recover a Ledger Wallet", "blog/111-how-to-recover-ledger-wallet.html", "Recover access with your seed phrase and avoid common scams."),
    ("How to Verify KYC on Coinbase", "blog/077-how-to-verify-kyc-on-coinbase.html", "Complete identity verification with fewer delays and errors."),
    ("How to Research a Cryptocurrency", "blog/031-how-to-research-cryptocurrency.html", "Evaluate teams, tokenomics, and red flags before investing."),
]

BLOG_RELATED = {
    "blog/002-how-to-buy-bitcoin-first-time.html": [
        ("Bitcoin Price & Guide", "../coins/bitcoin.html"),
        ("Live Price Tracker", "../pages/price-tracker.html"),
        ("Portfolio Tracker", "../pages/portfolio.html"),
        ("Crypto Converter", "../pages/converter.html"),
    ],
    "blog/005-how-to-read-crypto-price-charts.html": [
        ("Coin Analysis & Charts", "../pages/coin-analysis.html"),
        ("Live Price Tracker", "../pages/price-tracker.html"),
        ("Signal Scoreboard", "../pages/signal-scoreboard.html"),
        ("How to Research a Cryptocurrency", "../blog/031-how-to-research-cryptocurrency.html"),
    ],
    "blog/011-what-is-altcoin-season.html": [
        ("Crypto Directory", "../coins/index.html"),
        ("Trending Coins", "../pages/trending.html"),
        ("Global Market Stats", "../pages/global-stats.html"),
        ("Pump Scanner", "../pages/pump-scanner.html"),
    ],
    "blog/028-what-is-dollar-cost-averaging.html": [
        ("Portfolio Tracker", "../pages/portfolio.html"),
        ("Profit Calculator", "../pages/profit-calculator.html"),
        ("Crypto Converter", "../pages/converter.html"),
        ("How to Track Your Crypto Portfolio", "../blog/029-how-to-track-crypto-portfolio.html"),
    ],
    "blog/029-how-to-track-crypto-portfolio.html": [
        ("Portfolio Tracker", "../pages/portfolio.html"),
        ("Live Price Tracker", "../pages/price-tracker.html"),
        ("Profit Calculator", "../pages/profit-calculator.html"),
        ("What Is Dollar-Cost Averaging?", "../blog/028-what-is-dollar-cost-averaging.html"),
    ],
    "blog/031-how-to-research-cryptocurrency.html": [
        ("Token Security Checker", "../pages/token-checker.html"),
        ("DEX Scanner", "../pages/dex-scanner.html"),
        ("Crypto Directory", "../coins/index.html"),
        ("How to Read Crypto Price Charts", "../blog/005-how-to-read-crypto-price-charts.html"),
    ],
    "blog/075-binance-futures-vs-bybit-futures.html": [
        ("Coin Analysis & Charts", "../pages/coin-analysis.html"),
        ("Live Price Tracker", "../pages/price-tracker.html"),
        ("Signal Scoreboard", "../pages/signal-scoreboard.html"),
        ("How to Read Crypto Price Charts", "../blog/005-how-to-read-crypto-price-charts.html"),
    ],
    "blog/077-how-to-verify-kyc-on-coinbase.html": [
        ("Crypto Directory", "../coins/index.html"),
        ("Live Price Tracker", "../pages/price-tracker.html"),
        ("Portfolio Tracker", "../pages/portfolio.html"),
        ("How to Buy Bitcoin for the First Time", "../blog/002-how-to-buy-bitcoin-first-time.html"),
    ],
    "blog/111-how-to-recover-ledger-wallet.html": [
        ("Best Hardware Wallets Under $100", "../blog/120-best-hardware-wallets-under-100.html"),
        ("Portfolio Tracker", "../pages/portfolio.html"),
        ("How to Research a Cryptocurrency", "../blog/031-how-to-research-cryptocurrency.html"),
        ("Bitcoin Price & Guide", "../coins/bitcoin.html"),
    ],
    "blog/120-best-hardware-wallets-under-100.html": [
        ("How to Recover a Ledger Wallet", "../blog/111-how-to-recover-ledger-wallet.html"),
        ("Portfolio Tracker", "../pages/portfolio.html"),
        ("Bitcoin Price & Guide", "../coins/bitcoin.html"),
        ("How to Research a Cryptocurrency", "../blog/031-how-to-research-cryptocurrency.html"),
    ],
}

CSS_BLOCK = """
/* SEO content */
:root {
    --text-reading: #E2E8F0;
}
.home-title {
    font-size: 2.25rem;
    line-height: 1.2;
    margin: 0 0 0.75rem;
    font-family: 'Space Grotesk', sans-serif;
}
.home-intro {
    color: var(--text-reading);
    font-size: 1.125rem;
    line-height: 1.7;
    max-width: 760px;
    margin: 0 0 1.5rem;
}
.page-title {
    font-size: 2rem;
    line-height: 1.2;
    margin: 0 0 0.5rem;
    font-family: 'Space Grotesk', sans-serif;
}
.page-intro {
    color: var(--text-reading);
    font-size: 1.125rem;
    line-height: 1.7;
    max-width: 760px;
    margin: 0 0 1.5rem;
}
.seo-content {
    margin: 3rem 0;
    padding-top: 2rem;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.seo-content h2 {
    font-size: 1.75rem;
    line-height: 1.25;
    margin-bottom: 1rem;
}
.seo-content h3 {
    font-size: 1.25rem;
    margin: 1.75rem 0 0.75rem;
}
.seo-content p,
.seo-content li {
    color: var(--text-reading);
    font-size: 1.125rem;
    line-height: 1.8;
}
.seo-content p {
    margin-bottom: 1rem;
    max-width: 820px;
}
.seo-content ul {
    margin: 0 0 1rem 1.25rem;
}
.seo-content .faq {
    display: grid;
    gap: 0.75rem;
    max-width: 820px;
}
.seo-content .faq-item {
    background: var(--bg-card);
    border: 1px solid var(--bg-tertiary);
    border-radius: var(--radius-md);
    padding: 1rem 1.25rem;
}
.seo-content .faq-item summary {
    cursor: pointer;
    font-weight: 600;
    color: var(--text-primary);
}
.seo-content .faq-item p {
    margin: 0.75rem 0 0;
}
.seo-content .related-links {
    list-style: none;
    padding: 0;
    display: grid;
    gap: 0.5rem;
    max-width: 820px;
}
.seo-content .related-links a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 600;
}
.seo-content .related-links a:hover {
    text-decoration: underline;
}
.guide-list {
    list-style: none;
    padding: 0;
    display: grid;
    gap: 0.75rem;
    max-width: 900px;
}
.guide-list li {
    color: var(--text-reading);
    font-size: 1.125rem;
    line-height: 1.7;
}
.guide-list a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 600;
}
.guide-list a:hover {
    text-decoration: underline;
}
/* Reading comfort */
.blog-content {
    color: var(--text-reading);
    font-size: 1.25rem;
}
.blog-content p,
.blog-content li {
    color: var(--text-reading);
    font-size: 1.25rem;
}
.blog-content em,
.blog-content td,
.blog-content pre code {
    color: var(--text-reading);
}
.blog-content td {
    font-size: 1.125rem;
}
.coin-header-info h2 {
    font-size: 2rem;
    margin: 0;
    background: linear-gradient(135deg, #fff 0%, #cbd5e1 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}
.coin-header-info .symbol {
    color: var(--text-reading);
    font-size: 1rem;
}
.mini-stat .label {
    color: var(--text-reading);
    font-size: 0.8125rem;
}
.stats-sidebar .stat-card h4 {
    color: var(--text-reading);
    font-size: 0.875rem;
}
.stats-sidebar .stat-card .sub-value {
    color: var(--text-reading);
    font-size: 0.9375rem;
}
.analysis-card h3 {
    font-size: 1.25rem;
}
.signal-detail {
    font-size: 1rem;
}
.signal-detail span:first-child {
    color: var(--text-reading);
}
.indicator-name {
    color: var(--text-reading);
    font-size: 1rem;
}
.indicator-value {
    font-size: 1rem;
}
.ai-insight p {
    color: var(--text-reading);
    font-size: 1.125rem;
}
.ai-insight li {
    color: var(--text-reading);
    font-size: 1.0625rem;
}
@media (max-width: 768px) {
    .home-title { font-size: 1.75rem; }
    .page-title { font-size: 1.5rem; }
    .seo-content h2 { font-size: 1.4rem; }
    .coin-header-info h2 { font-size: 1.5rem; }
    .blog-content,
    .blog-content p,
    .blog-content li { font-size: 1.125rem; }
}
"""


def read(path):
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        return f.read()


def write(path, text):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def esc(value):
    return html.escape(value, quote=True)


def set_meta(text, key, value):
    pattern = re.compile(r"<meta\s+[^>]*" + re.escape(key) + r"[^>]*>", re.I)
    tag = '<meta %s content="%s">' % (key, esc(value))

    def repl(match):
        old = match.group(0)
        if re.search(r"content\s*=", old, re.I):
            return re.sub(r'content="[^"]*"', 'content="%s"' % esc(value), old, count=1, flags=re.I)
        return old[:-1].rstrip() + " content=\"%s\">" % esc(value)

    if pattern.search(text):
        return pattern.sub(repl, text, count=1)
    return text.replace("</head>", "    " + tag + "\n</head>", 1)


def get_meta(text, key):
    match = re.search(r"<meta\s+[^>]*" + re.escape(key) + r"[^>]*>", text, re.I)
    if not match:
        return ""
    content = re.search(r'content="([^"]*)"', match.group(0), re.I)
    return html.unescape(content.group(1)) if content else ""


def ensure_social(text, title, desc, url, is_article=False):
    og_title = title or get_meta(text, 'property="og:title"')
    og_desc = desc or get_meta(text, 'property="og:description"')
    twitter_title = og_title
    twitter_desc = og_desc

    text = set_meta(text, 'property="og:title"', og_title)
    text = set_meta(text, 'property="og:description"', og_desc)
    text = set_meta(text, 'property="og:url"', url)
    text = set_meta(text, 'property="og:image"', OG_IMAGE)
    text = set_meta(text, 'property="og:site_name"', "Nafcoin")
    text = set_meta(text, 'property="og:type"', "article" if is_article else "website")
    text = set_meta(text, 'name="twitter:card"', "summary_large_image")
    text = set_meta(text, 'name="twitter:title"', twitter_title)
    text = set_meta(text, 'name="twitter:description"', twitter_desc)
    text = set_meta(text, 'name="twitter:image"', OG_IMAGE)
    return text


def async_fonts(text):
    if 'fonts.googleapis.com/css2' not in text:
        return text
    if re.search(r'rel="preload"\s+as="style"\s+href="https://fonts\.googleapis\.com/css2', text, re.I):
        return text
    pattern = re.compile(
        r'<link\b(?=[^>]*href="(https://fonts\.googleapis\.com/css2[^"]+)")(?=[^>]*rel="stylesheet")[^>]*>',
        re.I,
    )
    match = pattern.search(text)
    if not match:
        return text
    url = match.group(1)
    block = (
        '<link rel="preload" as="style" href="%s">\n'
        '    <link rel="stylesheet" href="%s" media="print" onload="this.media=\'all\'">\n'
        '    <noscript><link rel="stylesheet" href="%s"></noscript>'
    ) % (url, url, url)
    return text[:match.start()] + block + text[match.end():]


def fix_logo_dimensions(text):
    def repl(match):
        tag = match.group(0)
        if not re.search(r'\bwidth\s*=', tag, re.I):
            tag = tag[:-1].rstrip() + ' width="24" height="24">'
        if not re.search(r'\bdecoding\s*=', tag, re.I):
            tag = tag[:-1].rstrip() + ' decoding="async">'
        return tag

    return re.sub(r'<img\b[^>]*src="(?:\.\./)?logo-64\.png"[^>]*>', repl, text, flags=re.I)


def insert_head(text, block):
    return text.replace("</head>", "    " + block + "\n</head>", 1)


def insert_main(text, block):
    match = re.search(r"(?m)^([ \t]*)</main>", text)
    if not match:
        return text
    return text[:match.start()] + block + "\n" + match.group(1) + "</main>" + text[match.end():]


def breadcrumb_block(rel, title):
    if rel == "404.html" or rel == "index.html":
        return ""
    parts = [("Home", SITE + "/")]
    if rel == "blog.html":
        parts.append(("Blog", SITE + "/blog.html"))
    elif rel.startswith("blog/"):
        parts.append(("Blog", SITE + "/blog.html"))
        parts.append((title, SITE + "/" + rel))
    elif rel == "coins/index.html":
        parts.append(("Coins", SITE + "/coins/index.html"))
    elif rel.startswith("coins/"):
        return ""
    elif rel.startswith("pages/"):
        parts.append((title, SITE + "/" + rel))
    else:
        parts.append((title, SITE + "/" + rel))

    items = []
    for i, (name, url) in enumerate(parts, 1):
        items.append({
            "@type": "ListItem",
            "position": i,
            "name": name,
            "item": url,
        })
    data = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": items}
    return '<script type="application/ld+json">\n%s\n    </script>' % json.dumps(data, indent=2, ensure_ascii=False)


def tool_schema_block(data):
    graph = []
    if "WebApplication" not in data["_text"]:
        graph.append({
            "@type": "WebApplication",
            "name": data["name"],
            "url": SITE + "/" + data["_rel"],
            "description": data["desc"],
            "applicationCategory": "FinanceApplication",
            "operatingSystem": "Any",
            "isAccessibleForFree": True,
            "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
            "publisher": {"@type": "Organization", "name": "Nafcoin", "url": SITE},
        })
    if "FAQPage" not in data["_text"]:
        graph.append({
            "@type": "FAQPage",
            "mainEntity": [
                {
                    "@type": "Question",
                    "name": q,
                    "acceptedAnswer": {"@type": "Answer", "text": a},
                }
                for q, a in data["faqs"]
            ],
        })
    if not graph:
        return ""
    payload = {"@context": "https://schema.org", "@graph": graph}
    return '<script type="application/ld+json">\n%s\n    </script>' % json.dumps(payload, indent=2, ensure_ascii=False)


def tool_content(data):
    paras = "".join("            <p>%s</p>\n" % esc(p) for p in data["paragraphs"])
    faqs = "".join(
        '                <details class="faq-item"><summary>%s</summary><p>%s</p></details>\n'
        % (esc(q), esc(a))
        for q, a in data["faqs"]
    )
    related = "".join(
        '                <li><a href="%s">%s</a></li>\n' % (esc(href), esc(label))
        for label, href in data["related"]
    )
    return (
        "        <!-- SEO content -->\n"
        '        <section class="seo-content" aria-labelledby="seo-about">\n'
        '            <h2 id="seo-about">%s</h2>\n'
        "%s"
        "            <h3>Frequently asked questions</h3>\n"
        '            <div class="faq">\n'
        "%s"
        "            </div>\n"
        "            <h3>Related tools</h3>\n"
        '            <ul class="related-links">\n'
        "%s"
        "            </ul>\n"
        "        </section>\n"
    ) % (esc(data["name"]), paras, faqs, related)


def blog_related_block(rel):
    links = BLOG_RELATED.get(rel)
    if not links:
        return ""
    items = "".join(
        '            <li><a href="%s">%s</a></li>\n' % (esc(href), esc(label))
        for label, href in links
    )
    return (
        "    <!-- SEO related -->\n"
        '    <section class="seo-content related-resources">\n'
        "        <h2>Related tools and guides</h2>\n"
        '        <ul class="related-links">\n'
        "%s"
        "        </ul>\n"
        "    </section>\n"
    ) % items


def blog_guides_block():
    items = "".join(
        '            <li><a href="%s">%s</a> &mdash; %s</li>\n'
        % (esc(url), esc(title), esc(desc))
        for title, url, desc in BLOG_LINKS
    )
    return (
        "        <!-- SEO all guides -->\n"
        '        <section class="seo-content" id="all-guides">\n'
        "            <h2>All crypto guides</h2>\n"
        "            <p>Browse every Nafcoin guide in one place. Our articles focus on practical crypto skills: buying and storing Bitcoin, reading charts, managing risk, tracking a portfolio, and spotting scams. Each guide is written for beginners and includes clear steps, common mistakes, and links to free tools.</p>\n"
        "            <p>Start with the topic that matches your experience, then use the related links to go deeper. New guides are added as the market and technology change.</p>\n"
        '            <ul class="guide-list">\n'
        "%s"
        "            </ul>\n"
        "        </section>\n"
    ) % items


def blog_itemlist_block():
    items = [
        {"@type": "ListItem", "position": i, "url": SITE + "/" + url, "name": title}
        for i, (title, url, _desc) in enumerate(BLOG_LINKS, 1)
    ]
    data = {"@context": "https://schema.org", "@type": "ItemList", "itemListElement": items}
    return '<script type="application/ld+json">\n%s\n    </script>' % json.dumps(data, indent=2, ensure_ascii=False)


def contact_block():
    return (
        "        <!-- SEO contact -->\n"
        '        <section class="seo-content" aria-labelledby="seo-contact">\n'
        '            <h2 id="seo-contact">Contacting Nafcoin</h2>\n'
        "            <p>Use this page for support, corrections, partnership questions, or feedback about our crypto tools and guides. Please include the page URL and a clear description of the issue so we can respond faster.</p>\n"
        "            <p>We do not provide financial advice, price predictions, or account recovery services. Never send seed phrases, private keys, exchange passwords, or other sensitive information. If you are reporting a scam or security issue, include public wallet addresses and screenshots only when they do not expose personal data.</p>\n"
        "            <p>For general questions about a tool, check the FAQ and related guide first. Many answers are already covered in our crypto guides, and those pages are updated as the product changes.</p>\n"
        '            <ul class="related-links">\n'
        '                <li><a href="blog.html">Crypto guides</a></li>\n'
        '                <li><a href="coins/index.html">Crypto directory</a></li>\n'
        '                <li><a href="pages/price-tracker.html">Live price tracker</a></li>\n'
        "            </ul>\n"
        "        </section>\n"
    )


def home_schema_block():
    data = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Organization",
                "@id": SITE + "/#organization",
                "name": "Nafcoin",
                "url": SITE + "/",
                "logo": {"@type": "ImageObject", "url": LOGO, "width": 512, "height": 512},
                "sameAs": ["https://t.me/nafcoin"],
            },
            {
                "@type": "WebSite",
                "@id": SITE + "/#website",
                "name": "Nafcoin",
                "url": SITE + "/",
                "publisher": {"@id": SITE + "/#organization"},
                "inLanguage": "en",
            },
        ],
    }
    return '<script type="application/ld+json">\n%s\n    </script>' % json.dumps(data, indent=2, ensure_ascii=False)


def process(path):
    rel = os.path.relpath(path, ROOT).replace("\\", "/")
    text = read(path)
    original = text

    # Targeted title fixes
    for old, new in TITLE_FIXES.items():
        text = text.replace(old, new)
    if rel in PAGE_TITLE_FIXES:
        old_title_tag, new_title = PAGE_TITLE_FIXES[rel]
        text = re.sub(r"<title>.*?</title>", "<title>%s</title>" % esc(new_title), text, count=1, flags=re.S | re.I)

    # Targeted description fixes
    if rel in DESC_FIXES:
        desc = DESC_FIXES[rel]
        text = set_meta(text, 'name="description"', desc)
        if not get_meta(text, 'property="og:description"'):
            text = set_meta(text, 'property="og:description"', desc)
        if not get_meta(text, 'name="twitter:description"'):
            text = set_meta(text, 'name="twitter:description"', desc)

    # Homepage schema URL fix
    if rel == "index.html":
        text = text.replace('"url": "https://nafcoin.com/index.html"', '"url": "https://nafcoin.com/"')

    # Read final title/description for social defaults
    title_match = re.search(r"<title>(.*?)</title>", text, re.S | re.I)
    title = html.unescape(title_match.group(1)).strip() if title_match else ""
    desc = get_meta(text, 'name="description"')
    canonical = ""
    canonical_match = re.search(r'<link\s+rel="canonical"\s+href="([^"]+)"', text, re.I)
    if canonical_match:
        canonical = canonical_match.group(1)
    else:
        canonical = SITE + "/" + rel if rel != "index.html" else SITE + "/"
        text = insert_head(text, '<link rel="canonical" href="%s">' % esc(canonical))

    text = ensure_social(text, title, desc, canonical, is_article=rel.startswith("blog/"))

    # Performance: async font CSS and logo dimensions
    text = async_fonts(text)
    text = fix_logo_dimensions(text)

    # Homepage intro heading
    if rel == "index.html" and "<h1" not in text.lower():
        block = (
            "        <!-- SEO home intro -->\n"
            '        <h1 class="home-title">Crypto Prices, Analysis Tools &amp; Beginner Guides</h1>\n'
            '        <p class="home-intro">Track live prices, research coins, and use free crypto tools built for smarter decisions.</p>\n'
        )
        text = text.replace('<main class="container">', '<main class="container">\n' + block, 1)

    # Coin analysis heading
    if rel == "pages/coin-analysis.html":
        text = text.replace("<h1>${coinData.name}</h1>", "<h2>${coinData.name}</h2>")
    if rel == "pages/coin-analysis.html" and "<!-- SEO page intro -->" not in text:
        block = (
            "        <!-- SEO page intro -->\n"
            '        <h1 class="page-title">Crypto Coin Analysis &amp; Live Charts</h1>\n'
            '        <p class="page-intro">Analyze price action, momentum, RSI, MACD, and market structure for major cryptocurrencies.</p>\n'
        )
        text = text.replace('<main class="container">', '<main class="container">\n' + block, 1)

    # Tool page SEO content + schema
    if rel in TOOL_SEO:
        data = dict(TOOL_SEO[rel])
        data["_rel"] = rel
        data["_text"] = text
        if "<!-- SEO content -->" in text:
            text = re.sub(r'[ \t]*<!-- SEO content -->.*?</section>\n?', tool_content(data), text, count=1, flags=re.S)
        else:
            text = insert_main(text, tool_content(data))
        if "<!-- SEO tool schema -->" not in text:
            schema = tool_schema_block(data)
            if schema:
                text = insert_head(text, "<!-- SEO tool schema -->\n" + schema)

    # Blog related resources
    if rel in BLOG_RELATED and "<!-- SEO related -->" not in text:
        text = insert_main(text, blog_related_block(rel))

    # Blog index crawlable links + collection schema
    if rel == "blog.html":
        text = text.replace("131+ expert guides", "10 in-depth guides")
        if "<!-- SEO all guides -->" in text:
            text = re.sub(r'[ \t]*<!-- SEO all guides -->.*?</section>\n?', blog_guides_block(), text, count=1, flags=re.S)
        else:
            text = insert_main(text, blog_guides_block())
        if '"ItemList"' not in text and "<!-- SEO blog list -->" not in text:
            text = insert_head(text, "<!-- SEO blog list -->\n" + blog_itemlist_block())

    # Contact page supporting content
    if rel == "contact.html" and "<!-- SEO contact -->" not in text:
        text = insert_main(text, contact_block())

    # Breadcrumbs
    if "BreadcrumbList" not in text and rel != "404.html":
        crumb_title = title.split(" | ")[0].split(" - ")[0].strip()
        block = breadcrumb_block(rel, crumb_title)
        if block:
            text = insert_head(text, "<!-- SEO breadcrumb -->\n" + block)

    # Organization + WebSite on homepage
    if rel == "index.html" and "#organization" not in text:
        text = insert_head(text, "<!-- SEO site schema -->\n" + home_schema_block())

    if text != original:
        write(path, text)
        return True
    return False


def update_css():
    css_path = os.path.join(ROOT, "css", "style.css")
    text = read(css_path)
    block = CSS_BLOCK.strip()
    if "/* SEO content */" in text:
        new_text = re.sub(r"/\* SEO content \*/.*\Z", lambda _: block, text, flags=re.S)
    else:
        new_text = text.rstrip() + "\n" + block
    if new_text != text:
        write(css_path, new_text + "\n")


def main():
    changed = 0
    for dirpath, _, filenames in os.walk(ROOT):
        for name in filenames:
            if name.endswith(".html"):
                if process(os.path.join(dirpath, name)):
                    changed += 1
    update_css()
    print("SEO enhancements applied to %d HTML files" % changed)


if __name__ == "__main__":
    main()
