// Escapes text for HTML: element content and double-quoted attributes. Shared by the page code (main.js) and the
// build's <head> (vite.config.js), so neither pastes content.json into HTML raw.
export const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
