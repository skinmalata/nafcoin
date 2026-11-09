"""Build the Nafcoin site from the coinadvice source.

Reads the coinadvice project, copies the selected assets, rebrands everything
to Nafcoin / nafcoin.com, removes the AI assistant, fixes broken links, adds
SEO meta, and generates robots.txt / CNAME / manifest / RSS.
"""
import os
import re
import html
import shutil
from datetime import datetime, timezone

SRC = r"C:\Users\Toks\Documents\Apps\Deployed\coinadvice"
DST = r"C:\Users\Toks\Documents\Apps\Deployed\nafcoin"
SITE_URL = "https://nafcoin.com"

KEPT_POSTS = [
    "075-binance-futures-vs-bybit-futures",
    "028-what-is-dollar-cost-averaging",
    "002-how-to-buy-bitcoin-first-time",
    "011-what-is-altcoin-season",
    "005-how-to-read-crypto-price-charts",
    "029-how-to-track-crypto-portfolio",
    "120-best-hardware-wallets-under-100",
    "111-how-to-recover-ledger-wallet",
    "077-how-to-verify-kyc-on-coinbase",
    "031-how-to-research-cryptocurrency",
]
KEPT_NUMS = {p[:3] for p in KEPT_POSTS}

ROOT_HTML = ["index.html", "about.html", "contact.html", "privacy.html", "terms.html", "blog.html"]
PAGE_HTML = [
    "airdrops.html", "arbitrage.html", "coin-analysis.html", "converter.html",
    "dex-scanner.html", "global-stats.html", "portfolio.html", "price-tracker.html",
    "profit-calculator.html", "pump-scanner.html", "signal-scoreboard.html",
    "token-checker.html", "trending.html", "whale-wallet.html",
]
JS_FILES = [
    "api.js", "signal-tracker.js", "airdrops.js", "arbitrage.js", "converter.js",
    "dex-scanner.js", "global-stats.js", "portfolio.js", "price-tracker.js",
    "profit-calculator.js", "pump-scanner.js", "signal-scoreboard.js",
    "token-checker.js", "trending.js", "whale-wallet.js", "charts.js",
]

OG_IMAGE = SITE_URL + "/og-image.png"

HERO_BANNER_HTML = """        <section class="hero-section hero-banner">
            <img src="banner.png" alt="Nafcoin - professional crypto analysis platform" class="hero-banner-img" width="2172" height="724" fetchpriority="high">
        </section>"""

HERO_BANNER_CSS = """
/* Homepage hero banner */
.hero-banner {
    padding: 1.5rem 0 2.5rem;
}

.hero-banner-img {
    display: block;
    width: 100%;
    max-width: 1200px;
    height: auto;
    margin: 0 auto;
    border-radius: 20px;
    box-shadow: 0 30px 90px rgba(124, 58, 237, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.08);
    animation: fadeInUp 0.6s ease forwards;
}

@media (max-width: 768px) {
    .hero-banner {
        padding: 1rem 0 1.5rem;
    }

    .hero-banner-img {
        border-radius: 14px;
    }
}
"""


def read(path):
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        return f.read()


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def ensure_dir(path):
    os.makedirs(path, exist_ok=True)


def add_coins_nav(t, prefix):
    pattern = re.compile(
        r'(<a href="' + re.escape(prefix) + r'blog\.html" class="nav-link(?: active)?">Blog</a>)'
    )
    coins = (
        '<a href="' + prefix + 'coins/index.html" class="nav-link">Coins</a>\n            '
    )
    return pattern.sub(lambda m: coins + m.group(1), t, count=1)


def fix_blog_links(t):
    t = t.replace("../../index.html", "../index.html")
    t = t.replace("../../pages/", "../pages/")
    t = t.replace("../../blog/", "../blog/")
    t = t.replace("../../css/", "../css/")
    t = t.replace("../../js/", "../js/")
    t = re.sub(r'href="link-to-post-[^"]*"', 'href="../blog.html"', t)

    def blog_repl(m):
        if m.group(1) in KEPT_NUMS:
            return m.group(0)
        return 'href="../blog.html"'

    t = re.sub(r'href="\.\./blog/(\d{3})-[^"]+\.html"', blog_repl, t)

    def same_dir_repl(m):
        if m.group(1) in KEPT_NUMS:
            return m.group(0)
        return 'href="../blog.html"'

    t = re.sub(r'href="(\d{3})-[^"]+\.html"', same_dir_repl, t)
    return t


