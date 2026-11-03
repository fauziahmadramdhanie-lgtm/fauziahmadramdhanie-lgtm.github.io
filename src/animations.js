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

// 6. Scrubbed word-by-word light-up for the positioning statement.
function wordsScrub() {
  const splits = gsap.utils.toArray('[data-split="words"]').map((el) => {
    const split = SplitText.create(el, { type: 'words' });
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
      cleanups.push(headlineReveal(), wordsScrub());
      // [anim-hooks]
      return () => cleanups.forEach((fn) => fn());
    },
  );
}
