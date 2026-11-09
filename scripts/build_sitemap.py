"""Rebuild sitemap.xml by scanning the generated HTML files."""
import os
import subprocess
from datetime import datetime
from xml.sax.saxutils import escape

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://nafcoin.com"


def url_for(rel):
    rel = rel.replace(os.sep, "/")
    if rel == "index.html":
        return SITE + "/"
    return SITE + "/" + rel


def last_modified_for(rel, full):
    try:
        out = subprocess.check_output(
            ["git", "log", "-1", "--format=%cs", "--", rel.replace(os.sep, "/")],
            cwd=ROOT,
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
        if out:
            return out
    except Exception:
        pass
    return datetime.fromtimestamp(os.path.getmtime(full)).strftime("%Y-%m-%d")


def priority_for(rel):
    rel = rel.replace(os.sep, "/")
    if rel == "index.html":
        return "1.0", "daily"
    if rel == "coins/index.html":
        return "0.9", "daily"
    if rel.startswith("coins/"):
        return "0.8", "daily"
    if rel == "blog.html":
        return "0.8", "weekly"
    if rel.startswith("blog/"):
        return "0.7", "monthly"
    if rel.startswith("pages/"):
        return "0.6", "weekly"
    if rel in ("about.html", "contact.html"):
        return "0.5", "monthly"
    if rel in ("privacy.html", "terms.html"):
        return "0.3", "yearly"
    return "0.5", "monthly"


def main():
    entries = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in (".git", "scripts", "data", "css", "js")]
        for name in filenames:
            if not name.endswith(".html") or name == "404.html":
                continue
            full = os.path.join(dirpath, name)
            rel = os.path.relpath(full, ROOT)
            lastmod = last_modified_for(rel, full)
            pri, freq = priority_for(rel)
            entries.append((url_for(rel), lastmod, freq, pri))

    entries.sort(key=lambda e: e[0])
    entries.sort(key=lambda e: (e[0] != SITE + "/", e[0]))

    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for url, lastmod, freq, pri in entries:
        lines.append("  <url>")
        lines.append("    <loc>%s</loc>" % escape(url))
        lines.append("    <lastmod>%s</lastmod>" % lastmod)
        lines.append("    <changefreq>%s</changefreq>" % freq)
        lines.append("    <priority>%s</priority>" % pri)
        lines.append("  </url>")
    lines.append("</urlset>")

    with open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines) + "\n")

    print("Sitemap written with %d URLs" % len(entries))


if __name__ == "__main__":
    main()
