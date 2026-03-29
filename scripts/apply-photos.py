import urllib.request, re, ssl, json, time

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'})
    try:
        with urllib.request.urlopen(req, timeout=12, context=ctx) as r:
            return r.read().decode('utf-8', errors='ignore')
    except Exception as e:
        return 'ERROR:' + str(e)

def wiki_photo(title):
    url = 'https://en.wikipedia.org/api/rest_v1/page/summary/' + urllib.parse.quote(title)
    req = urllib.request.Request(url, headers={'User-Agent': 'ParliamentQuiz/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            d = json.loads(r.read())
        return d.get('originalimage', {}).get('source') or d.get('thumbnail', {}).get('source')
    except Exception as e:
        return None

def find_wix_images(html):
    # Find all Wix static images, not icons/logos
    imgs = re.findall(r'(https://static\.wixstatic\.com/media/[a-z0-9_~]+\.(?:jpg|jpeg|png|webp))', html, re.I)
    return [i for i in imgs if 'logo' not in i.lower() and 'icon' not in i.lower()]

def find_all_imgs(html, base=''):
    srcs = re.findall(r'src=["\']([^"\']+\.(?:jpg|jpeg|png|webp)[^"\']*)["\']', html, re.I)
    result = []
    for s in srcs:
        if s.startswith('http'):
            result.append(s)
        elif s.startswith('/') and base:
            result.append(base.rstrip('/') + s)
    return result

# Direct known URLs
DIRECT = {
    'Baroness Monckton of Dallington Forest': 'https://teamdomenica.com/wp-content/uploads/2023/09/rosa-monckton.jpg',
    'Lord Babudu':                            'https://lincoln.ox.ac.uk/asset/peter-babudu-1440x1624.jpg',
    'The Lord Bishop of Lichfield':           'https://www.lichfield.anglican.org/content/pages/uploaded_images/Michael.jpg',
    'Lord Hobby':                             'https://tkat-trust.reactfiles.co.uk/uploads/tkatpage/80_7_s.jpg',
}

# Sites needing smarter scraping
SCRAPE_TARGETS = {
    'Baroness Nargund':   ('wix',       'https://www.geeta-nargund.com/about-geeta'),
    'Baroness Neate':     ('wix',       'https://www.pollyneate.net/about-me'),
    'Lord Shinkwin':      ('wp',        'https://adalive.org/speakers/lord-shinkwin/'),
    'Lord Mendelsohn':    ('squarespace','https://www.grit.org.uk/lord-mendelsohn'),
    'Lord Pitt-Watson':   ('scrape',    'https://competentboards.com/faculty/david-pitt-watson/'),
    'Lord Walker of Broxton': ('scrape','https://about.iceland.co.uk/our-owners/'),
    'Baroness Nichols of Selby': ('scrape', 'https://yorks.unison.org.uk/2025/03/25/regional-convenor-wendy-nichols-recognised-for-contribution-to-trade-unionism-at-tuc-regional-conference/'),
}

# Wikipedia retries (with longer delay)
WIKI_RETRIES = {
    'Baroness Gray of Tottenham':       'Sue_Gray,_Baroness_Gray_of_Tottenham',
    'Baroness Griffin of Princethorpe': 'Theresa_Griffin',
    'Lord Brennan':                     'Daniel_Brennan,_Baron_Brennan',
    'Lord Doyle':                       'Matthew_Doyle,_Baron_Doyle',
    'Lord Duvall':                      'Len_Duvall',
    'Lord Hutton of Furness':           'John_Hutton,_Baron_Hutton_of_Furness',
    'Lord Rees of Easton':              'Marvin_Rees',
    'Lord Rose of Monewden':            'Stuart_Rose',
    'Lord Stevens of Kirkwhelpington':  'John_Stevens,_Baron_Stevens_of_Kirkwhelpington',
}

with open('src/data/members.json') as f:
    members = json.load(f)
mm = {m['name']: m for m in members}

def apply(name, url, source):
    m = mm.get(name)
    if not m: print('  NOT FOUND: ' + name); return False
    m['photoUrl'] = url
    m['photoSource'] = source
    print('  OK ' + name + ' -> ' + url[:70])
    return True

fixed = 0

# Apply direct known URLs
print('=== Direct URLs ===')
for name, url in DIRECT.items():
    if apply(name, url, 'manual'): fixed += 1

# Scrape targets
print('\n=== Scraping ===')
for name, (typ, url) in SCRAPE_TARGETS.items():
    html = fetch(url)
    if html.startswith('ERROR'):
        print('  FAIL ' + name + ': ' + html[:60])
        continue
    img = None
    if typ == 'wix':
        imgs = find_wix_images(html)
        img = imgs[0] if imgs else None
    elif typ == 'wp':
        # WordPress: find upload images
        imgs = re.findall(r'(https://[^"\']+/wp-content/uploads/[^"\']+\.(?:jpg|jpeg|png|webp))', html, re.I)
        img = imgs[0] if imgs else None
    elif typ == 'squarespace':
        imgs = re.findall(r'(https://[^"\']*squarespace[^"\']+\.(?:jpg|jpeg|png|webp)[^"\']*)', html, re.I)
        img = imgs[0] if imgs else None
        if img and len(img) > 120: img = img[:img.rfind('/')+1].rstrip('/')
    elif typ == 'scrape':
        all_imgs = find_all_imgs(html, url)
        # Filter out logos, icons, banners
        person_imgs = [i for i in all_imgs if not any(k in i.lower() for k in ['logo','icon','banner','bg','background','flag','button','nav','menu','sprite','placeholder'])]
        img = person_imgs[0] if person_imgs else None

    if img and apply(name, img, 'scraped'):
        fixed += 1
    elif not img:
        print('  FAIL ' + name + ' (no img found)')

# Wikipedia retries with long delay
print('\n=== Wikipedia retries (slow) ===')
for name, title in WIKI_RETRIES.items():
    time.sleep(4)
    img = wiki_photo(title)
    if img and apply(name, img, 'wikipedia-direct'):
        fixed += 1
    else:
        print('  FAIL ' + name + (' (no img on page)' if img is None else ' (rate limited)'))

with open('src/data/members.json', 'w') as f:
    json.dump(members, f, indent=2)

print(f'\nTotal fixed this run: {fixed}')