def transform(t, prefix="", is_blog=False):
    # Branding + domain
    t = t.replace("CoinAdvice", "Nafcoin")
    t = t.replace("Coin Advice", "Nafcoin")
    t = t.replace("AI-powered trade signals", "data-driven trade signals")
    t = t.replace("AI-Powered Analysis", "Data-Driven Analysis")
    t = t.replace("<h3>AI Analysis</h3>", "<h3>Technical Analysis</h3>")
    t = t.replace("Ethereum and how it differs from Bitcoin", "Bitcoin and how it differs from Ethereum")
    t = t.replace("coinadvice.site", "nafcoin.com")
    t = t.replace("coinadvice.com", "nafcoin.com")
    t = t.replace("t.me/mycoinadvice", "t.me/nafcoin")

    # Logo / favicon (logo.png is the site logo; favicon is a resized logo)
    t = t.replace('src="favicon.png"', 'src="logo.png"')
    t = t.replace('src="../favicon.png"', 'src="../logo.png"')
    t = t.replace('href="favicon.svg"', 'href="favicon-32.png"')
    t = t.replace('href="../favicon.svg"', 'href="../favicon-32.png"')
    t = t.replace('href="favicon.png"', 'href="favicon-32.png"')
    t = t.replace('href="../favicon.png"', 'href="../favicon-32.png"')

    # Remove AI assistant (disabled for now)
    t = re.sub(r'\s*<script src="(?:\.\./)?js/crypto-assistant\.js"></script>', "", t)
    t = re.sub(r'\s*<script>\s*CryptoAssistant\.init\(\);\s*</script>', "", t)

    # Remove Pinterest verification tied to the old brand
    t = re.sub(r'\s*<meta name="p:domain_verify"[^>]*>', "", t)

    # Fix links to the removed charts page
    t = t.replace('href="../pages/charts.html"', 'href="../pages/coin-analysis.html"')
    t = t.replace('href="pages/charts.html"', 'href="pages/coin-analysis.html"')
    t = t.replace('href="charts.html"', 'href="coin-analysis.html"')

    # Fix the broken favicon on root terms.html
    if prefix == "":
        t = t.replace('href="../favicon', 'href="favicon')

    # Sub-directory pages need ../ on the favicon path
    if prefix:
        t = t.replace('href="favicon-32.png"', 'href="%sfavicon-32.png"' % prefix)

    # Use the small nav logo instead of the 520 KB master image
    t = t.replace('src="../logo.png"', 'src="../logo-64.png"')
    t = t.replace('src="logo.png"', 'src="logo-64.png"')
    if prefix:
        t = t.replace('src="logo-64.png"', 'src="%slogo-64.png"' % prefix)

    if is_blog:
        t = fix_blog_links(t)

    # Collapse duplicated favicon links into one clean tag
    t = re.sub(r'[ \t]*<link[^>]*rel="icon"[^>]*>\r?\n?', "", t)

    # Copyright mojibake cleanup
    t = t.replace("Ac 2026 Nafcoin", "\u00a9 2026 Nafcoin")
    t = t.replace("c 2026 Nafcoin", "\u00a9 2026 Nafcoin")
    t = t.replace("\ufffd 2026 Nafcoin", "\u00a9 2026 Nafcoin")

    # Add Coins navigation entry
    t = add_coins_nav(t, prefix)

    # SEO: social images, site name, robots
    inject = ""
    if "og:image" not in t:
        inject += '    <meta property="og:image" content="%s">\n' % OG_IMAGE
    if "twitter:image" not in t:
        inject += '    <meta name="twitter:image" content="%s">\n' % OG_IMAGE
    if "twitter:card" not in t:
        inject += '    <meta name="twitter:card" content="summary_large_image">\n'
    if "og:site_name" not in t:
        inject += '    <meta property="og:site_name" content="Nafcoin">\n'
    if 'name="robots"' not in t:
        inject += '    <meta name="robots" content="index,follow,max-image-preview:large">\n'
    if "fonts.googleapis.com/css2" not in t:
        inject += ('    <link rel="preconnect" href="https://fonts.googleapis.com">\n'
                   '    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
                   '    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&amp;family=Space+Grotesk:wght@500;600;700&amp;display=swap" rel="stylesheet">\n')
    if "js/nav.js" not in t:
        inject += '    <script src="%sjs/nav.js" defer></script>\n' % prefix
    inject += '    <link rel="icon" href="%sfavicon-32.png" type="image/png">\n' % prefix
    if 'rel="manifest"' not in t:
        inject += '    <link rel="manifest" href="/manifest.webmanifest">\n'
    if 'rel="apple-touch-icon"' not in t:
        inject += '    <link rel="apple-touch-icon" href="/apple-touch-icon.png">\n'
    if 'name="theme-color"' not in t:
        inject += '    <meta name="theme-color" content="#7c3aed">\n'
    if 'application/rss+xml' not in t:
        inject += '    <link rel="alternate" type="application/rss+xml" title="Nafcoin Blog" href="/rss.xml">\n'
    if inject:
        t = t.replace("</head>", inject + "</head>", 1)

    return t


