import urllib.request, re, ssl

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

sites = [
    ('Baroness Nargund',  'https://www.geeta-nargund.com/about-geeta'),
    ('Baroness Neate',    'https://www.pollyneate.net/about-me'),
    ('Lord Pitt-Watson',  'https://competentboards.com/faculty/david-pitt-watson/'),
    ('Lord Mendelsohn',   'https://www.grit.org.uk/lord-mendelsohn'),
    ('Lord Hobby',        'https://www.tkat.org/about-us/meet-the-team/item/1/russell-hobby-cbe'),
    ('Lord Walker',       'https://about.iceland.co.uk/our-owners/'),
    ('Lichfield Bishop',  'https://www.lichfield.anglican.org/bishops-archdeacons/'),
    ('Lord Babudu',       'https://lincoln.ox.ac.uk/people/peter-babudu'),
    ('Baroness Monckton', 'https://teamdomenica.com/team-member/rosa-monckton/'),
    ('Lord Shinkwin',     'https://adalive.org/speakers/lord-shinkwin/'),
    ('Baroness Nichols',  'https://yorks.unison.org.uk/2025/03/25/regional-convenor-wendy-nichols-recognised-for-contribution-to-trade-unionism-at-tuc-regional-conference/'),
]

for name, url in sites:
    html = fetch(url)
    if html.startswith('ERROR'):
        print(name + ': ' + html[:80])
        continue

    # og:image
    og = re.search(r'og:image.*?content=["\']([^"\']+)["\']', html, re.I | re.S)
    if not og:
        og = re.search(r'content=["\']([^"\']+)["\'].*?og:image', html, re.I | re.S)

    # twitter:image
    tw = re.search(r'twitter:image.*?content=["\']([^"\']+)["\']', html, re.I | re.S)

    # JSON-LD image
    jld = re.search(r'"image"\s*:\s*"(https?://[^"]+)"', html)

    # All https img srcs
    all_imgs = re.findall(r'src=["\']((https?://|/)[^"\']+\.(jpg|jpeg|png|webp)[^"\']*)["\']', html, re.I)

    print(name + ':')
    print('  og=' + (og.group(1)[:90] if og else 'none'))
    print('  tw=' + (tw.group(1)[:90] if tw else 'none'))
    print('  jld=' + (jld.group(1)[:90] if jld else 'none'))
    if all_imgs:
        print('  imgs[0]=' + str(all_imgs[0][0])[:90])
    print()
