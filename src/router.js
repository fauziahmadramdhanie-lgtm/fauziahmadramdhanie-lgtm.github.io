import gsap from 'gsap';
import content from './content.json';
import { initAnimations, startIntro, cancelIntro, presetTilt, getLenis } from './animations.js';
import { circle, reach, distTo } from './reveal.js';
import { push, closeTo } from './nav.js';

// Hash router over the pages in the DOM ([data-page]). "#/about" etc. reveal the new page inside a circle
// that grows out of the clicked link, the same transition the collages use; no hash is home. "#/work" and
// "#/credentials" are not pages: the collages (collage.js) own them and leave the page as it is.
export function initRouter() {
  const pages = Object.fromEntries([...document.querySelectorAll('[data-page]')].map((p) => [p.dataset.page, p]));
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const labels = { home: content.ui.home, ...Object.fromEntries(content.ui.nav.map((n) => [n.target, n.label])) };
  const root = document.documentElement;
  let current = null; // the page being navigated to (the header already shows it)
  let shown = null; // the page actually in the flow
  let flight = null; // cancels the running transition
  let timer = 0;

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
    shown = name;
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
  // A click during a transition cancels it (flight) and starts the new one from the page that is still shown.
  const unlock = () => {
    clearTimeout(timer);
    timer = setTimeout(() => root.classList.remove('is-transitioning'), 250);
  };

  const reveal = (name) => {
    flight?.();
    if (name === shown) {
      // back to the page that never left: nothing to animate
      chrome(name);
      dispatchEvent(new Event('headerpaint'));
      getLenis()?.start();
      unlock();
      return;
    }
    clearTimeout(timer);
    const closing = name === 'home';
    const old = pages[shown];
    const moving = closing ? old : pages[name]; // the page the circle clips
    root.classList.add('is-transitioning');
    getLenis()?.stop();
    const y = scrollY;
    const dy = closing ? y : 0; // a scrolled page is clipped in its own coordinates
    const pin = () => scrollY !== y && scrollTo(0, y); // overflow is not locked (see styles.css), so undo wheel/keys
    const [from, to] = closing ? [circle(reach(), dy), circle(0, dy)] : [circle(0), circle(reach())];
    const tidy = (keep) =>
      Object.entries(pages).forEach(([key, el]) => {
        el.hidden = key !== keep;
        el.classList.remove('page-layer', 'page-layer--under', 'page-closing');
      });
    moving.style.clipPath = from; // set before it shows: the tween below only renders on the next frame
    pages[name].hidden = false;
    if (closing) {
      pages.home.classList.add('page-layer', 'page-layer--under');
      old.classList.add('page-closing');
    } else pages[name].classList.add('page-layer');
    if (!closing) presetTilt(pages[name]);
    addEventListener('scroll', pin);
    startIntro(pages[name], closing ? 0.15 : 0.4);
    chrome(name);
    // The bar is solid and sits above the circle, so it takes the destination's color when the circle's edge
    // crosses its middle, not on the first frame (a dark page would flash a black bar over a light one).
    const flipAt = distTo(innerWidth / 2, document.querySelector('[data-header]').offsetHeight / 2);
    let flipped = false;
    const flip = () => flipped || ((flipped = true), dispatchEvent(new Event('headerpaint')));
    const tween = gsap.fromTo(
      moving,
      { clipPath: from },
      {
        clipPath: to,
        paused: true, // started below, once the layer has been laid out and painted
        duration: closing ? 0.9 : 1,
        ease: 'power3.inOut',
        onUpdate() {
          // `this` is the tween: GSAP renders the start state while `tween` is still being assigned
          const r = reach() * (closing ? 1 - this.ratio : this.ratio);
          if (closing ? r <= flipAt : r >= flipAt) flip();
        },
        onComplete: () => {
          flip();
          flight = null;
          removeEventListener('scroll', pin);
          tidy(name);
          gsap.set(moving, { clearProps: 'clipPath' });
          settle(name, true);
          unlock();
        },
      },
    );
    // Un-hiding a tall page and splitting its title can stall the first frames; the animation clock only starts
    // after they are painted (lag smoothing is off for Lenis), otherwise the circle would jump ahead.
    const start = () => armed && ((armed = false), tween.play());
    let armed = true;
    requestAnimationFrame(() => requestAnimationFrame(start));
    setTimeout(start, 120); // a hidden tab pauses rAF
    flight = () => {
      flight = null;
      armed = false;
      tween.kill();
      removeEventListener('scroll', pin);
      cancelIntro();
      tidy(shown);
      gsap.set(moving, { clearProps: 'clipPath' });
    };
  };

  const go = (name, pushEntry = true) => {
    if (name === current) return; // current is where the page is headed, shown is where it is
    if (pushEntry) push(urlOf(name));
    if (reduced()) {
      flight?.();
      show(name);
    } else reveal(name);
  };
  // Close pill and Esc: back to where the visitor came from (nav.js).
  const close = () => closeTo(urlOf('home'), () => go('home', false));

  // Capture phase and registered after the collage's, so an open collage has closed before the page changes.
  document.addEventListener(
    'click',
    (e) => {
      const a = e.target.closest('a[href^="#/"]');
      if (!a || a.matches('[data-open-collage]')) return;
      const name = routeOf(a.getAttribute('href'));
      if (!name) return;
      e.preventDefault();
      if (name === current) flight || scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
      else if (a.matches('.page-close')) close();
      else go(name);
    },
    true,
  );
  addEventListener('popstate', () => {
    const name = routeOf(location.hash);
    if (name) go(name, false);
  });

  // Esc closes an inner page like its Close pill (a collage or the menu handles its own Esc first).
  // Capture phase: it must look at the classes before the collage or menu handler closes them.
  addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape' && current !== 'home' && !root.matches('.collage-open, .menu-open')) close();
    },
    true,
  );

  show(routeOf(location.hash) ?? 'home'); // collage deep link: the collage opens over home
}
