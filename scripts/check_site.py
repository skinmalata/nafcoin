"""Sanity checks for the generated Nafcoin site."""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ATTR = re.compile(r'(?:href|src)\s*=\s*["\']([^"\']+)["\']', re.IGNORECASE)
SKIP_PREFIX = ("http://", "https://", "mailto:", "tel:", "javascript:", "data:", "#")


def rel_files(ext):
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in (".git",)]
        for name in filenames:
            if name.lower().endswith(ext):
                yield os.path.join(dirpath, name)


def resolve(html_path, link):
    link = link.split("#", 1)[0].split("?", 1)[0]
    if not link:
        return None
    if link.startswith("/"):
        target = os.path.join(ROOT, link.lstrip("/"))
    else:
        target = os.path.join(os.path.dirname(html_path), link)
    target = os.path.normpath(target)
    if os.path.isdir(target):
        target = os.path.join(target, "index.html")
    return target


def main():
    html_files = list(rel_files(".html"))
    broken = []
    checked = 0
    for path in html_files:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            text = f.read()
        for link in ATTR.findall(text):
            if link.lower().startswith(SKIP_PREFIX) or "${" in link:
                continue
            target = resolve(path, link)
            if target is None:
                continue
            checked += 1
            if not os.path.exists(target):
                broken.append((os.path.relpath(path, ROOT), link))

    print("HTML files: %d" % len(html_files))
    print("Internal links checked: %d" % checked)
    print("Broken internal links: %d" % len(broken))
    for rel, link in broken[:40]:
        print("  %s -> %s" % (rel, link))

    old = re.compile(r"coinadvice|coin advice|crypto-assistant|crypt oassistant", re.IGNORECASE)
    leftovers = []
    for ext in (".html", ".js", ".css", ".xml", ".txt", ".webmanifest"):
        for path in rel_files(ext):
            if os.path.basename(path) in ("check_site.py",):
                continue
            with open(path, "r", encoding="utf-8", errors="replace") as f:
                for i, line in enumerate(f, 1):
                    if old.search(line):
                        leftovers.append((os.path.relpath(path, ROOT), i, line.strip()[:140]))
    print("Old-brand/assistant references: %d" % len(leftovers))
    for rel, i, line in leftovers[:40]:
        print("  %s:%d %s" % (rel, i, line))

    missing_og = []
    for path in html_files:
        if os.path.basename(path) == "404.html":
            continue
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            text = f.read()
        if "og:image" not in text:
            missing_og.append(os.path.relpath(path, ROOT))
    print("Pages missing og:image: %d" % len(missing_og))
    for rel in missing_og[:20]:
        print("  %s" % rel)

    canon_bad = []
    for path in html_files:
        if os.path.basename(path) == "404.html":
            continue
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            text = f.read()
        m = re.search(r'rel="canonical"\s+href="([^"]+)"', text)
        if not m or not m.group(1).startswith("https://nafcoin.com"):
            canon_bad.append((os.path.relpath(path, ROOT), m.group(1) if m else "MISSING"))
    print("Canonical issues: %d" % len(canon_bad))
    for rel, val in canon_bad[:20]:
        print("  %s -> %s" % (rel, val))


if __name__ == "__main__":
    main()
