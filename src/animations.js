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

// 6. Positioning statement. Desktop: the words fade in and fly together while the section scrolls in,
// so nothing freezes first; the pin only holds the finished sentence. Phones: no pin, words light up in order.
function wordsScrub(desktop) {
  const splits = gsap.utils.toArray('[data-split="words"]').map((el) => {
    const split = SplitText.create(el, { type: 'words' });
    if (desktop) {
      const section = el.closest('.statement');
      ScrollTrigger.create({ trigger: section, start: 'top top', end: '+=70%', pin: true });
      gsap
        .timeline({
          scrollTrigger: { trigger: section, start: 'top 90%', end: 'top top', scrub: 0.6, invalidateOnRefresh: true },
        })
        .fromTo(
          split.words,
          {
            x: (i) => (rand(i, 0) - 0.5) * innerWidth * 0.8,
            y: (i) => (rand(i, 1) - 0.5) * innerHeight * 0.7,
            rotation: (i) => (rand(i, 2) - 0.5) * 24,
          },
          { x: 0, y: 0, rotation: 0, duration: 1, ease: 'power3.out', stagger: 0.02 },
          0,
        )
        .fromTo(split.words, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'none', stagger: 0.02 }, 0);
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

// 7. Cover strips widen as they scroll in; the image settles from 1.2x. Transform/clip-path only.
function expandCovers() {
  gsap.utils.toArray('[data-reveal="expand"]').forEach((el) => {
    gsap
      .timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: el, start: 'top 85%', end: 'top 25%', scrub: 0.6 } })
      .fromTo(el, { clipPath: 'inset(0 85% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }, 0)
      .fromTo(el.firstElementChild, { scale: 1.2 }, { scale: 1 }, 0);
  });
}

// 8. Odometer: each digit column rolls from 0 to its value once, when the stat enters the viewport.
// CSS already parks every roll on its final digit, so reduced-motion users see the real number.
function odometers() {
  gsap.utils.toArray('[data-stat]').forEach((stat) => {
    gsap.fromTo(
      stat.querySelectorAll('.odo__roll'),
      { yPercent: 0, y: 0 }, // y: 0 drops the px GSAP derives from the inline translateY(%) fallback
      {
        y: 0,
        yPercent: (_, roll) => -roll.dataset.digit * 10,
        duration: 1.4,
        ease: 'power3.out',
        stagger: 0.15,
        scrollTrigger: { trigger: stat, start: 'top 85%', once: true },
      },
    );
  });
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
      cleanups.push(heroIntro(), wordsScrub(desktop));
      heroFade();
      expandCovers();
      odometers();
      // [anim-hooks]
      return () => cleanups.forEach((fn) => fn());
    },
  );
}