def remove_assistant_css(t):
    anchor = "#crypto-assistant {"
    i = t.find(anchor)
    if i == -1:
        return t
    c = t.rfind("/*", 0, i)
    if c != -1 and "Crypto Assistant" in t[c:i]:
        i = c
    j = t.find("Coin Analysis - Enterprise Premium", i)
    if j != -1:
        j = t.rfind("/*", i, j)
        if j != -1:
            return t[:i] + t[j:]
    return t[:i]


def copy_html(src_name, dst_name, prefix, is_blog=False):
    src = os.path.join(SRC, src_name)
    dst = os.path.join(DST, dst_name)
    t = transform(read(src), prefix=prefix, is_blog=is_blog)
    write(dst, t)


def write_404():
    page = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Not Found | Nafcoin</title>
    <meta name="robots" content="noindex,follow">
    <link rel="icon" href="favicon-32.png" type="image/png">
    <link rel="stylesheet" href="css/style.css">
    <script src="js/nav.js" defer></script>
</head>
<body>
    <nav class="navbar">
        <div class="nav-brand"><a href="index.html" style="color: inherit; text-decoration: none;"><img src="logo-64.png" alt="Nafcoin Logo" style="width: 24px; height: 24px; vertical-align: middle; margin-right: 4px;"> Nafcoin</a></div>
        <button class="mobile-menu-btn" onclick="toggleMenu()"><span></span><span></span><span></span></button>
        <div class="nav-links" id="navLinks">
            <a href="index.html" class="nav-link">Home</a>
            <a href="about.html" class="nav-link">About</a>
            <a href="coins/index.html" class="nav-link">Coins</a>
            <a href="blog.html" class="nav-link">Blog</a>
            <a href="contact.html" class="nav-link">Contact</a>
        </div>
    </nav>
    <main class="container" style="text-align: center; padding: 5rem 1rem;">
        <h1 style="font-size: 3rem; margin-bottom: 1rem;">404</h1>
        <p style="color: var(--text-secondary); margin-bottom: 2rem; font-size: 1.125rem;">The page you are looking for does not exist or has moved.</p>
        <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
            <a href="index.html" class="btn btn-primary">Back to Home</a>
            <a href="coins/index.html" class="btn btn-secondary">Browse Coins</a>
            <a href="blog.html" class="btn btn-secondary">Read Guides</a>
        </div>
    </main>
