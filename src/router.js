import gsap from 'gsap';
import content from './content.json';
import { initAnimations, startIntro, getLenis } from './animations.js';
import { circle, reach } from './reveal.js';

// Hash router over the pages in the DOM ([data-page]). "#/about" etc. reveal the new page inside a circle
// that grows out of the clicked link, the same transition the collages use; no hash is home. "#/work" and
// "#/credentials" are not pages: the collages (collage.js) own them and leave the page as it is.
export function initRouter() {
  const pages = Object.fromEntries([...document.querySelectorAll('[data-page]')].map((p) => [p.dataset.page, p]));
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const labels = { home: content.ui.home, ...Object.fromEntries(content.ui.nav.map((n) => [n.target, n.label])) };
  const root = document.documentElement;
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

  // The header follows the destination from the first frame of a transition (back link, current item, color).
  const chrome = (name) => {
    current = name;
    root.dataset.route = name; // not data-page: that attribute marks the page containers
    document.title = name === 'home' ? content.meta.title : `${labels[name]} — ${content.person.name}`;
    dispatchEvent(new Event('pagechange')); // main.js repaints the header and the current nav item
  };

  // What changes once the new page is in place: scroll, focus, and the page's animations.
  const settle = (name, introStarted) => {
    chrome(name);
    scrollTo(0, 0);
    initAnimations(pages[name], { introStarted });
    pages[name].focus({ preventScroll: true });
  };

  const show = (name) => {
    Object.entries(pages).forEach(([key, el]) => (el.hidden = key !== name));
    settle(name, false);
  };

  // The new page is laid over the old one as a fixed, one-screen layer and revealed by the growing circle;
  // its entrance plays inside the circle. When the circle has covered the screen the old page goes and the
  // layer becomes the page itself (same pixels, scroll 0). The scrollbar thumb stays invisible through the
  // swap, so its jump (the document height changes) never shows.
  // Going back home is the same circle played the other way, like a collage closing: the page you are on
  // (scrolled or not) shrinks into the link while home waits under it as the layer.
  const reveal = (name) => {
    busy = true;
    const closing = name === 'home';
    const old = pages[current];
    const moving = closing ? old : pages[name]; // the page the circle clips
    root.classList.add('is-transitioning');
    getLenis()?.stop();
    const y = scrollY;
    const dy = closing ? y : 0; // a scrolled page is clipped in its own coordinates
    const pin = () => scrollY !== y && scrollTo(0, y); // overflow is not locked (see styles.css), so undo wheel/keys
    const [from, to] = closing ? [circle(reach(), dy), circle(0, dy)] : [circle(0), circle(reach())];
    moving.style.clipPath = from; // set before it shows: the tween below only renders on the next frame
    pages[name].hidden = false;
    if (closing) {
      pages.home.classList.add('page-layer', 'page-layer--under');
      old.classList.add('page-closing');
    } else pages[name].classList.add('page-layer');
    addEventListener('scroll', pin);
    startIntro(pages[name], closing ? 0.15 : 0.4);
    chrome(name);
    gsap.fromTo(
      moving,
      { clipPath: from },
      {
        clipPath: to,
        duration: closing ? 0.9 : 1,
        ease: 'power3.inOut',
        onComplete: () => {
          removeEventListener('scroll', pin);
          Object.entries(pages).forEach(([key, el]) => {
            el.hidden = key !== name;
            el.classList.remove('page-layer', 'page-layer--under', 'page-closing');
          });
          gsap.set(moving, { clearProps: 'clipPath' });
          settle(name, true);
          setTimeout(() => root.classList.remove('is-transitioning'), 250);
          busy = false;
          if (wanted && wanted !== current) go(wanted, false);
          wanted = null;
        },
      },
    );
  };

  const go = (name, push = true) => {
    if (busy) {
      if (push && name !== (wanted ?? current)) history.pushState(null, '', urlOf(name)); // the URL follows the click, the page follows later
      wanted = name;
      return;
    }
    if (name === current) return;
    if (push) history.pushState(null, '', urlOf(name));
    if (reduced()) show(name);
    else reveal(name);
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
      if (name === current && !busy) scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
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
