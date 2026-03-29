import urllib.request, json, time, re, ssl, sys

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def fetch(url):
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0',
        'Accept': 'text/html,application/xhtml+xml',
    })
    try:
        with urllib.request.urlopen(req, timeout=12, context=ctx) as r:
            return r.read().decode('utf-8', errors='ignore')
    except Exception as e:
        return f'ERROR:{e}'

def extract_image(html):
    patterns = [
        r'property=["\']og:image["\'][^>]*content=["\']([^"\'>\s]+)["\']',
        r'content=["\']([^"\'>\s]+)["\'][^>]*property=["\']og:image["\']',
        r'name=["\']twitter:image["\'][^>]*content=["\']([^"\'>\s]+)["\']',
        r'content=["\']([^"\'>\s]+)["\'][^>]*name=["\']twitter:image["\']',
    ]
    for p in patterns:
        m = re.search(p, html, re.I)
        if m:
            u = m.group(1)
            if u.startswith('http') and 'logo' not in u.lower() and 'favicon' not in u.lower():
                return u
    # JSON-LD
    m = re.search(r'"image"\s*:\s*"(https?://[^"]+)"', html)
    if m:
        return m.group(1)
    m = re.search(r'"image"\s*:\s*\{[^}]*"url"\s*:\s*"(https?://[^"]+)"', html)
    if m:
        return m.group(1)
    return None

def wiki_photo(title):
    url = f'https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(title)}'
    req = urllib.request.Request(url, headers={'User-Agent': 'ParliamentQuiz/1.0', 'Accept': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            d = json.loads(r.read())
        return d.get('originalimage', {}).get('source') or d.get('thumbnail', {}).get('source')
    except:
        return None

def check_parliament_portrait(url):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}, method='HEAD')
        with urllib.request.urlopen(req, timeout=8) as r:
            ct = r.headers.get('Content-Type', '')
            ln = int(r.headers.get('Content-Length', 0) or 0)
        return url if ('image' in ct and ln > 5000) else None
    except:
        return None

RETRY = {
    'Baroness Gray of Tottenham':           ('wiki',    'Sue_Gray,_Baroness_Gray_of_Tottenham'),
    'Baroness Griffin of Princethorpe':     ('wiki',    'Theresa_Griffin'),
    'Lord Brennan':                         ('wiki',    'Daniel_Brennan,_Baron_Brennan'),
    'Lord Doyle':                           ('wiki',    'Matthew_Doyle,_Baron_Doyle'),
    'Lord Duvall':                          ('wiki',    'Len_Duvall'),
    'Lord Hutton of Furness':               ('wiki',    'John_Hutton,_Baron_Hutton_of_Furness'),
    'Lord Rees of Easton':                  ('wiki',    'Marvin_Rees'),
    'Lord Rose of Monewden':                ('wiki',    'Stuart_Rose'),
    'Lord Stevens of Kirkwhelpington':      ('wiki',    'John_Stevens,_Baron_Stevens_of_Kirkwhelpington'),
    'Baroness Linforth':                    ('portrait','https://members.parliament.uk/member/5428/portrait'),
    'Baroness Martin of Brockley':          ('portrait','https://members.parliament.uk/member/5437/portrait'),
    'Lord Marks of Hale':                   ('portrait','https://members.parliament.uk/member/5018/portrait'),
    'Alison Taylor':                        ('portrait','https://members.parliament.uk/member/5093/portrait'),
    'Baroness Monckton of Dallington Forest': ('scrape','https://teamdomenica.com/team-member/rosa-monckton/'),
    'Baroness Nargund':                     ('scrape',  'https://www.geeta-nargund.com/about-geeta'),
    'Baroness Neate':                       ('scrape',  'https://www.pollyneate.net/about-me'),
    'Baroness Nichols of Selby':            ('scrape',  'https://yorks.unison.org.uk/2025/03/25/regional-convenor-wendy-nichols-recognised-for-contribution-to-trade-unionism-at-tuc-regional-conference/'),
    'Baroness MacLeod of Camusdarach':      ('scrape',  'https://www.charlottestreetpartners.com/people/catherine-mcleod/'),
    'Lord Babudu':                          ('scrape',  'https://lincoln.ox.ac.uk/people/peter-babudu'),
    'Lord Hobby':                           ('scrape',  'https://www.tkat.org/about-us/meet-the-team/item/1/russell-hobby-cbe'),
    'Lord Kestenbaum':                      ('scrape',  'https://www.thejlc.org/lord-kestenbaum-of-foxcote'),
    'Lord Mendelsohn':                      ('scrape',  'https://www.grit.org.uk/lord-mendelsohn'),
    'Lord Pitt-Watson':                     ('scrape',  'https://competentboards.com/faculty/david-pitt-watson/'),
    'Lord Shinkwin':                        ('scrape',  'https://adalive.org/speakers/lord-shinkwin/'),
    'Lord Walker of Broxton':               ('scrape',  'https://about.iceland.co.uk/our-owners/'),
    'The Lord Bishop of Lichfield':         ('scrape',  'https://www.lichfield.anglican.org/bishops-archdeacons/'),
}

with open('src/data/members.json') as f:
    members = json.load(f)
member_map = {m['name']: m for m in members}

fixed = 0
for name, (typ, src) in RETRY.items():
    m = member_map.get(name)
    if not m:
        print(f'  WARNING {name}: not in data')
        continue

    img = None
    if typ == 'wiki':
        time.sleep(2)
        img = wiki_photo(src)
    elif typ == 'portrait':
        img = check_parliament_portrait(src)
    elif typ == 'scrape':
        html = fetch(src)
        if not html.startswith('ERROR'):
            img = extract_image(html)
        else:
            print(f'  fetch error for {name}: {html[:80]}')

    if img:
        m['photoUrl'] = img
        m['photoSource'] = 'manual'
        fixed += 1
        print(f'  OK {name}')
    else:
        print(f'  FAIL {name}')
    time.sleep(0.5)

with open('src/data/members.json', 'w') as f:
    json.dump(members, f, indent=2)
print(f'\nFixed {fixed} more.')
