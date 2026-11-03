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
    lenis.destroy();
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
// then the paper sheets pop in and [data-intro-fade] blocks follow, all with the same ease and cadence.
function pageIntro() {
  const parts = $$('[data-intro]').sort((a, b) => a.dataset.intro - b.dataset.intro);
  const sheets = $$('.sheet');
  const fades = $$('[data-intro-fade]');
  if (parts.length) gsap.set(parts, { autoAlpha: 0 }); // hidden until fonts load and the lines are split
  if (fades.length) gsap.set(fades, { autoAlpha: 0, y: 24 });
  if (sheets.length) gsap.set(sheets, { '--pop': 1 }); // CSS turns --pop into translate + opacity, so :hover transforms stay intact

  const lines = new Map();
  const play = () => {
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    if (parts.length) tl.set(parts, { autoAlpha: 1 });
    parts.forEach((el, i) => tl.from(lines.get(el), { yPercent: 110, duration: i ? 0.9 : 1.1, stagger: 0.08 }, i * 0.22));
    if (sheets.length) tl.to(sheets, { '--pop': 0, duration: 1, stagger: 0.07 }, 0.5);
    if (fades.length) tl.to(fades, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.12 }, 0.8);
  };
  if (!parts.length) {
    play();
    return () => {};
  }
  const splits = parts.map((el) =>
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true, // re-splits on resize; only the first round animates (timeline is not returned on purpose)
      onSplit(self) {
        const first = !lines.has(el);
        lines.set(el, self.lines);
        if (first && lines.size === parts.length) play();
      },
    }),
  );
  return () => splits.forEach((s) => s.revert());
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
  '.section__title, .lede, .sub, .card, .process li, .facts > div, .row, .faq details, .contact__title, .btn';
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

// 7. Cover strips widen as they scroll in; the image settles from 1.2x. Transform/clip-path only.
function expandCovers() {
  $$('[data-reveal="expand"]').forEach((el) => {
    gsap
      .timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: el, start: 'top 85%', end: 'top 25%', scrub: true } })
      .fromTo(el, { clipPath: 'inset(0 85% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }, 0)
      .fromTo(el.firstElementChild, { scale: 1.2 }, { scale: 1 }, 0);
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
export function initAnimations(page) {
  mm?.kill();
  scope = page;
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
      cleanups.push(pageIntro());
      // The pin goes first: ScrollTrigger measures later triggers against the pin spacer that exists by then.
      if (desktop) cleanups.push(numbersStage());
      cleanups.push(wordsScrub(desktop));
      heroFade();
      fadeBlocks(desktop);
      expandCovers();
      ganttBars();
      if (!desktop) odometers();
      return () => cleanups.forEach((fn) => fn());
    },
  );
}
