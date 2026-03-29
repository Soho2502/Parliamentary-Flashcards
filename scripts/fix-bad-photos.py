import urllib.request, re, ssl, json, time

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120'})
    try:
        with urllib.request.urlopen(req, timeout=12, context=ctx) as r:
            return r.read().decode('utf-8', errors='ignore')
    except Exception as e:
        return 'ERROR:' + str(e)

# Check the problem pages in detail
print('=== Lord Shinkwin (adalive.org) ===')
html = fetch('https://adalive.org/speakers/lord-shinkwin/')
imgs = re.findall(r'(https://adalive\.org/wp-content/uploads/[^\s"\']+\.(?:jpg|jpeg|png|webp)[^\s"\']*)', html, re.I)
print('All adalive imgs:', imgs[:5])

print('\n=== Lord Mendelsohn (grit.org.uk) ===')
html = fetch('https://www.grit.org.uk/lord-mendelsohn')
# Get all squarespace image URLs - they can be long
imgs = re.findall(r'(https://images\.squarespace-cdn\.com/[^\s"\'<>]+)', html, re.I)
print('Squarespace imgs:', imgs[:3])
# Also check for direct image in page
all_imgs = re.findall(r'src=["\']([^"\']+\.(?:jpg|jpeg|png|webp)[^"\']*)["\']', html, re.I)
print('All imgs:', all_imgs[:5])

print('\n=== Lord Pitt-Watson (competentboards.com) ===')
html = fetch('https://competentboards.com/faculty/david-pitt-watson/')
all_imgs = re.findall(r'src=["\']([^"\']+\.(?:jpg|jpeg|png|webp)[^"\']*)["\']', html, re.I)
# Filter for person-looking URLs
person = [i for i in all_imgs if any(k in i.lower() for k in ['pitt','watson','david','person','faculty','speaker','portrait','photo','profile','headshot','team'])]
print('Person imgs:', person[:5])
print('All imgs:', all_imgs[:5])

print('\n=== Lord Walker of Broxton (Iceland) ===')
html = fetch('https://about.iceland.co.uk/our-owners/')
all_imgs = re.findall(r'src=["\']([^"\']+\.(?:jpg|jpeg|png|webp)[^"\']*)["\']', html, re.I)
walker = [i for i in all_imgs if any(k in i.lower() for k in ['walker','owner','team','person','lord'])]
print('Walker imgs:', walker[:5])
print('All imgs:', all_imgs[:5])

print('\n=== Baroness Nichols full URL ===')
html = fetch('https://yorks.unison.org.uk/2025/03/25/regional-convenor-wendy-nichols-recognised-for-contribution-to-trade-unionism-at-tuc-regional-conference/')
wendy = re.findall(r'(https://[^\s"\']+[Ww]endy[^\s"\']+\.(?:jpg|jpeg|png|webp)[^\s"\']*)', html, re.I)
print('Wendy imgs:', wendy[:3])
uploads = re.findall(r'(https://yorks\.unison\.org\.uk/content/uploads/[^\s"\']+\.(?:jpg|jpeg|png|webp)[^\s"\']*)', html, re.I)
print('Upload imgs:', uploads[:3])
