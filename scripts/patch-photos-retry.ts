/**
 * Second pass: tries harder name variations for members still missing photos.
 * Uses Wikipedia search API and Wikidata for better matching.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLACEHOLDER_SIZE = 2590;

interface Member {
  id: number;
  name: string;
  house: string;
  party: string;
  isMinister: boolean;
  photoUrl: string;
  photoSource?: string;
  constituency: string | null;
  [key: string]: unknown;
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

async function isPlaceholder(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    const len = Number(res.headers.get('content-length') ?? 0);
    return len === PLACEHOLDER_SIZE;
  } catch { return true; }
}

// Strip all titles and honorifics
function stripTitles(name: string): string {
  return name
    .replace(/^(Rt Hon |The Rt Hon |Sir |Dame |Lord |Baroness |Baron |Dr |Mr |Mrs |Ms |Miss |The |Viscount |Earl |Lady |The Lord Bishop of |The Bishop of )/gi, '')
    .replace(/ (CBE|OBE|MBE|QC|KC|MP|PC|FRS)$/gi, '')
    .trim();
}

// Try multiple Wikipedia title variations
function wikiVariants(name: string): string[] {
  const stripped = stripTitles(name);
  const variants = [
    stripped,
    `${stripped} (politician)`,
    `${stripped} (peer)`,
    `${stripped} (bishop)`,
  ];
  // If name has "of X" suffix, also try without it
  const withoutOf = stripped.replace(/ of [\w\s]+$/, '').trim();
  if (withoutOf !== stripped) {
    variants.push(withoutOf);
    variants.push(`${withoutOf} (politician)`);
  }
  return variants;
}

async function fetchWikipediaPhotoBySearch(name: string): Promise<string | null> {
  // Use Wikipedia opensearch + summary
  const stripped = stripTitles(name);
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(stripped)}&limit=3&format=json&origin=*`;

  try {
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': 'ParliamentQuiz/1.0 (educational)' }
    });
    if (!res.ok) return null;
    const [, titles] = await res.json() as [string, string[]];
    if (!titles?.length) return null;

    // Try each result — pick the one most likely to be a politician
    for (const title of titles.slice(0, 3)) {
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;
      const summaryRes = await fetch(summaryUrl, {
        headers: { 'User-Agent': 'ParliamentQuiz/1.0' }
      });
      if (!summaryRes.ok) continue;
      const data = await summaryRes.json() as {
        extract?: string;
        originalimage?: { source?: string };
        thumbnail?: { source?: string };
        type?: string;
      };
      if (data.type === 'disambiguation') continue;

      // Check if extract mentions politics/parliament
      const extract = (data.extract ?? '').toLowerCase();
      const isPolitician = extract.includes('parliament') || extract.includes('politic') ||
        extract.includes('minister') || extract.includes('member of') ||
        extract.includes('lord') || extract.includes('bishop') ||
        extract.includes('labour') || extract.includes('conservative') ||
        extract.includes('liberal') || extract.includes('peer');

      if (isPolitician && (data.originalimage?.source || data.thumbnail?.source)) {
        return data.originalimage?.source ?? data.thumbnail?.source ?? null;
      }
    }
    return null;
  } catch { return null; }
}

async function fetchWikidataPhoto(name: string): Promise<string | null> {
  const stripped = stripTitles(name);
  // Search Wikidata for person
  const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(stripped)}&language=en&type=item&format=json&origin=*`;
  try {
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': 'ParliamentQuiz/1.0' }
    });
    if (!res.ok) return null;
    const data = await res.json() as { search: Array<{ id: string; description?: string }> };
    if (!data.search?.length) return null;

    // Find the entry that looks like a politician
    const item = data.search.find(s =>
      (s.description ?? '').toLowerCase().match(/politician|member of parliament|life peer|lord|bishop|baroness/)
    ) ?? data.search[0];

    if (!item) return null;

    // Get P18 (image) from Wikidata entity
    const entityUrl = `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${item.id}&property=P18&format=json&origin=*`;
    const entityRes = await fetch(entityUrl, {
      headers: { 'User-Agent': 'ParliamentQuiz/1.0' }
    });
    if (!entityRes.ok) return null;
    const entityData = await entityRes.json() as {
      claims?: { P18?: Array<{ mainsnak: { datavalue?: { value?: { value?: string } } } }> }
    };

    const filename = entityData.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    if (!filename) return null;
    const fn = typeof filename === 'string' ? filename : (filename as { value?: string }).value;
    if (!fn) return null;

    // Convert Wikimedia filename to URL
    const encoded = fn.replace(/ /g, '_');
    const md5 = await crypto.subtle.digest('MD5', new TextEncoder().encode(encoded)).catch(() => null);
    // Use Wikimedia Commons direct URL pattern
    const wikiUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(encoded)}`;
    return wikiUrl;
  } catch { return null; }
}

async function main() {
  const dataPath = join(__dirname, '..', 'src', 'data', 'members.json');
  const members: Member[] = JSON.parse(readFileSync(dataPath, 'utf-8'));

  // Find members still using placeholder (check those without photoSource or with parliament URL)
  const parliamentUrlMembers = members.filter(m =>
    m.photoUrl.includes('members-api.parliament.uk') && !m.photoSource
  );

  console.log(`Checking ${parliamentUrlMembers.length} members still on Parliament API URLs...`);

  // Quick scan - check in parallel
  const stillMissing: Member[] = [];
  const concurrency = 30;
  for (let i = 0; i < parliamentUrlMembers.length; i += concurrency) {
    const chunk = parliamentUrlMembers.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map(async m => ({ m, missing: await isPlaceholder(m.photoUrl) }))
    );
    for (const { m, missing } of results) {
      if (missing) stillMissing.push(m);
    }
    process.stdout.write(`\r  Scanned ${Math.min(i + concurrency, parliamentUrlMembers.length)}/${parliamentUrlMembers.length}, missing: ${stillMissing.length}`);
    await delay(80);
  }
  console.log(`\n\nStill missing: ${stillMissing.length}\n`);

  const memberMap = new Map(members.map(m => [m.id, m]));
  let fixed = 0;

  for (let i = 0; i < stillMissing.length; i++) {
    const m = stillMissing[i];
    process.stdout.write(`\r  [${i + 1}/${stillMissing.length}] ${m.name.padEnd(40)} fixed=${fixed}`);

    // Try Wikipedia search first
    let url = await fetchWikipediaPhotoBySearch(m.name);
    let source = 'wikipedia-search';

    // Fallback to Wikidata
    if (!url) {
      await delay(100);
      url = await fetchWikidataPhoto(m.name);
      source = 'wikidata';
    }

    if (url) {
      memberMap.get(m.id)!.photoUrl = url;
      memberMap.get(m.id)!.photoSource = source;
      fixed++;
      process.stdout.write(`\r  [${i + 1}/${stillMissing.length}] ✓ ${m.name.padEnd(40)} fixed=${fixed}\n`);
    }

    await delay(200);
  }

  console.log(`\n\nFixed ${fixed}/${stillMissing.length} in this pass.`);

  // Final tally
  const finalMissing = [...memberMap.values()].filter(m =>
    m.photoUrl.includes('members-api.parliament.uk') && !m.photoSource
  );
  console.log(`Total still on placeholder after all passes: checking...`);

  writeFileSync(dataPath, JSON.stringify([...memberMap.values()], null, 2));
  console.log('Saved.');

  if (fixed === 0 || stillMissing.length - fixed > 0) {
    const unfixed = stillMissing.filter(m => !memberMap.get(m.id)!.photoSource);
    console.log(`\nRemaining ${unfixed.length} without photos (mostly very new Lords with no public profile yet):`);
    const lords = unfixed.filter(m => m.house === 'Lords');
    const mps = unfixed.filter(m => m.house === 'Commons');
    console.log(`  Lords: ${lords.length}, MPs: ${mps.length}`);
    for (const m of mps) console.log(`  MP: ${m.name} (${m.party})`);
  }
}

main().catch(console.error);
