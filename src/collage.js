import gsap from 'gsap';
import { getLenis } from './animations.js';
import { circle, reach } from './reveal.js';
import { resetTable } from './cards.js';

// Fullscreen layers (hash routes #/work, #/credentials) that hold a card table (cards.js). This file opens and closes
// them with the circle reveal, locks the page behind them and keeps the route in the hash.
// The hash decides which collage is open; the scroll lock and the inert page are shared by all of them.
export function initCollage() {
  const behind = [document.getElementById('main'), document.querySelector('.footer'), document.querySelector('.skip')];
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let locked = false;
  let lockY = 0;
  let opener = null;

  // Scroll is not locked with overflow (that changes the page width); anything that still moves it
  // behind the collage (scrollbar drag, keys) is undone.
  const pinScroll = () => scrollY !== lockY && scrollTo(0, lockY);

  const makeCollage = (root) => {
    const name = root.dataset.collage;
    const route = `#/${name}`;
    const title = root.querySelector('.collage__title');
    const c = { name, route, root, open: false };

    c.show = (animated) => {
      c.open = true;
      root.inert = false;
      root.style.zIndex = 81; // above a collage that is closing at the same moment
      root.style.clipPath = circle(0); // before it shows: the tween below only renders on the next frame
      gsap.set(root, { autoAlpha: 1 }); // visible at once; the clip-path circle does the revealing
      gsap.fromTo(
        root,
        { clipPath: circle(0) },
        { clipPath: circle(reach()), duration: animated ? 1 : 0, ease: 'power3.inOut', overwrite: true, clearProps: 'clipPath' },
      );
      gsap.fromTo(
        title,
        { '--in': 0 },
        { '--in': 1, duration: animated ? 1 : 0, delay: animated ? 0.3 : 0, ease: 'power3.out', overwrite: 'auto' },
      );
      root.querySelector('[data-collage-close]').focus({ preventScroll: true });
    };

    c.hide = (animated) => {
      c.open = false;
      root.inert = true;
      root.style.zIndex = 80;
      gsap.fromTo(
        root,
        { clipPath: circle(reach()) },
        {
          clipPath: circle(0),
          duration: animated ? 0.8 : 0,
          ease: 'power3.inOut',
          overwrite: true,
          onComplete: () => {
            gsap.set(root, { autoAlpha: 0, clearProps: 'clipPath' });
            if (!c.open) resetTable(root); // the next visit starts with a clean table
          },
        },
      );
    };

    root.querySelector('[data-collage-close]').addEventListener('click', () => go(null));
    return c;
  };

  const collages = [...document.querySelectorAll('[data-collage]')].map(makeCollage);

  // Opens the collage whose route matches the hash and closes the others; the first to open locks the page.
  const sync = (animated = true) => {
    const was = collages.some((c) => c.open);
    collages.forEach((c) => {
      const want = location.hash === c.route;
      if (want === c.open) return;
      if (want && !was) {
        opener = document.activeElement;
        lockY = scrollY;
      }
      (want ? c.show : c.hide)(animated && !reduced());
    });
    dispatchEvent(new Event('pagechange')); // the nav item of the open collage becomes the current one
    const now = collages.some((c) => c.open);
    if (now === locked) return;
    locked = now;
    document.documentElement.classList.toggle('collage-open', now);
    behind.forEach((el) => (el.inert = now));
    if (now) {
      addEventListener('scroll', pinScroll);
      getLenis()?.stop();
    } else {
      removeEventListener('scroll', pinScroll);
      getLenis()?.start();
      opener?.isConnected && opener.focus({ preventScroll: true });
    }
  };

  const go = (route, animated = true) => {
    // closing returns to the page underneath (the router keeps its name in data-route), not always to home
    const page = document.documentElement.dataset.route;
    history.pushState(null, '', route ?? (page && page !== 'home' ? `#/${page}` : location.pathname + location.search));
    sync(animated);
  };

  // Capture phase: runs before the Lenis anchor handler and before the router, so an opener click is
  // claimed here and an in-page link (menu, header nav) closes the collage first and then scrolls normally.
  document.addEventListener(
    'click',
    (e) => {
      const a = e.target.closest('a');
      const next = collages.find((c) => c.name === a?.dataset.openCollage);
      const href = a?.getAttribute('href');
      if (next) {
        e.preventDefault();
        go(next.route);
      } else if (locked && href?.startsWith('#')) {
        // A link to another page: no second circle, the router reveals that page. A link to the page already
        // underneath (or an in-page anchor) is just a close, so the collage shrinks into it.
        const under = document.documentElement.dataset.route;
        const same = href === `#/${under}` || (under === 'home' && /^#\/?$/.test(href));
        go(null, same || !href.startsWith('#/'));
      }
    },
    true,
  );
  addEventListener('popstate', () => sync());
  addEventListener('keydown', (e) => e.key === 'Escape' && locked && go(null));

  sync(false); // deep link: opened straight on #/work or #/credentials
}
