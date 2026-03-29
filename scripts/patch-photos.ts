/**
 * Finds members with placeholder photos and replaces them with
 * GOV.UK images (ministers) or Wikipedia images (others).
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLACEHOLDER_MD5 = 'c534965f49c4e4a45922dc4828f953ee';
const PLACEHOLDER_SIZE = 2590;

interface Member {
  id: number;
  name: string;
  fullTitle: string;
  party: string;
  house: string;
  constituency: string | null;
  photoUrl: string;
  isMinister: boolean;
  ministerialTitle: string | null;
  department: string | null;
  gender: string;
  photoSource?: string;
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

async function isPlaceholder(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    const len = Number(res.headers.get('content-length') ?? 0);
    return len === PLACEHOLDER_SIZE;
  } catch {
    return true; // treat errors as missing
  }
}

function nameToGovUkSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(rt hon |sir |dame |lord |baroness |dr |mr |mrs |ms |the |baron |viscount |earl |duke of |lady )/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

async function fetchGovUkPhoto(name: string): Promise<string | null> {
  const slug = nameToGovUkSlug(name);
  const url = `https://www.gov.uk/api/content/government/people/${slug}`;
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json() as {
      details?: { image?: { url?: string; high_resolution_url?: string } }
    };
    const imgUrl = data.details?.image?.high_resolution_url ?? data.details?.image?.url ?? null;
    return imgUrl ?? null;
  } catch {
    return null;
  }
}

function nameToWikiTitle(name: string): string {
  // Remove titles
  return name
    .replace(/^(Rt Hon |Sir |Dame |Dr |Mr |Mrs |Ms |The |Baron |Baroness |Viscount |Earl |Lady )/g, '')
    .trim();
}

async function fetchWikipediaPhoto(name: string): Promise<string | null> {
  const title = nameToWikiTitle(name);
  const encoded = encodeURIComponent(title.replace(/ /g, '_'));
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'ParliamentQuiz/1.0' }
    });
    if (!res.ok) return null;
    const data = await res.json() as {
      thumbnail?: { source?: string };
      originalimage?: { source?: string };
      type?: string;
    };
    if (data.type === 'disambiguation') return null;
    return data.originalimage?.source ?? data.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

// Concurrent placeholder check with limited parallelism
async function findMissingPhotos(members: Member[], concurrency = 20): Promise<Member[]> {
  const missing: Member[] = [];
  const chunks = [];
  for (let i = 0; i < members.length; i += concurrency) {
    chunks.push(members.slice(i, i + concurrency));
  }

  let checked = 0;
  for (const chunk of chunks) {
    const results = await Promise.all(
      chunk.map(async m => ({ member: m, missing: await isPlaceholder(m.photoUrl) }))
    );
    for (const { member, missing: isMissing } of results) {
      if (isMissing) missing.push(member);
    }
    checked += chunk.length;
    if (checked % 100 === 0 || checked === members.length) {
      process.stdout.write(`\r  Checked ${checked}/${members.length}, missing so far: ${missing.length}`);
    }
    await delay(100); // small pause between chunks
  }
  console.log();
  return missing;
}

async function main() {
  const dataPath = join(__dirname, '..', 'src', 'data', 'members.json');
  const members: Member[] = JSON.parse(readFileSync(dataPath, 'utf-8'));

  console.log(`Scanning ${members.length} members for placeholder photos...`);
  const missing = await findMissingPhotos(members);
  console.log(`\nFound ${missing.length} members with missing photos.\n`);

  const ministers = missing.filter(m => m.isMinister);
  const nonMinisters = missing.filter(m => !m.isMinister);

  console.log(`  Ministers missing photo: ${ministers.length}`);
  console.log(`  Others missing photo: ${nonMinisters.length}\n`);

  let fixed = 0;
  const memberMap = new Map(members.map(m => [m.id, m]));

  // --- Ministers: try GOV.UK first, then Wikipedia ---
  console.log('Fetching minister photos from GOV.UK...');
  for (const m of ministers) {
    const govUrl = await fetchGovUkPhoto(m.name);
    if (govUrl) {
      memberMap.get(m.id)!.photoUrl = govUrl;
      memberMap.get(m.id)!.photoSource = 'govuk';
      fixed++;
      console.log(`  ✓ ${m.name} → GOV.UK`);
    } else {
      // Fallback to Wikipedia
      const wikiUrl = await fetchWikipediaPhoto(m.name);
      if (wikiUrl) {
        memberMap.get(m.id)!.photoUrl = wikiUrl;
        memberMap.get(m.id)!.photoSource = 'wikipedia';
        fixed++;
        console.log(`  ✓ ${m.name} → Wikipedia`);
      } else {
        console.log(`  ✗ ${m.name} → not found`);
      }
    }
    await delay(300);
  }

  // --- Non-ministers: Wikipedia ---
  console.log('\nFetching non-minister photos from Wikipedia...');
  let wikiCount = 0;
  for (const m of nonMinisters) {
    const wikiUrl = await fetchWikipediaPhoto(m.name);
    if (wikiUrl) {
      memberMap.get(m.id)!.photoUrl = wikiUrl;
      memberMap.get(m.id)!.photoSource = 'wikipedia';
      fixed++;
      wikiCount++;
    }
    await delay(150);
    if ((wikiCount + 1) % 20 === 0 || wikiCount === nonMinisters.length) {
      process.stdout.write(`\r  Processed ${wikiCount}/${nonMinisters.length} (fixed ${fixed} total)`);
    }
  }
  console.log();

  const updated = [...memberMap.values()];
  writeFileSync(dataPath, JSON.stringify(updated, null, 2));

  const stillMissing = missing.length - fixed;
  console.log(`\nDone!`);
  console.log(`  Fixed: ${fixed}/${missing.length}`);
  console.log(`  Still missing: ${stillMissing}`);

  // Report still-missing members
  if (stillMissing > 0) {
    const unfixed = missing.filter(m => memberMap.get(m.id)!.photoSource === undefined);
    console.log('\nMembers still without photos:');
    for (const m of unfixed.slice(0, 30)) {
      console.log(`  [${m.house}] ${m.name} (${m.party})`);
    }
    if (unfixed.length > 30) console.log(`  ... and ${unfixed.length - 30} more`);
  }
}

main().catch(console.error);
