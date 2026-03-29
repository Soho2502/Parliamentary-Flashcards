/**
 * Applies manually researched photo URLs for members still missing photos.
 * Uses Parliament API, GOV.UK API, Wikipedia API, and og:image scraping.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

interface Member {
  id: number;
  name: string;
  photoUrl: string;
  photoSource?: string;
  [key: string]: unknown;
}

// Manually researched sources per member
const SOURCES: Record<string, { url: string; type: 'parliament' | 'govuk' | 'wikipedia' | 'scrape' | 'wikimedia' }> = {
  'Alison Taylor':                       { url: 'https://members.parliament.uk/member/5093/portrait',                                    type: 'parliament' },
  'Mr Cathal Mallaghan':                 { url: 'https://sinnfein.ie/representatives/cathal-mallaghan-mp/',                               type: 'scrape' },
  'Baroness Antrobus':                   { url: 'https://www.kcl.ac.uk/people/sophy-antrobus',                                            type: 'scrape' },
  'Baroness Campbell of Loughborough':   { url: 'https://champions-speakers.co.uk/speaker-agent/sue-campbell',                            type: 'scrape' },
  'Baroness Clark of Kilwinning':        { url: 'https://www.parliament.scot/msps/current-and-previous-msps/katy-clark',                  type: 'scrape' },
  'Baroness Dacres of Lewisham':         { url: 'https://brendadacres.org.uk/',                                                           type: 'scrape' },
  'Baroness Davies of Devonport':        { url: 'https://en.wikipedia.org/wiki/Sharron_Davies',                                           type: 'wikipedia' },
  'Baroness Gray of Tottenham':          { url: 'https://en.wikipedia.org/wiki/Sue_Gray,_Baroness_Gray_of_Tottenham',                     type: 'wikipedia' },
  'Baroness Griffin of Princethorpe':    { url: 'https://en.wikipedia.org/wiki/Theresa_Griffin',                                          type: 'wikipedia' },
  'Baroness Gustafsson':                 { url: 'https://www.gov.uk/government/people/poppy-gustafsson',                                  type: 'govuk' },
  'Baroness Hyde of Bemerton':           { url: 'https://www.lwn.org.uk/sara_hyde',                                                       type: 'scrape' },
  'Baroness Linforth':                   { url: 'https://members.parliament.uk/member/5428/portrait',                                     type: 'parliament' },
  'Baroness Lloyd of Effra':             { url: 'https://www.gov.uk/government/people/liz-lloyd',                                         type: 'govuk' },
  'Baroness MacLeod of Camusdarach':     { url: 'https://www.charlottestreetpartners.com/people/catherine-mcleod/',                       type: 'scrape' },
  'Baroness Martin of Brockley':         { url: 'https://members.parliament.uk/member/5437/portrait',                                     type: 'parliament' },
  'Baroness Monckton of Dallington Forest': { url: 'https://teamdomenica.com/team-member/rosa-monckton/',                                 type: 'scrape' },
  'Baroness Nargund':                    { url: 'https://www.geeta-nargund.com/about-geeta',                                              type: 'scrape' },
  'Baroness Neate':                      { url: 'https://www.pollyneate.net/about-me',                                                    type: 'scrape' },
  'Baroness Nichols of Selby':           { url: 'https://yorks.unison.org.uk/2025/03/25/regional-convenor-wendy-nichols-recognised-for-contribution-to-trade-unionism-at-tuc-regional-conference/', type: 'scrape' },
  'Lord Babudu':                         { url: 'https://lincoln.ox.ac.uk/people/peter-babudu',                                           type: 'scrape' },
  'Lord Barber of Chittlehampton':       { url: 'https://www.queens.ox.ac.uk/people/sir-michael-barber/',                                 type: 'scrape' },
  'Lord Brennan':                        { url: 'https://commons.wikimedia.org/wiki/Category:Daniel_Brennan,_Baron_Brennan',              type: 'wikimedia' },
  'Lord Cooper of Windrush':             { url: 'https://thebritainproject.co.uk/lordcooperofwindrush',                                   type: 'scrape' },
  'Lord Doyle':                          { url: 'https://en.wikipedia.org/wiki/Matthew_Doyle,_Baron_Doyle',                               type: 'wikipedia' },
  'Lord Duvall':                         { url: 'https://en.wikipedia.org/wiki/Len_Duvall',                                               type: 'wikipedia' },
  'Lord Feldman of Elstree':             { url: 'https://www.theconservativefoundation.co.uk/people/lord-feldman',                        type: 'scrape' },
  'Lord Forbes of Newcastle':            { url: 'https://www.gov.uk/government/people/lord-forbes-of-newcastle',                          type: 'govuk' },
  'Lord Hobby':                          { url: 'https://www.tkat.org/about-us/meet-the-team/item/1/russell-hobby-cbe',                   type: 'scrape' },
  'Lord Hutton of Furness':              { url: 'https://en.wikipedia.org/wiki/John_Hutton,_Baron_Hutton_of_Furness',                     type: 'wikipedia' },
  'Lord Isaac':                          { url: 'https://www.worc.ox.ac.uk/news-events/news/welcome-to-our-new-provost-david-isaac-cbe',   type: 'scrape' },
  'Lord John of Southwark':              { url: 'https://www.carlsonssolicitors.com/about/peter-john-obe',                                type: 'scrape' },
  'Lord Kestenbaum':                     { url: 'https://www.thejlc.org/lord-kestenbaum-of-foxcote',                                      type: 'scrape' },
  'Lord Macdonald of River Glaven':      { url: 'https://reprieve.org/uk/person/lord-ken-macdonald-of-river-glaven-qc/',                  type: 'scrape' },
  'Lord Marks of Hale':                  { url: 'https://members.parliament.uk/member/5018/portrait',                                     type: 'parliament' },
  'Lord Mendelsohn':                     { url: 'https://www.grit.org.uk/lord-mendelsohn',                                                type: 'scrape' },
  'Lord Nagaraju':                       { url: 'https://www.gulte.com/trends/395770/from-telangana-to-uk-parliament-what-a-journey',      type: 'scrape' },
  'Lord Pitt-Watson':                    { url: 'https://competentboards.com/faculty/david-pitt-watson/',                                  type: 'scrape' },
  'Lord Price':                          { url: 'https://www.gordonpoole.com/talent/mark-price-lord-mark-price/',                         type: 'scrape' },
  'Lord Raval':                          { url: 'https://berkleycenter.georgetown.edu/people/krish-raval',                                type: 'scrape' },
  'Lord Rees of Easton':                 { url: 'https://en.wikipedia.org/wiki/Marvin_Rees',                                              type: 'wikipedia' },
  'Lord Roe of West Wickham':            { url: 'https://londonspeakerbureau.com/speaker-profile/andy-roe/',                              type: 'scrape' },
  'Lord Rose of Monewden':               { url: 'https://en.wikipedia.org/wiki/Stuart_Rose',                                              type: 'wikipedia' },
  'Lord Shinkwin':                       { url: 'https://adalive.org/speakers/lord-shinkwin/',                                            type: 'scrape' },
  'Lord Stevens of Kirkwhelpington':     { url: 'https://en.wikipedia.org/wiki/John_Stevens,_Baron_Stevens_of_Kirkwhelpington',           type: 'wikipedia' },
  'Lord Stockwood':                      { url: 'https://www.gov.uk/government/people/jason-stockwood',                                   type: 'govuk' },
  'Lord Verdirame':                      { url: 'https://www.twentyessex.com/people/guglielmo-verdirame/',                                type: 'scrape' },
  'Lord Walker of Broxton':              { url: 'https://about.iceland.co.uk/our-owners/',                                                type: 'scrape' },
  'The Lord Bishop of Lichfield':        { url: 'https://www.lichfield.anglican.org/bishops-archdeacons/',                                type: 'scrape' },
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'ParliamentQuiz/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ParliamentQuiz/1.0)', Accept: 'text/html' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function extractMetaImage(html: string): string | null {
  const patterns = [
    /property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
    /name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1] && !m[1].includes('logo') && !m[1].includes('favicon') && m[1].startsWith('http')) {
      return m[1];
    }
  }
  return null;
}

async function getParliamentPortrait(url: string): Promise<string | null> {
  // Check if the portrait URL returns a real image (not placeholder)
  const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) return null;
  const ct = res.headers.get('content-type') ?? '';
  const len = Number(res.headers.get('content-length') ?? 0);
  if (ct.includes('image') && len > 5000) return url;
  return null;
}

async function getGovUkPhoto(url: string): Promise<string | null> {
  const slug = url.replace('https://www.gov.uk/government/people/', '');
  const data = await fetchJson<{ details?: { image?: { url?: string; high_resolution_url?: string } } }>(
    `https://www.gov.uk/api/content/government/people/${slug}`
  );
  return data.details?.image?.high_resolution_url ?? data.details?.image?.url ?? null;
}

async function getWikipediaPhoto(url: string): Promise<string | null> {
  const title = url.replace('https://en.wikipedia.org/wiki/', '');
  const data = await fetchJson<{ originalimage?: { source?: string }; thumbnail?: { source?: string } }>(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`
  );
  return data.originalimage?.source ?? data.thumbnail?.source ?? null;
}

async function getWikimediaPhoto(url: string): Promise<string | null> {
  // Extract category name and find first image
  const cat = url.replace('https://commons.wikimedia.org/wiki/Category:', '');
  const data = await fetchJson<{ query?: { categorymembers?: Array<{ title: string }> } }>(
    `https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtype=file&cmtitle=Category:${encodeURIComponent(cat)}&cmlimit=3&format=json&origin=*`
  );
  const files = data.query?.categorymembers ?? [];
  for (const file of files) {
    const title = file.title;
    const imgData = await fetchJson<{ query?: { pages?: Record<string, { imageinfo?: Array<{ url?: string }> }> } }>(
      `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&format=json&origin=*`
    );
    const pages = imgData.query?.pages ?? {};
    for (const page of Object.values(pages)) {
      const imgUrl = page.imageinfo?.[0]?.url;
      if (imgUrl) return imgUrl;
    }
  }
  return null;
}

async function resolvePhoto(name: string, source: { url: string; type: string }): Promise<string | null> {
  try {
    switch (source.type) {
      case 'parliament': return await getParliamentPortrait(source.url);
      case 'govuk':      return await getGovUkPhoto(source.url);
      case 'wikipedia':  return await getWikipediaPhoto(source.url);
      case 'wikimedia':  return await getWikimediaPhoto(source.url);
      case 'scrape': {
        const html = await fetchHtml(source.url);
        return extractMetaImage(html);
      }
    }
  } catch (e) {
    console.error(`  Error for ${name}: ${e}`);
  }
  return null;
}

async function main() {
  const dataPath = join(__dirname, '..', 'src', 'data', 'members.json');
  const members: Member[] = JSON.parse(readFileSync(dataPath, 'utf-8'));
  const memberMap = new Map(members.map(m => [m.name, m]));

  let fixed = 0;
  let failed: string[] = [];

  for (const [name, source] of Object.entries(SOURCES)) {
    const member = memberMap.get(name);
    if (!member) { console.log(`  ⚠ Not found in data: ${name}`); continue; }

    process.stdout.write(`  ${name}... `);
    const imgUrl = await resolvePhoto(name, source);

    if (imgUrl) {
      member.photoUrl = imgUrl;
      member.photoSource = source.type === 'parliament' ? 'parliament-portrait'
        : source.type === 'govuk' ? 'govuk'
        : source.type === 'wikipedia' ? 'wikipedia-direct'
        : source.type === 'wikimedia' ? 'wikimedia'
        : 'scraped';
      fixed++;
      console.log(`✓ (${source.type})`);
    } else {
      failed.push(name);
      console.log(`✗`);
    }

    await delay(400);
  }

  writeFileSync(dataPath, JSON.stringify(members, null, 2));

  console.log(`\nFixed: ${fixed}/${Object.keys(SOURCES).length}`);
  if (failed.length) {
    console.log(`Failed (${failed.length}):`);
    failed.forEach(n => console.log(`  - ${n}`));
  }
}

main().catch(console.error);
