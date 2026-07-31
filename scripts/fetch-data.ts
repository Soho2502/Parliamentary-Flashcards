import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BASE_URL = 'https://members-api.parliament.uk/api';

interface ApiMember {
  id: number;
  nameDisplayAs: string;
  nameFullTitle: string;
  gender: string;
  thumbnailUrl: string;
  latestParty: { id: number; name: string };
  latestHouseMembership: { membershipFrom: string; house: number };
}

interface ApiResponse {
  items: Array<{ value: ApiMember }>;
  totalResults: number;
}

interface BiographyPost {
  name: string;
  id: number;
  startDate: string;
  endDate: string | null;
  additionalInfo: string | null;
  additionalInfoLink: string | null;
}

interface BiographyResponse {
  value: {
    governmentPosts: BiographyPost[];
    oppositionPosts: BiographyPost[];
  };
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json() as Promise<T>;
}

async function fetchAllMembers(house: 1 | 2): Promise<ApiMember[]> {
  const houseName = house === 1 ? 'Commons' : 'Lords';
  console.log(`Fetching ${houseName} members...`);
  const members: ApiMember[] = [];
  const take = 20;
  let skip = 0;
  let total = Infinity;

  while (skip < total) {
    const url = `${BASE_URL}/Members/Search?House=${house}&IsCurrentMember=true&skip=${skip}&take=${take}`;
    try {
      const data = await fetchJson<ApiResponse>(url);
      total = data.totalResults;
      members.push(...data.items.map(i => i.value));
      console.log(`  ${houseName}: fetched ${members.length}/${total}`);
      skip += take;
      await delay(250);
    } catch (e) {
      console.error(`Error fetching ${houseName} at skip=${skip}:`, e);
      break;
    }
  }

  return members;
}

async function fetchBiography(memberId: number): Promise<{ governmentPosts: BiographyPost[]; oppositionPosts: BiographyPost[] }> {
  try {
    const url = `${BASE_URL}/Members/${memberId}/Biography`;
    const data = await fetchJson<BiographyResponse>(url);
    return {
      governmentPosts: data.value?.governmentPosts ?? [],
      oppositionPosts: data.value?.oppositionPosts ?? [],
    };
  } catch {
    return { governmentPosts: [], oppositionPosts: [] };
  }
}

async function main() {
  const [mps, lords] = await Promise.all([
    fetchAllMembers(1),
    fetchAllMembers(2),
  ]);

  const allMembers = [
    ...mps.map(m => ({ ...m, houseNum: 1 as const })),
    ...lords.map(m => ({ ...m, houseNum: 2 as const })),
  ];

  console.log(`\nProcessing ${allMembers.length} members for government posts...`);

  const results = [];
  let processed = 0;

  for (const member of allMembers) {
    const { governmentPosts, oppositionPosts } = await fetchBiography(member.id);
    const currentGovPost = governmentPosts.find(p => p.endDate === null);
    const currentOppPost = oppositionPosts.find(p => p.endDate === null);

    // Extract department from additionalInfoLink if available
    let department: string | null = null;
    if (currentGovPost?.additionalInfoLink) {
      const match = currentGovPost.additionalInfoLink.match(/organisations\/([^/]+)/);
      if (match) {
        department = match[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      }
    }

    results.push({
      id: member.id,
      name: member.nameDisplayAs,
      fullTitle: member.nameFullTitle,
      party: member.latestParty?.name ?? 'Unknown',
      house: member.houseNum === 1 ? 'Commons' : 'Lords',
      constituency: member.latestHouseMembership?.membershipFrom ?? null,
      photoUrl: member.thumbnailUrl ?? `${BASE_URL}/Members/${member.id}/Thumbnail`,
      isMinister: !!currentGovPost,
      ministerialTitle: currentGovPost?.name ?? null,
      department,
      gender: member.gender,
      isShadowMinister: !!currentOppPost,
      shadowMinisterialTitle: currentOppPost?.name ?? null,
    });

    processed++;
    if (processed % 50 === 0) {
      console.log(`  Processed ${processed}/${allMembers.length}`);
    }

    await delay(200);
  }

  const outDir = join(__dirname, '..', 'src', 'data');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'members.json');
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nSaved ${results.length} members to ${outPath}`);
  console.log(`Ministers: ${results.filter(m => m.isMinister).length}`);
  console.log(`Shadow Ministers: ${results.filter(m => m.isShadowMinister).length}`);
  console.log(`MPs: ${results.filter(m => m.house === 'Commons').length}`);
  console.log(`Lords: ${results.filter(m => m.house === 'Lords').length}`);
}

main().catch(console.error);
