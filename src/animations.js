import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);

let lenis = null;
export const getLenis = () => lenis;

// Everything below runs against the active page only; the router rebuilds it on each page change.
let scope = document;
const $ = (s) => scope.querySelector(s);
const $$ = (s) => gsap.utils.toArray(s, scope);

// 1. Smooth scroll (Lenis) driven by the GSAP ticker; also owns in-page anchor links (#id; "#/page" routes are the router's).
function smoothScroll() {
  lenis = new Lenis({ duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 3) });
  lenis.on('scroll', ScrollTrigger.update);
  const tick = (t) => lenis.raf(t * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  const onClick = (e) => {
    if (e.defaultPrevented) return; // e.g. the work collage and the router handle their own links
    const href = e.target.closest('a[href^="#"]')?.getAttribute('href');
    const target = href && !href.startsWith('#/') && document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target);
  };
  document.addEventListener('click', onClick);

  return () => {
    document.removeEventListener('click', onClick);
    gsap.ticker.remove(tick);
    lenis?.destroy(); // safe to call twice: initAnimations also runs the cleanup itself
    lenis = null;
  };
}

// 4. Custom cursor: a 120px disc scaled down to a 14px dot, grows into an arrow over [data-cursor="arrow"].
function customCursor() {
  const REST = 14 / 120;
  const el = document.createElement('div');
  el.className = 'cursor';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<span>→</span>';
  document.body.append(el);
  document.documentElement.classList.add('has-cursor');
  gsap.set(el, { xPercent: -50, yPercent: -50, scale: REST, autoAlpha: 0 });

  const x = gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3' });
  const y = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3' });
  let on = false;
  const move = (e) => {
    x(e.clientX);
    y(e.clientY);
    if (el.style.visibility !== 'inherit') gsap.to(el, { autoAlpha: 1, duration: 0.2 });
    const next = !!e.target.closest('[data-cursor="arrow"]');
    if (next === on) return;
    on = next;
    el.classList.toggle('is-arrow', on);
    gsap.to(el, { scale: on ? 1 : REST, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
  };
  const leave = () => gsap.to(el, { autoAlpha: 0, duration: 0.2 });
  document.addEventListener('mousemove', move);
  document.documentElement.addEventListener('mouseleave', leave);

  return () => {
    document.removeEventListener('mousemove', move);
    document.documentElement.removeEventListener('mouseleave', leave);
    document.documentElement.classList.remove('has-cursor');
    el.remove();
  };
}

// 5. Page entrance as one connected cascade. [data-intro="n"] elements (ordered by n) rise line by line,
// then [data-intro-fade] blocks follow, all with the same ease and cadence.
function pageIntro(delay = 0) {
  const parts = $$('[data-intro]').sort((a, b) => a.dataset.intro - b.dataset.intro);
  const fades = $$('[data-intro-fade]');
  if (parts.length) gsap.set(parts, { autoAlpha: 0 }); // hidden until fonts load and the lines are split
  if (fades.length) gsap.set(fades, { autoAlpha: 0, y: 24 });

  const charEls = new Set(parts.filter((el) => 'introChars' in el.dataset)); // big titles: letter by letter
  const lines = new Map(); // element -> what rises (its lines, or its letters for charEls)
  let tl;
  const play = () => {
    tl = gsap.timeline({ delay, defaults: { ease: 'power4.out' } });
    if (parts.length) tl.set(parts, { autoAlpha: 1 });
    parts.forEach((el, i) =>
      tl.from(
        lines.get(el),
        charEls.has(el)
          ? { yPercent: 115, rotate: 7, duration: 0.95, stagger: 0.035 }
          : { yPercent: 110, duration: i ? 0.9 : 1.1, stagger: 0.08 },
        i * 0.22,
      ),
    );
    if (fades.length) tl.to(fades, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.12 }, 0.8);
  };
  if (!parts.length) {
    play();
    return () => tl.kill();
  }
  const splits = parts.map((el) =>
    SplitText.create(el, {
      type: charEls.has(el) ? 'lines,chars' : 'lines',
      charsClass: 'ch',
      mask: 'lines',
      autoSplit: true, // re-splits on resize; only the first round animates (timeline is not returned on purpose)
      onSplit(self) {
        const first = !lines.has(el);
        lines.set(el, charEls.has(el) ? self.chars : self.lines);
        if (first && lines.size === parts.length) play();
      },
    }),
  );
  const stopHover = charEls.size ? hoverChars(() => [...charEls].flatMap((el) => lines.get(el) ?? [])) : () => {};
  return () => {
    stopHover();
    tl?.kill();
    splits.forEach((s) => s.revert());
  };
}

// Big titles light up letter by letter under the pointer (--hot 0 -> 1 -> 0, mixed into the color in CSS).
// The titles ignore the mouse themselves (pointer-events: none), so letters are hit-tested by position.
function hoverChars(getChars) {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return () => {};
  const hot = new Set();
  let pt = null;
  let raf = 0;
  const frame = () => {
    raf = 0;
    for (const c of getChars()) {
      const r = c.getBoundingClientRect();
      const on = pt && pt.x > r.left - 4 && pt.x < r.right + 4 && pt.y > r.top && pt.y < r.bottom;
      if (on === hot.has(c)) continue;
      on ? hot.add(c) : hot.delete(c);
      gsap.to(c, { '--hot': on ? 1 : 0, duration: on ? 0.12 : 0.9, ease: on ? 'power2.out' : 'power2.inOut', overwrite: 'auto' });
    }
  };
  const move = (e) => {
    pt = { x: e.clientX, y: e.clientY };
    raf ||= requestAnimationFrame(frame);
  };
  addEventListener('pointermove', move, { passive: true });
  return () => {
    removeEventListener('pointermove', move);
    cancelAnimationFrame(raf);
    gsap.killTweensOf([...hot]);
  };
}

// Stable pseudo-random in [0, 1): scatter positions must not change on every refresh.
const rand = (i, k) => {
  const s = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

// 6. Positioning statement. Desktop: no pin (a pin freezes the screen while the scrollbar moves); the words
// tumble in from all around while the section scrolls into view, then the sentence fades out as it leaves.
// Phones: words just light up in order.
function wordsScrub(desktop) {
  const splits = $$('[data-split="words"]').map((el) => {
    const split = SplitText.create(el, { type: 'words' });
    if (desktop) {
      const section = el.closest('.statement');
      gsap.fromTo(
        split.words,
        {
          x: (i) => (rand(i, 0) - 0.5) * innerWidth * 1.1,
          y: (i) => (rand(i, 1) - 0.5) * innerHeight,
          rotation: (i) => (rand(i, 2) - 0.5) * 80,
          scale: 0.6,
          opacity: 0,
        },
        {
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
          opacity: 1,
          ease: 'power2.out',
          stagger: { each: 0.04, from: 'random' }, // words land one after another across the whole scroll window
          scrollTrigger: { trigger: section, start: 'top 80%', end: 'top 5%', scrub: true, invalidateOnRefresh: true },
        },
      );
      gsap.to(el, {
        opacity: 0,
        y: -40,
        ease: 'none',
        scrollTrigger: { trigger: section, start: 'bottom 45%', end: 'bottom 5%', scrub: true },
      });
      return split;
    }
    gsap.fromTo(
      split.words,
      { opacity: 0.15 },
      {
        opacity: 1,
        stagger: 0.1,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 40%', scrub: true },
      },
    );
    return split;
  });
  return () => splits.forEach((s) => s.revert());
}

// The hero fades out while the next section's words start to appear. Targets the section itself:
// pageIntro owns the opacity of the elements inside it.
function heroFade() {
  const hero = $('.hero');
  if (!hero) return;
  gsap.to(hero, {
    opacity: 0,
    ease: 'none',
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom 55%', scrub: true },
  });
}

// Every content block fades and rises in as it enters and fades out as it leaves, scrubbed to the scroll
// (Lenis already smooths it, so scrub: true avoids a second layer of lag).
const FADE_TARGETS =
  '.card, .process li, .ix__item, .org, .chips, .edu, .lang, .faq details, .btn';
function fadeBlocks(desktop) {
  // On desktop the stats live in the pinned numbers stage, which owns their opacity.
  $$(desktop ? FADE_TARGETS : `${FADE_TARGETS}, .stat`).forEach((el) => {
    gsap
      .timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
      })
      .fromTo(el, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.2 })
      .to(el, { duration: 0.6 }) // hold fully visible
      .to(el, { opacity: 0, y: -30, duration: 0.2 });
  });
}

