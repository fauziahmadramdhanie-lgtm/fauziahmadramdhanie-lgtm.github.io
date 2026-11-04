import content from './content.json';
import { initAnimations } from './animations.js';
import { sweep } from './curtain.js';

// Hash router over the pages in the DOM ([data-page]). "#/about" etc. swap the visible page behind the
// curtain; no hash is home. "#/work" and "#/credentials" are not pages: the collages (collage.js) own them
// and leave the page as it is.
export function initRouter() {
  const pages = Object.fromEntries([...document.querySelectorAll('[data-page]')].map((p) => [p.dataset.page, p]));
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const labels = { home: content.ui.home, ...Object.fromEntries(content.ui.nav.map((n) => [n.target, n.label])) };
  let current = null;
  let target = null; // the page the latest request asked for; the swap shows this one

  // '#/about' -> 'about', '' or '#/' -> 'home', '#/work' and '#/credentials' -> null (collages, not pages)
  const routeOf = (hash) => {
    const name = /^#\/(\w*)/.exec(hash)?.[1] ?? '';
    if (name === 'work' || name === 'credentials') return null;
    return pages[name] ? name : 'home';
  };
  const urlOf = (name) => (name === 'home' ? location.pathname + location.search : `#/${name}`);

  const show = (name) => {
    Object.entries(pages).forEach(([key, el]) => (el.hidden = key !== name));
    current = name;
    document.documentElement.dataset.route = name; // not data-page: that attribute marks the page containers
    document.title = name === 'home' ? content.meta.title : `${labels[name]} — ${content.person.name}`;
    document.querySelectorAll('.site-nav a').forEach((a) =>
      a.getAttribute('href') === `#/${name}` ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'),
    );
    scrollTo(0, 0);
    initAnimations(pages[name]);
    pages[name].focus({ preventScroll: true });
    dispatchEvent(new Event('pagechange'));
  };

  const go = (name, push = true) => {
    if (name === target) return;
    target = name;
    if (push) history.pushState(null, '', urlOf(name));
    sweep(labels[name], () => current !== target && show(target));
  };

  // Capture phase and registered after the collage's, so an open collage has closed before the page changes.
  document.addEventListener(
    'click',
    (e) => {
      const a = e.target.closest('a[href^="#/"]');
      if (!a || a.matches('[data-open-collage]')) return;
      const name = routeOf(a.getAttribute('href'));
      if (!name) return;
      e.preventDefault();
      if (name === target) scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
      else go(name);
    },
    true,
  );
  addEventListener('popstate', () => {
    const name = routeOf(location.hash);
    if (name) go(name, false);
  });

  target = routeOf(location.hash) ?? 'home'; // collage deep link: the collage opens over home
  show(target);
}
