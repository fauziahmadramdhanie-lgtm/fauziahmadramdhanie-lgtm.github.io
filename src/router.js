import gsap from 'gsap';
import content from './content.json';
import { initAnimations } from './animations.js';

// Hash router over the pages in the DOM ([data-page]). "#/about" etc. swap the visible page behind an ink
// curtain; no hash is home. "#/work" is not a page: the collage (collage.js) owns it and leaves the page as is.
export function initRouter() {
  const pages = Object.fromEntries([...document.querySelectorAll('[data-page]')].map((p) => [p.dataset.page, p]));
  const curtain = document.querySelector('[data-curtain]');
  const label = curtain.querySelector('span');
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const labels = { home: content.ui.home, ...Object.fromEntries(content.ui.nav.map((n) => [n.target, n.label])) };
  let current = null;
  let busy = false;
  let wanted = null; // a navigation requested mid-transition, replayed when it ends

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
    if (busy) {
      wanted = name;
      return;
    }
    if (name === current) return;
    if (push) history.pushState(null, '', urlOf(name));
    if (reduced()) return show(name);

    busy = true;
    label.textContent = labels[name];
    gsap
      .timeline({
        onComplete: () => {
          busy = false;
          if (wanted && wanted !== current) go(wanted, false);
          wanted = null;
        },
      })
      .set(curtain, { display: 'grid', clipPath: 'inset(100% 0% 0% 0%)' })
      .to(curtain, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6, ease: 'power3.inOut' })
      .fromTo(label, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, '-=0.3')
      .add(() => show(name))
      .to(label, { y: -40, opacity: 0, duration: 0.35, ease: 'power2.in' }, '+=0.15')
      .to(curtain, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.7, ease: 'power3.inOut' }, '-=0.1')
      .set(curtain, { display: 'none' });
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
      if (name === current) scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
      else go(name);
    },
    true,
  );
  addEventListener('popstate', () => {
    const name = routeOf(location.hash);
    if (name) go(name, false);
  });

  show(routeOf(location.hash) ?? 'home'); // collage deep link: the collage opens over home
}