// Headings rise line by line out of a mask the first time they scroll into view.
const TEXT_TARGETS = '.section__title, .sub, .contact__title';
function textReveals() {
  const tweens = []; // onSplit may run after the matchMedia context is gone (fonts), so they are tracked by hand
  const splits = $$(TEXT_TARGETS).map((el) => {
    let first = true;
    return SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true, // re-splits on resize; only the first round animates (the tween is not returned on purpose)
      onSplit(self) {
        if (!first) return;
        first = false;
        const tween = gsap.from(self.lines, {
          yPercent: 110,
          duration: 1,
          ease: 'power4.out',
          stagger: 0.09,
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        });
        tweens.push(tween);
      },
    });
  });
  return () => {
    tweens.forEach((t) => (t.scrollTrigger?.kill(), t.kill()));
    splits.forEach((s) => s.revert());
  };
}

// 7. Cover strips widen as they scroll in; the image settles from 1.2x. Transform/clip-path only.
function expandCovers() {
  $$('[data-reveal="expand"]').forEach((el) => {
    gsap
      .timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: el, start: 'top 85%', end: 'top 25%', scrub: true } })
      .fromTo(el, { clipPath: 'inset(0 85% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }, 0)
      .fromTo(el.firstElementChild, { scale: 1.2 }, { scale: 1 }, 0);
  });
}

