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

// 5. Hero headline reveal on load: masked lines rise, the intro row follows 0.15s later.
function headlineReveal() {
  const title = document.querySelector('[data-split="lines"]');
  const after = document.querySelectorAll('[data-hero-after]');
  gsap.set(title, { autoAlpha: 0 }); // hidden until fonts load and the lines are split
  gsap.set(after, { autoAlpha: 0, y: 24 });
  let played = false;
  const split = SplitText.create(title, {
    type: 'lines',
    mask: 'lines',
    autoSplit: true, // re-splits on resize; only the first split animates
    onSplit(self) {
      if (played) return;
      played = true;
      gsap.set(title, { autoAlpha: 1 });
      // Not returned: SplitText would revert it on the next re-split, hiding the intro row again.
      gsap
        .timeline()
        .from(self.lines, { yPercent: 110, duration: 1.1, stagger: 0.08, ease: 'power4.out' })
        .to(after, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out' }, 0.15);
    },
  });
  return () => split.revert();
}

// Stable pseudo-random in [0, 1): scatter positions must not change on every refresh.
const rand = (i, k) => {
  const s = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

// 6. Positioning statement. Desktop: the section pins while its words fly in from random spots and
// settle into the sentence. Phones: no pin, the words just light up in order.
function wordsScrub(desktop) {
  const splits = gsap.utils.toArray('[data-split="words"]').map((el) => {
    const split = SplitText.create(el, { type: 'words' });
    if (desktop) {
      gsap
        .timeline({
          scrollTrigger: {
            trigger: el.closest('.statement'),
            start: 'top top',
            end: '+=130%',
            pin: true,
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        })
        .fromTo(
          split.words,
          {
            x: (i) => (rand(i, 0) - 0.5) * innerWidth * 0.8,
            y: (i) => (rand(i, 1) - 0.5) * innerHeight * 0.7,
            rotation: (i) => (rand(i, 2) - 0.5) * 24,
          },
          { x: 0, y: 0, rotation: 0, duration: 1, ease: 'power3.inOut', stagger: 0.02 },
        )
        .to({}, { duration: 0.4 }); // hold so the finished sentence can be read before the pin releases
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
      cleanups.push(headlineReveal(), wordsScrub(desktop));
      expandCovers();
      odometers();
      // [anim-hooks]
      return () => cleanups.forEach((fn) => fn());
    },
  );
}
