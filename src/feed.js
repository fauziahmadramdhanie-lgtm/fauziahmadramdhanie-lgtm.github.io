// Counts the articles of an RSS feed: one <item> per article. Shared by the build step (scripts/irfolks-count.mjs) and
// the page, which asks the feed again at each visit (main.js), so a new article shows up without a rebuild.
export const countItems = (xml) => (xml.match(/<item>/g) ?? []).length;
