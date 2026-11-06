// Counts the articles on irfolks.com (one <item> per article in its English RSS feed) and writes src/irfolks.json,
// which the "Articles on irfolks" stat reads. Runs before every build (`prebuild`), so each deploy picks up new posts.
// A network or feed error keeps the last saved number: the build must never fail because irfolks is down.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FEED = 'https://irfolks.com/rss.xml';
const OUT = fileURLToPath(new URL('../src/irfolks.json', import.meta.url));

export const countItems = (xml) => (xml.match(/<item>/g) ?? []).length;

async function main() {
  let saved = { count: 0 };
  try {
    saved = JSON.parse(readFileSync(OUT, 'utf8'));
  } catch {
    /* first run: no file yet */
  }
  try {
    const res = await fetch(FEED, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    if (!xml.includes('<rss')) throw new Error('not an RSS feed');
    const count = countItems(xml);
    if (count !== saved.count) writeFileSync(OUT, JSON.stringify({ count, feed: FEED }, null, 2) + '\n');
    console.log(`irfolks: ${count} articles${count === saved.count ? ' (unchanged)' : ' (updated)'}`);
  } catch (err) {
    console.warn(`irfolks: could not read ${FEED} (${err.message}); keeping ${saved.count}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