</body>
</html>
"""
    write(os.path.join(DST, "404.html"), page)


def main():
    ensure_dir(DST)
    for d in ["blog", "css", "js", "pages", "scripts", "coins", "data"]:
        ensure_dir(os.path.join(DST, d))

    # Root pages
    for name in ROOT_HTML:
        copy_html(name, name, prefix="")

    # Tool pages
    for name in PAGE_HTML:
        copy_html(os.path.join("pages", name), os.path.join("pages", name), prefix="../")

    # Selected blog posts
    for name in KEPT_POSTS:
        copy_html(os.path.join("blog", name + ".html"), os.path.join("blog", name + ".html"), prefix="../", is_blog=True)
        md_src = os.path.join(SRC, "blog", name + ".md")
        if os.path.exists(md_src):
            shutil.copy2(md_src, os.path.join(DST, "blog", name + ".md"))

    # CSS + JS
    shutil.copy2(os.path.join(SRC, "css", "style.css"), os.path.join(DST, "css", "style.css"))
    for name in JS_FILES:
        shutil.copy2(os.path.join(SRC, "js", name), os.path.join(DST, "js", name))

    # Remove any leftover domain/brand strings in JS/CSS
    for folder in ["js", "css"]:
        for name in os.listdir(os.path.join(DST, folder)):
            p = os.path.join(DST, folder, name)
            if os.path.isfile(p):
                t = read(p)
                t = t.replace("coinadvice.site", "nafcoin.com").replace("coinadvice.com", "nafcoin.com")
                t = t.replace("Coin Advice", "Nafcoin").replace("CoinAdvice", "Nafcoin")
                t = t.replace("t.me/mycoinadvice", "t.me/nafcoin")
                t = t.replace("../favicon.png", "../logo-64.png")
                if name == "style.css":
                    t = re.sub(r"^\s*@import url\('https://fonts\.googleapis\.com[^']*'\);\s*$", "", t, flags=re.MULTILINE)
                    t = remove_assistant_css(t)
                    if "/* Homepage hero banner */" not in t:
                        t += HERO_BANNER_CSS
                write(p, t)

    if os.path.exists(os.path.join(SRC, "ads.txt")):
        shutil.copy2(os.path.join(SRC, "ads.txt"), os.path.join(DST, "ads.txt"))

    # index.html: swap removed blog cards and update copy
    idx_path = os.path.join(DST, "index.html")
    t = read(idx_path)
    t = re.sub(
        r'<section class="hero-section">.*?</section>',
        HERO_BANNER_HTML,
        t,
        count=1,
        flags=re.DOTALL,
    )
    t = t.replace("blog/003-what-is-ethereum-how-it-works.html", "blog/011-what-is-altcoin-season.html")
    t = t.replace("What is Ethereum? Complete Guide", "What is Altcoin Season?")
    t = t.replace("Learn about ETH, smart contracts, and the DeFi ecosystem.", "Learn how altcoin season works and how to spot it.")
    t = t.replace(">DeFi<", ">Trading<")
    t = t.replace("blog/039-how-to-spot-crypto-scams.html", "blog/005-how-to-read-crypto-price-charts.html")
    t = t.replace("How to Spot Crypto Scams", "How to Read Crypto Price Charts")
    t = t.replace("Protect yourself from rug pulls, phishing, and common scams.", "Understand candlesticks, trends, and key trading indicators.")
    t = t.replace(">Security<", ">Trading<")
    t = t.replace("130+ articles", "10 in-depth guides")
    t = t.replace("AI-powered trade signals", "data-driven trade signals")
    t = t.replace("AI-Powered Analysis", "Data-Driven Analysis")
    t = t.replace(
        "Smart trade suggestions based on technical indicators, momentum analysis, and volume trends. Make informed decisions with AI-assisted insights.",
        "Smart trade suggestions based on technical indicators, momentum analysis, and volume trends. Make informed decisions with data-driven insights.",
    )

    coins_section = """
        <!-- Coin Directory -->
        <section style="margin-top: 3rem;">
            <div class="section-header">
                <h2>Cryptocurrency Directory</h2>
                <p>Live prices, analysis, and buying guides for the top cryptocurrencies</p>
            </div>
            <div class="tools-grid">
                <div class="tool-card"><h3>Bitcoin (BTC)</h3><p>Live price, market stats, and a step-by-step buying guide.</p><a href="coins/bitcoin.html" class="btn btn-primary">View Bitcoin</a></div>
                <div class="tool-card"><h3>Ethereum (ETH)</h3><p>Price analysis, use cases, and how to buy ETH safely.</p><a href="coins/ethereum.html" class="btn btn-primary">View Ethereum</a></div>
                <div class="tool-card"><h3>Solana (SOL)</h3><p>Fast L1 overview, live stats, and buying guide.</p><a href="coins/solana.html" class="btn btn-primary">View Solana</a></div>
                <div class="tool-card"><h3>XRP (XRP)</h3><p>Payments-focused asset overview and buying guide.</p><a href="coins/xrp.html" class="btn btn-primary">View XRP</a></div>
            </div>
            <div class="text-center" style="margin-top: 2rem;">
                <a href="coins/index.html" class="btn btn-secondary">Browse All Coins</a>
            </div>
        </section>

