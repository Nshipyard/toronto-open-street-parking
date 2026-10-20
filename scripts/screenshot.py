#!/usr/bin/env python3
"""Capture desktop (1440) and mobile (390) screenshots from the live server.

The local dev/prod server is required: Playwright's bundled Chromium can reach
127.0.0.1 loopback in this environment, so the app hydrates with real data.
Usage: PORT=3107 python3 scripts/screenshot.py
"""
import os, sys

BASE = os.path.expanduser("~/workspace/nshipyard-builds/toronto-open-street-parking")
PORT = os.environ.get("PORT", "3107")

def main():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("playwright not installed"); sys.exit(1)
    url = f"http://127.0.0.1:{PORT}/"
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--disable-gpu"])
        for name, width in [("desktop", 1440), ("mobile", 390)]:
            pg = browser.new_page(viewport={"width": width, "height": 900})
            pg.goto(url, wait_until="networkidle", timeout=60000)
            pg.wait_for_timeout(2000)
            out = os.path.join(BASE, "docs/screenshots", f"{name}.png")
            pg.screenshot(path=out, full_page=True)
            print("wrote", out, os.path.getsize(out), "bytes")
            pg.close()
        browser.close()

if __name__ == "__main__":
    main()