// The contact photo is oversized inside its frame and swings through a small 3D tilt (plus a slow zoom and drift)
// while it crosses the screen, so the angle of the picture follows the scroll.
// A function, not shared objects: GSAP writes its own fields (parent, startAt) into the vars it is given.
const tilt = () => [
  { rotationX: 8, rotationY: -6, scale: 1.25, yPercent: -6 },
  { rotationX: -8, rotationY: 6, scale: 1.08, yPercent: 6 },
];

function photoTilt() {
  $$('[data-tilt]').forEach((frame) => {
    gsap
      .timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true },
      })
      .fromTo(frame.firstElementChild, ...tilt());
  });
}

// The router lays a page over the old one before its animations exist. The photo's tilt, as the scroll would
// leave it at 0, is set then, so it does not jump when photoTilt() takes over at the end of the reveal.
export function presetTilt(page) {
  if (!matchMedia('(prefers-reduced-motion: no-preference)').matches) return;
  page.querySelectorAll('[data-tilt]').forEach((frame) => {
    const { top, height } = frame.getBoundingClientRect();
    gsap.set(frame.firstElementChild, gsap.utils.interpolate(...tilt(), (innerHeight - top) / (innerHeight + height)));
  });
}

// 8. Odometer: each digit column rolls from 0 to its value.
// CSS already parks every roll on its final digit, so reduced-motion users see the real number.
// y: 0 drops the px GSAP derives from the inline translateY(%) fallback.
const rollTo = (rolls, vars) =>
  gsap.fromTo(
    rolls,
    { yPercent: 0, y: 0 },
    { y: 0, yPercent: (_, roll) => -roll.dataset.digit * 10, ...vars },
  );