"""
    t = t.replace("        <!-- Latest from Blog -->", coins_section + "        <!-- Latest from Blog -->", 1)
    write(idx_path, t)

    # about.html: correct article count
    about_path = os.path.join(DST, "about.html")
    t = read(about_path)
    t = t.replace(">130+<", ">10<")
    t = t.replace(">Blog Articles<", ">In-depth Guides<")
    t = t.replace("130+ articles", "10 in-depth guides")
    write(about_path, t)

    # blog.html: reduce the JS post list to the 10 kept posts
    blog_path = os.path.join(DST, "blog.html")
    t = read(blog_path)
    m = re.search(r"const blogPosts = \[(.*?)\];", t, re.DOTALL)
    if m:
        src_blog = read(os.path.join(SRC, "blog.html"))
        src_m = re.search(r"const blogPosts = \[(.*?)\];", src_blog, re.DOTALL)
        entries = []
        if src_m:
            for e in re.finditer(
                r"\{\s*title:\s*'(.*?)',\s*url:\s*'(.*?)',\s*desc:\s*'(.*?)',\s*cat:\s*'(.*?)'\s*\}",
                src_m.group(1),
                re.DOTALL,
            ):
                title, url, desc, cat = e.groups()
                fname = url.split("/")[-1]
                if any(fname.startswith(p) for p in KEPT_POSTS):
                    entries.append((title, url, desc, cat))
        if not entries:
            entries = [
                ("How to Buy Bitcoin for the First Time", "blog/002-how-to-buy-bitcoin-first-time.html", "Step-by-step guide to buying your first Bitcoin safely.", "beginner"),
            ]
        # Keep the existing order of KEPT_POSTS
        ordered = []
        for p in KEPT_POSTS:
            for e in entries:
                if e[1].split("/")[-1].startswith(p):
                    ordered.append(e)
                    break
        joined = ",\n        ".join(
            "{ title: '%s', url: '%s', desc: '%s', cat: '%s' }" % e for e in ordered
        )
        t = t.replace(m.group(0), "const blogPosts = [" + joined + "];")

    t = t.replace("Best Hardware Wallets Under ', url:", "Best Hardware Wallets Under $100', url:")
    t = t.replace("wallets under  in 2026", "wallets under $100 in 2026")
    write(blog_path, t)

    # robots.txt
    write(os.path.join(DST, "robots.txt"),
          "User-agent: *\nAllow: /\n\nSitemap: %s/sitemap.xml\n" % SITE_URL)

    # CNAME
    write(os.path.join(DST, "CNAME"), "nafcoin.com\n")

    # .nojekyll for GitHub Pages
    write(os.path.join(DST, ".nojekyll"), "")

    # manifest
    manifest = {
        "name": "Nafcoin - Crypto Prices, Tools & Guides",
        "short_name": "Nafcoin",
        "description": "Free cryptocurrency prices, analysis tools, and beginner-friendly guides.",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#0f0f14",
        "theme_color": "#7c3aed",
        "icons": [
            {"src": "/favicon-192.png", "sizes": "192x192", "type": "image/png"},
            {"src": "/logo-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"},
        ],
    }
    import json
    write(os.path.join(DST, "manifest.webmanifest"), json.dumps(manifest, indent=2))

    # RSS for the 10 posts
    items = []
    for name in KEPT_POSTS:
        content = read(os.path.join(DST, "blog", name + ".html"))
        tm = re.search(r"<title>(.*?)</title>", content, re.DOTALL)
        title = tm.group(1).replace(" | Nafcoin", "").replace(" | Coin Advice", "").strip() if tm else name
        title = title.replace("Coin Advice", "Nafcoin").replace("coinadvice", "nafcoin")
        dm = re.search(r'<meta name="description" content="(.*?)">', content, re.DOTALL)
        desc = html.escape(dm.group(1)) if dm else ""
        pm = re.search(r'"datePublished":\s*"(.*?)"', content)
        pub = pm.group(1) if pm else "2026-01-01"
        try:
            rfc = datetime.fromisoformat(pub).strftime("%a, %d %b %Y %H:%M:%S +0000")
        except ValueError:
            rfc = "Thu, 01 Jan 2026 00:00:00 +0000"
        url = "%s/blog/%s.html" % (SITE_URL, name)
        items.append(
            "  <item>\n    <title>%s</title>\n    <link>%s</link>\n    <guid>%s</guid>\n"
            "    <description>%s</description>\n    <pubDate>%s</pubDate>\n  </item>"
            % (html.escape(title), url, url, desc, rfc)
        )
    rss = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Nafcoin Blog</title>
    <link>%s/blog.html</link>
    <description>Crypto guides, exchange reviews, wallet tutorials, and trading strategies.</description>
    <language>en</language>
    <lastBuildDate>%s</lastBuildDate>
    <atom:link href="%s/rss.xml" rel="self" type="application/rss+xml"/>
%s
  </channel>
</rss>
""" % (SITE_URL, datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S +0000"), SITE_URL, "\n".join(items))
    write(os.path.join(DST, "rss.xml"), rss)

    write_404()

    print("Build complete.")
    print("Root pages:", len(ROOT_HTML))
    print("Tool pages:", len(PAGE_HTML))
    print("Blog posts:", len(KEPT_POSTS))


if __name__ == "__main__":
    main()
