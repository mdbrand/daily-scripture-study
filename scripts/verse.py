#!/usr/bin/env python3
"""Exact verse text. Usage: verse.py VERSION "Ref; Ref" ...
VERSION: BSB (local public-domain file) or NIV/ESV/CSB/NLT (BibleGateway, read-only lookup).
Prints: <ref>\t<VERSION>\t<text> per requested reference (ranges joined with a space)."""
import sys, re, html, urllib.request, urllib.parse, os
BSB = os.environ.get('BSB_TXT') or os.path.join(os.path.dirname(__file__), '..', 'bibles', 'bsb.txt')  # download from https://bereanbible.com/bsb.txt
def bsb(ref):
    m = re.match(r'^(.+?) (\d+):(\d+)(?:-(\d+))?$', ref.strip())
    book, ch, a, b = m.group(1), m.group(2), int(m.group(3)), int(m.group(4) or m.group(3))
    lines = {}
    with open(BSB, encoding='utf-8-sig') as f:
        for ln in f:
            k, _, t = ln.rstrip('\n').partition('\t')
            lines[k] = t
    out = []
    for v in range(a, b + 1):
        t = lines.get(f'{book} {ch}:{v}')
        if t is None: return f'!! NOT FOUND {book} {ch}:{v}'
        out.append(t.strip())
    return ' '.join(out)
def bg(ref, ver):
    url = 'https://www.biblegateway.com/passage/?' + urllib.parse.urlencode({'search': ref, 'version': ver})
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    h = urllib.request.urlopen(req, timeout=30).read().decode('utf-8')
    i = h.find('<div class="passage-text">')
    if i < 0: return '!! NO PASSAGE'
    body = h[i:]
    for stop in ('<div class="footnotes', '<div class="crossrefs', '<div class="passage-other-trans', '<a class="full-chap-link'):
        j = body.find(stop)
        if j > 0: body = body[:j]
    body = re.sub(r'<sup[^>]*class="versenum"[^>]*>.*?</sup>', ' ', body, flags=re.S)
    body = re.sub(r'<sup[^>]*>.*?</sup>', '', body, flags=re.S)
    body = re.sub(r'<span class="chapternum">.*?</span>', '', body, flags=re.S)
    body = re.sub(r'<h[1-6][^>]*>.*?</h[1-6]>', '', body, flags=re.S)
    body = re.sub(r'<span[^>]*small-caps[^>]*>(.*?)</span>', lambda m: m.group(1).upper(), body, flags=re.S)
    body = re.sub(r'<br\s*/?>', ' ', body)
    body = re.sub(r'</?p[^>]*>', ' ', body)
    txt = re.sub(r'<[^>]+>', '', body)
    txt = re.sub(r'[\s\u00a0]+', ' ', html.unescape(txt)).strip()
    return txt
ver = sys.argv[1].upper()
for arg in sys.argv[2:]:
    for ref in [r.strip() for r in arg.split(';') if r.strip()]:
        try: t = bsb(ref) if ver == 'BSB' else bg(ref, ver)
        except Exception as e: t = f'!! ERROR {e}'
        print(f'{ref}\t{ver}\t{t}')