// Phones: every stat rolls once, when the whole (tall) number is on screen.
function odometers() {
  $$('[data-stat]').forEach((stat) => {
    rollTo(stat.querySelectorAll('.odo__roll'), {
      duration: 1.4,
      ease: 'power3.out',
      stagger: 0.15,
      scrollTrigger: { trigger: stat, start: 'top 55%', once: true },
    });
  });
}

// Desktop: the stats section pins. All three stats are on one screen in a zigzag (CSS, while `.is-stacked`
// is set) and their numbers roll one after another as you scroll, each with its text fading in.
function numbersStage() {
  const stage = $('.numbers');
  if (!stage) return () => {};
  stage.classList.add('is-stacked');
  const tl = gsap.timeline({
    scrollTrigger: { trigger: stage, start: 'top top', end: '+=150%', pin: true, scrub: true },
  });
  $$('.numbers .stat').forEach((s, i) => {
    const at = i * 0.8;
    tl.add(rollTo(s.querySelectorAll('.odo__roll'), { duration: 1, ease: 'power3.out', stagger: 0.1 }), at).fromTo(
      s.querySelector('.stat__copy'),
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
      at + 0.1,
    );
  });
  tl.to({}, { duration: 0.6 }); // hold so the finished numbers can be read before the pin releases
  return () => stage.classList.remove('is-stacked');
}

// Process timeline: the bars grow from the left, one after another, as the section scrolls in.
function ganttBars() {
  const gantt = $('.gantt');
  if (!gantt) return;
  gsap.fromTo(
    $$('[data-bar]'),
    { scaleX: 0 },
    {
      scaleX: 1,
      transformOrigin: 'left center',
      ease: 'power2.out',
      stagger: 0.25,
      scrollTrigger: { trigger: gantt, start: 'top 80%', end: 'bottom 45%', scrub: true },
    },
  );
}

// Builds every effect for one page. Called by the router on load and after each page swap; the previous
// build is killed first (its cleanups run: Lenis destroyed, splits reverted, triggers killed).
let mm = null;
let lastCleanup = null;
let started = null; // cleanup of an entrance already playing (see startIntro)

// Plays a page's entrance now, while the router is still revealing it inside the growing circle; the next
// initAnimations(page, { introStarted: true }) then keeps it instead of playing it a second time.
// The delay lets the circle uncover the page first, so the entrance is seen instead of happening behind it.
export function startIntro(page, delay = 0.4) {
  scope = page;
  started = pageIntro(delay);
}

// A transition was interrupted: the entrance that had started for the page that never arrived is dropped.
export function cancelIntro() {
  started?.();
  started = null;
}

export function initAnimations(page, { introStarted = false } = {}) {
  // kill() alone does not run the cleanups returned below (cursor, Lenis, splits would pile up on every
  // page change), so revert and run the last cleanup explicitly; every cleanup is safe to run twice.
  mm?.revert();
  mm?.kill();
  lastCleanup?.();
  lastCleanup = null;
  scope = page;
  const intro = introStarted ? started : null;
  started = null;
  mm = gsap.matchMedia();
  mm.add(
    {
      motion: '(prefers-reduced-motion: no-preference)',
      desktop: '(min-width: 768px)',
      fine: '(hover: hover) and (pointer: fine)',
    },
    (ctx) => {
      const { motion, desktop, fine } = ctx.conditions;
      if (!motion) return; // reduced motion: content stays in its final, static state

      const cleanups = [smoothScroll()];
      if (desktop && fine) cleanups.push(customCursor());
      cleanups.push(intro ?? pageIntro());
      // The pin goes first: ScrollTrigger measures later triggers against the pin spacer that exists by then.
      if (desktop) cleanups.push(numbersStage());
      cleanups.push(wordsScrub(desktop));
      heroFade();
      cleanups.push(textReveals());
      fadeBlocks(desktop);
      expandCovers();
      photoTilt();
      ganttBars();
      if (!desktop) odometers();
      lastCleanup = () => cleanups.forEach((fn) => fn());
      return lastCleanup;
    },
  );
}
