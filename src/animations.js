import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);

let lenis = null;
export const getLenis = () => lenis;

// 1. Smooth scroll (Lenis) driven by the GSAP ticker; also owns in-page anchor links.
function smoothScroll() {
  lenis = new Lenis({ duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 3) });
  lenis.on('scroll', ScrollTrigger.update);
  const tick = (t) => lenis.raf(t * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  const onClick = (e) => {
    if (e.defaultPrevented) return; // e.g. the work collage handles its own links
    const a = e.target.closest('a[href^="#"]');
    const target = a && document.querySelector(a.getAttribute('href'));
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

// 5. Hero entrance as one connected cascade: the name's masked lines rise, then the intro lines, the
// role lines and the paper sheets follow with the same ease and a shared cadence.
function heroIntro() {
  const $ = (s) => document.querySelector(s);
  const parts = [$('[data-split="lines"]'), $('.hero__intro'), $('.hero__now')];
  const sheets = gsap.utils.toArray('.sheet');
  const side = $('.hero__side');
  gsap.set(parts, { autoAlpha: 0 }); // hidden until fonts load and the lines are split
  gsap.set(side, { autoAlpha: 0, y: 24 });
  gsap.set(sheets, { '--pop': 1 }); // CSS turns --pop into translate + opacity, so :hover transforms stay intact

  const lines = new Map();
  const play = () => {
    const [name, intro, now] = parts.map((el) => lines.get(el));
    gsap
      .timeline({ defaults: { ease: 'power4.out' } })
      .set(parts, { autoAlpha: 1 })
      .from(name, { yPercent: 110, duration: 1.1, stagger: 0.08 }, 0)
      .from(intro, { yPercent: 110, duration: 0.9, stagger: 0.08 }, 0.25)
      .from(now, { yPercent: 110, duration: 0.8, stagger: 0.06 }, 0.45)
      .to(sheets, { '--pop': 0, duration: 1, stagger: 0.07 }, 0.5)
      .to(side, { autoAlpha: 1, y: 0, duration: 0.8 }, 0.8);
  };
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
  const splits = gsap.utils.toArray('[data-split="words"]').map((el) => {
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
// heroIntro owns the opacity of the elements inside it.
function heroFade() {
  gsap.to('.hero', {
    opacity: 0,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 55%', scrub: true },
  });
}

// Every content block fades and rises in as it enters and fades out as it leaves, scrubbed to the scroll
// (Lenis already smooths it, so scrub: true avoids a second layer of lag).
const FADE_TARGETS =
  '.section__title, .lede, .sub, .card, .process li, .facts > div, .row, .faq details, .contact__title, .btn';
function fadeBlocks(desktop) {
  // On desktop the stats live in the pinned numbers stage, which owns their opacity.
  gsap.utils.toArray(desktop ? FADE_TARGETS : `${FADE_TARGETS}, .stat`).forEach((el) => {
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
  gsap.utils.toArray('[data-reveal="expand"]').forEach((el) => {
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
  gsap.utils.toArray('[data-stat]').forEach((stat) => {
    rollTo(stat.querySelectorAll('.odo__roll'), {
      duration: 1.4,
      ease: 'power3.out',
      stagger: 0.15,
      scrollTrigger: { trigger: stat, start: 'top 55%', once: true },
    });
  });
}

// Desktop: the career-path section pins. One big dial ticks 1 -> 2 -> 3 as you scroll while the text
// beside it changes (Bank Indonesia, OJK, Kemendag). CSS stacks the steps only while `.is-stacked` is set.
function numbersStage() {
  const stage = document.querySelector('.numbers');
  const steps = gsap.utils.toArray('.numbers .stat');
  const copy = (s) => s.querySelector('.stat__copy');
  const roll = stage.querySelector('.numbers__dial .odo__roll');
  stage.classList.add('is-stacked');

  // The dial counts up to 1 as the stage arrives; y: 0 drops the px GSAP derives from the inline fallback.
  gsap.fromTo(
    roll,
    { yPercent: 0, y: 0 },
    {
      yPercent: -10,
      y: 0,
      duration: 1.1,
      ease: 'power3.out',
      scrollTrigger: { trigger: stage, start: 'top 75%', once: true },
    },
  );
  const tl = gsap.timeline({
    defaults: { ease: 'power2.out' },
    scrollTrigger: { trigger: stage, start: 'top top', end: `+=${steps.length * 70}%`, pin: true, scrub: true },
  });
  steps.slice(1).forEach((s, k) => {
    const at = k + 0.5; // each hand-over takes one "page" of scroll: hold, swap, hold
    tl.to(roll, { yPercent: -(k + 2) * 10, duration: 0.6, ease: 'power3.inOut' }, at)
      .to(copy(steps[k]), { opacity: 0, y: -60, duration: 0.4 }, at)
      .fromTo(copy(s), { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.5 }, at + 0.2);
  });
  tl.to({}, { duration: 0.5 }); // hold on the last step
  return () => stage.classList.remove('is-stacked');
}

// Process timeline: the bars grow from the left, one after another, as the section scrolls in.
function ganttBars() {
  gsap.fromTo(
    '[data-bar]',
    { scaleX: 0 },
    {
      scaleX: 1,
      transformOrigin: 'left center',
      ease: 'power2.out',
      stagger: 0.25,
      scrollTrigger: { trigger: '.gantt', start: 'top 80%', end: 'bottom 45%', scrub: true },
    },
  );
}

export function initAnimations() {
  const mm = gsap.matchMedia();
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
      cleanups.push(heroIntro());
      // The pin goes first: ScrollTrigger measures later triggers against the pin spacer that exists by then.
      if (desktop) cleanups.push(numbersStage());
      cleanups.push(wordsScrub(desktop));
      heroFade();
      fadeBlocks(desktop);
      expandCovers();
      ganttBars();
      if (!desktop) odometers();
      // [anim-hooks]
      return () => cleanups.forEach((fn) => fn());
    },
  );
}
