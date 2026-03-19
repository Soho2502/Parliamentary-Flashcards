/**
 * Patch minister data on existing members.json using the Biography endpoint.
 * Run after fetch-data.ts if minister flags are missing.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'https://members-api.parliament.uk/api';

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
}

interface BiographyPost {
  name: string;
  id: number;
  startDate: string;
  endDate: string | null;
  additionalInfo: string | null;
  additionalInfoLink: string | null;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchBiography(memberId: number): Promise<BiographyPost[]> {
  try {
    const res = await fetch(`${BASE_URL}/Members/${memberId}/Biography`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) return [];
    const data = await res.json() as { value: { governmentPosts: BiographyPost[] } };
    return data.value?.governmentPosts ?? [];
  } catch {
    return [];
  }
}

async function main() {
  const dataPath = join(__dirname, '..', 'src', 'data', 'members.json');
  const members: Member[] = JSON.parse(readFileSync(dataPath, 'utf-8'));

  console.log(`Patching minister data for ${members.length} members...`);
  let ministerCount = 0;

  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    const posts = await fetchBiography(member.id);
    const current = posts.find(p => p.endDate === null);

    let department: string | null = null;
    if (current?.additionalInfoLink) {
      const match = current.additionalInfoLink.match(/organisations\/([^/]+)/);
      if (match) {
        department = match[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      }
    }

    member.isMinister = !!current;
    member.ministerialTitle = current?.name ?? null;
    member.department = department;

    if (current) ministerCount++;

    if ((i + 1) % 50 === 0) {
      console.log(`  ${i + 1}/${members.length} (ministers so far: ${ministerCount})`);
      // Save progress periodically
      writeFileSync(dataPath, JSON.stringify(members, null, 2));
    }

    await delay(200);
  }

  writeFileSync(dataPath, JSON.stringify(members, null, 2));
  console.log(`\nDone. ${ministerCount} ministers found out of ${members.length} members.`);
}

main().catch(console.error);
